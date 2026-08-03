"""
Roadmap routes
==============
GET    /api/roadmaps/                          – list all roadmaps
POST   /api/roadmaps/                          – create a roadmap
GET    /api/roadmaps/{id}                      – get roadmap (with periods + resources)
PUT    /api/roadmaps/{id}                      – update roadmap header
DELETE /api/roadmaps/{id}                      – delete roadmap

POST   /api/roadmaps/{id}/start                – mark roadmap as started (records started_at)
GET    /api/roadmaps/{id}/report               – get progress report (time, % complete, per-period)

PUT    /api/roadmaps/{id}/periods/{period_id}              – upsert topics/label for a period
POST   /api/roadmaps/{id}/periods/{period_id}/toggle-task  – toggle a task checkbox by line index
GET    /api/roadmaps/{id}/periods/{period_id}/notes         – get AI notes content
GET    /api/roadmaps/{id}/periods/{period_id}/notes/download – download .md file
POST   /api/roadmaps/{id}/periods/{period_id}/generate-notes – (re)generate AI notes
POST   /api/roadmaps/{id}/periods/{period_id}/resources        – add resource link
DELETE /api/roadmaps/{id}/periods/{period_id}/resources/{rid}  – delete resource link
PUT    /api/roadmaps/{id}/periods/{period_id}/resources/{rid}  – update resource link
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json
import math
import os
import re
import threading
import logging
from dotenv import load_dotenv

# Load .env so GEMINI_API_KEY is available in this process/thread
load_dotenv()

from ..database import get_db
from ..models import Roadmap, RoadmapPeriod, PeriodResource

router = APIRouter(prefix="/api/roadmaps", tags=["roadmaps"])

logger = logging.getLogger(__name__)

# ─── Notes directory ───────────────────────────────────────────────────────────
NOTES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "notes")
os.makedirs(NOTES_DIR, exist_ok=True)


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class ResourceOut(BaseModel):
    id: int
    period_id: int
    title: str
    url: str
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class PeriodOut(BaseModel):
    id: int
    roadmap_id: int
    period_index: int
    label: Optional[str] = None
    topics: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resources: List[ResourceOut] = []
    # Tracking fields
    tasks_status: Optional[List[bool]] = None
    is_complete: bool = False
    completed_at: Optional[datetime] = None
    revision_notes: Optional[str] = None
    notes_file_path: Optional[str] = None
    notes_generating: bool = False  # transient – always False in DB responses

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj: RoadmapPeriod):  # type: ignore[override]
        data = {
            "id": obj.id,
            "roadmap_id": obj.roadmap_id,
            "period_index": obj.period_index,
            "label": obj.label,
            "topics": obj.topics,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
            "resources": obj.resources,
            "is_complete": obj.is_complete or False,
            "completed_at": obj.completed_at,
            "revision_notes": obj.revision_notes,
            "notes_file_path": obj.notes_file_path,
            "notes_generating": False,
            "tasks_status": json.loads(obj.tasks_status) if obj.tasks_status else None,
        }
        return cls(**data)


class RoadmapOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    period_type: str
    total_periods: int
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    periods: List[PeriodOut] = []

    class Config:
        from_attributes = True


class RoadmapListItem(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    period_type: str
    total_periods: int
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoadmapCreate(BaseModel):
    title: str
    description: Optional[str] = None
    period_type: str = "month"   # "week" | "month"
    total_periods: int = 4


class RoadmapUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    period_type: Optional[str] = None
    total_periods: Optional[int] = None


class PeriodUpdate(BaseModel):
    label: Optional[str] = None
    topics: Optional[str] = None


class ResourceCreate(BaseModel):
    title: str
    url: str
    sort_order: int = 0


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    sort_order: Optional[int] = None


class ToggleTaskRequest(BaseModel):
    task_index: int  # 0-based index into non-empty topic lines


# ─── Roadmap Report schema ─────────────────────────────────────────────────────

class PeriodStatus(BaseModel):
    period_id: int
    period_index: int
    label: Optional[str]
    is_complete: bool
    total_tasks: int
    completed_tasks: int
    completion_pct: int
    completed_at: Optional[datetime]


class RoadmapReport(BaseModel):
    roadmap_id: int
    title: str
    period_type: str
    total_periods: int
    completed_periods: int
    overall_pct: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    elapsed_days: Optional[int]        # days since started_at
    planned_days: Optional[int]        # total_periods × days-per-period
    is_on_track: Optional[bool]        # elapsed / planned <= overall_pct / 100
    periods: List[PeriodStatus]


# ─── Helpers ───────────────────────────────────────────────────────────────────

VALID_PERIOD_TYPES = {"week", "month"}


def _ensure_periods(db: Session, roadmap: Roadmap) -> None:
    """
    Make sure the roadmap has exactly `total_periods` RoadmapPeriod rows
    (creating missing ones, removing extra ones).
    """
    existing_periods = db.query(RoadmapPeriod).filter(
        RoadmapPeriod.roadmap_id == roadmap.id
    ).all()
    existing = {p.period_index: p for p in existing_periods}
    needed = set(range(roadmap.total_periods))

    # Create missing
    for idx in sorted(needed - existing.keys()):
        ptype = "Month" if roadmap.period_type == "month" else "Week"
        db.add(RoadmapPeriod(
            roadmap_id=roadmap.id,
            period_index=idx,
            label=f"{ptype} {idx + 1}",
        ))

    # Remove surplus
    for idx in sorted(existing.keys() - needed):
        db.delete(existing[idx])

    db.flush()


def _topic_lines(topics: Optional[str]) -> List[str]:
    """Return only non-empty lines from the topics text."""
    if not topics:
        return []
    return [l for l in topics.split("\n") if l.strip()]


def _slug(text: str) -> str:
    """Convert text to a filesystem-safe slug."""
    return re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')[:40]


def _generate_ai_notes(period: RoadmapPeriod, roadmap_title: str) -> str:
    """
    Generate comprehensive AI study notes using Google Gemini.
    Falls back to a structured placeholder if GEMINI_API_KEY is not set.
    Saves the result to a .md file in the notes/ directory.
    Returns the content string.
    """
    import google.generativeai as genai

    label = period.label or f"Period {period.period_index + 1}"
    lines = _topic_lines(period.topics)
    topics_list = "\n".join(f"  - {l.lstrip('- ').strip()}" for l in lines)
    now_str = datetime.now().strftime("%B %d, %Y")

    # Re-load .env every call to guarantee the key is available in background threads
    load_dotenv(override=True)
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if api_key:
        prompt = f"""You are a world-class technical educator writing comprehensive study notes for a developer learning "{roadmap_title}".

The module being completed is: "{label}"
Topics covered in this module:
{topics_list}

---

Write complete, well-structured Markdown notes covering ALL the topics above. Follow this EXACT structure and style for each topic:

---

# [Topic Name]

## Overview
One clear paragraph explaining what this technology/concept is, what it's used for, and where it appears in the real world.

## Why Learn [Topic Name]?
- Bullet points: job relevance, cloud/DevOps use, interview frequency, etc.

## Architecture / How It Works
Use an ASCII diagram or structured text to show the internal structure, layers, or flow:
```
Example:
User
  ↓
Application
  ↓
OS / Kernel
  ↓
Hardware
```

## Core Concepts
### [Sub-concept 1]
Clear explanation. Use **bold** for key terms. Include WHY this matters.

### [Sub-concept 2]
Clear explanation. Include a table if concepts can be compared:

| Term | Description | Example |
|------|-------------|---------|

## File System / Directory Structure (if applicable)
Show structure as an ASCII tree:
```
/root
├── subdir/
│   └── file.txt
└── config.yaml
```
With a table of key paths and their purpose.

## Permissions / Configuration (if applicable)
Explain with examples and number breakdowns.

## Most Used Commands
Group by category:

### Navigation / Basics
```bash
command1   # what it does
command2   # what it does
```

### Advanced / Operations
```bash
command3   # what it does
```

## Mini Example
A short, real-world scenario with step-by-step commands the learner can actually run:
```bash
# Step 1: Do X
command --flag value

# Step 2: Do Y
command2
```

## Common Mistakes
- Mistake 1 and how to avoid it
- Mistake 2 and how to avoid it

---

AFTER covering all individual topics, add these final sections:

---

## Interview Questions

List 8-12 interview questions that are commonly asked about the topics in this module, numbered.

---

## Quick Revision

End with a ✅ checklist of the most important facts to remember, one line each:

✅ [Key fact 1]
✅ [Key fact 2]
...

---

STRICT RULES:
- Use proper Markdown: ##, ###, tables, fenced code blocks with language tags (bash, python, yaml, etc.)
- ASCII diagrams must use plain text (no Unicode box-drawing characters that won't render)
- Be COMPREHENSIVE — these notes are the learner's sole reference for this module
- Code examples must be real and runnable, not pseudo-code
- Every command shown must have a comment explaining what it does
- Do NOT add disclaimers or meta-commentary — just the content"""

        # Try models in order — falls to next if quota exceeded or unavailable
        MODELS_TO_TRY = [
            "models/gemini-2.0-flash",
            "models/gemini-2.0-flash-001",
            "models/gemini-2.0-flash-lite",
            "models/gemini-2.0-flash-lite-001",
            "models/gemini-flash-latest",
            "models/gemini-pro-latest",
        ]
        content = None
        for model_name in MODELS_TO_TRY:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                content = response.text
                logger.info("Gemini notes generated with %s for period %s", model_name, period.id)
                break
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "quota" in err_str.lower():
                    logger.warning("Quota exceeded for %s, trying next model...", model_name)
                    continue
                elif "404" in err_str or "not found" in err_str.lower() or "not available" in err_str.lower():
                    logger.warning("Model %s unavailable, trying next...", model_name)
                    continue
                else:
                    logger.error("Gemini generation failed with %s: %s", model_name, e)
                    break
        if not content:
            logger.error("All Gemini models failed or quota exhausted — using fallback notes")
            content = _fallback_notes(label, lines, roadmap_title, now_str)
    else:
        logger.warning("GEMINI_API_KEY not set – using fallback notes")
        content = _fallback_notes(label, lines, roadmap_title, now_str)

    # Save to disk
    filename = f"roadmap_{period.roadmap_id}_period_{period.period_index + 1}_{_slug(label)}.md"
    file_path = os.path.join(NOTES_DIR, filename)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("Notes saved to %s", file_path)
    except Exception as e:
        logger.error("Failed to save notes file: %s", e)
        file_path = ""

    return content, file_path


def _fallback_notes(label: str, lines: List[str], roadmap_title: str, now_str: str) -> str:
    """Structured placeholder when no API key is available."""
    topics_section = ""
    for line in lines:
        t = line.lstrip("- ").strip()
        topics_section += f"\n## {t}\n\n"
        topics_section += f"**{t}** is a core concept in {label}.\n\n"
        topics_section += "### Key Points\n\n- Add your notes here\n\n"
        topics_section += "```bash\n# Example commands\n```\n\n"
        topics_section += "### Common Mistakes\n\n- Review documentation carefully\n\n"

    return f"""# {label} — Study Notes

> **Roadmap:** {roadmap_title}  
> **Completed:** {now_str}  
> *These notes were auto-generated. Set GEMINI_API_KEY for AI-powered comprehensive notes.*

---
{topics_section}
## Best Practices

- Study each topic systematically before moving on
- Practice with real examples in a sandbox environment
- Refer to official documentation for latest updates

## Quick Reference

| Topic | Key Concept |
|-------|-------------|
{chr(10).join(f'| {l.lstrip("- ").strip()} | See notes above |' for l in lines)}

## Practice Exercises

1. Apply the concepts above in a test environment
2. Build a small project using these skills
3. Write a summary of what you learned in your own words
"""


def _generate_ai_notes_async(period_id: int, roadmap_id: int, roadmap_title: str, db_session_factory) -> None:
    """Run AI note generation in a background thread, then save to DB."""
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        period = (
            db.query(RoadmapPeriod)
            .filter(RoadmapPeriod.id == period_id)
            .first()
        )
        if not period:
            return
        content, file_path = _generate_ai_notes(period, roadmap_title)
        period.revision_notes = content
        period.notes_file_path = file_path
        period.updated_at = datetime.utcnow()
        db.commit()
        logger.info("AI notes saved to DB for period %s", period_id)
    except Exception as e:
        logger.error("Background note generation failed: %s", e)
    finally:
        db.close()


def _fetch_roadmap(db: Session, roadmap_id: int) -> Roadmap:
    roadmap = (
        db.query(Roadmap)
        .options(selectinload(Roadmap.periods).selectinload(RoadmapPeriod.resources))
        .filter(Roadmap.id == roadmap_id)
        .first()
    )
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    return roadmap


def _period_out(p: RoadmapPeriod) -> PeriodOut:
    return PeriodOut.from_orm(p)


def _roadmap_out(roadmap: Roadmap) -> RoadmapOut:
    return RoadmapOut(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        period_type=roadmap.period_type,
        total_periods=roadmap.total_periods,
        created_at=roadmap.created_at,
        updated_at=roadmap.updated_at,
        started_at=roadmap.started_at,
        completed_at=roadmap.completed_at,
        periods=[_period_out(p) for p in sorted(roadmap.periods, key=lambda x: x.period_index)],
    )


# ─── Roadmap CRUD ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[RoadmapListItem])
def list_roadmaps(db: Session = Depends(get_db)):
    return db.query(Roadmap).order_by(Roadmap.created_at.desc()).all()


# ─── AI Recommendations ────────────────────────────────────────────────────────

class AiRecommendation(BaseModel):
    title: str
    description: str
    estimated_months: int
    skill_level: str  # "Beginner" | "Intermediate" | "Advanced"


@router.get("/ai-recommendations", response_model=List[AiRecommendation])
def get_ai_recommendations(db: Session = Depends(get_db)):
    """
    Use Gemini to analyse the user's existing roadmaps and recommend personalised
    next learning paths, each with estimated duration and skill level.
    """
    import google.generativeai as genai

    load_dotenv(override=True)
    api_key = os.environ.get("GEMINI_API_KEY", "")

    # Gather existing roadmaps for context
    all_roadmaps = db.query(Roadmap).order_by(Roadmap.created_at.desc()).all()
    roadmap_context = "\n".join(
        f"- {r.title} ({r.period_type}, {r.total_periods} periods, "
        f"{'completed' if r.completed_at else 'in progress' if r.started_at else 'not started'})"
        for r in all_roadmaps
    ) or "No existing roadmaps yet."

    fallback = [
        AiRecommendation(title="System Design & Architecture", description="Learn how to design scalable distributed systems, microservices, and cloud-native architectures.", estimated_months=6, skill_level="Intermediate"),
        AiRecommendation(title="Cloud Native & Kubernetes", description="Master container orchestration, Helm, service meshes, and cloud-native deployment patterns.", estimated_months=4, skill_level="Intermediate"),
        AiRecommendation(title="Advanced Data Structures & Algorithms", description="Deep dive into DSA for technical interviews and competitive programming.", estimated_months=3, skill_level="Intermediate"),
        AiRecommendation(title="DevOps & CI/CD Pipelines", description="Build and automate delivery pipelines with GitHub Actions, Jenkins, ArgoCD and more.", estimated_months=4, skill_level="Beginner"),
        AiRecommendation(title="Machine Learning Fundamentals", description="Understand supervised/unsupervised learning, neural networks, and practical ML workflows.", estimated_months=6, skill_level="Beginner"),
    ]

    if not api_key:
        return fallback

    prompt = f"""You are a personalized learning advisor for software engineers.

The user currently has these learning roadmaps:
{roadmap_context}

Based on these, suggest exactly 5 next learning paths that would complement and build on their existing skills.
For each suggestion, provide:
1. A specific, actionable title (e.g., "Kubernetes & Container Orchestration" not just "Kubernetes")
2. A 1-2 sentence description of what they will learn and why it's valuable
3. Estimated months to complete (integer, 1-12)
4. Skill level: exactly one of "Beginner", "Intermediate", or "Advanced"

Respond with ONLY a valid JSON array, no markdown, no explanation:
[
  {{"title": "...", "description": "...", "estimated_months": 6, "skill_level": "Intermediate"}},
  ...
]"""

    MODELS = ["models/gemini-2.0-flash", "models/gemini-2.0-flash-001", "models/gemini-2.0-flash-lite", "models/gemini-flash-latest", "models/gemini-pro-latest"]
    for model_name in MODELS:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            return [AiRecommendation(**item) for item in data[:5]]
        except Exception as e:
            err = str(e)
            if "429" in err or "quota" in err.lower() or "404" in err:
                continue
            logger.error("AI recommendations error: %s", e)
            break

    return fallback


# ─── AI Create Roadmap ─────────────────────────────────────────────────────────

class AiCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None


class AiResourceSuggestion(BaseModel):
    title: str
    url: str


class AiPeriodSuggestion(BaseModel):
    label: str
    tasks: List[str]
    resources: List[AiResourceSuggestion]


class AiRoadmapPlan(BaseModel):
    period_type: str       # "month" or "week"
    total_periods: int
    description: str
    periods: List[AiPeriodSuggestion]


@router.post("/ai-create", response_model=RoadmapOut, status_code=status.HTTP_201_CREATED)
def ai_create_roadmap(payload: AiCreateRequest, db: Session = Depends(get_db)):
    """
    Ask Gemini to design a complete learning roadmap for the given topic,
    then persist it to the database with periods, tasks, and resource links.
    """
    import google.generativeai as genai

    load_dotenv(override=True)
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise HTTPException(503, "GEMINI_API_KEY not configured. Please set it in backend/.env")

    prompt = f"""You are an expert curriculum designer creating a structured learning roadmap.

Topic: "{payload.title}"
{f'Additional context: {payload.description}' if payload.description else ''}

Design a comprehensive, monthly learning roadmap for this topic. Follow these rules:
1. Choose an appropriate duration: 3 months (focused), 6 months (standard), or 9-12 months (comprehensive)
2. Each month should have a specific theme/focus area
3. Each month should have 6-8 specific, actionable tasks/topics (be concrete, not generic)
4. Each month should have exactly 2-3 real learning resources (official docs, YouTube channels, free courses, GitHub repos)
5. Resource URLs must be real, well-known URLs (e.g., docs.python.org, youtube.com/@TechWithTim, freecodecamp.org)

Respond with ONLY a valid JSON object (no markdown, no explanation):
{{
  "period_type": "month",
  "total_periods": 6,
  "description": "A comprehensive roadmap for learning {payload.title}",
  "periods": [
    {{
      "label": "Month 1: Foundations",
      "tasks": [
        "Understand core concepts of X",
        "Install and configure the environment",
        "Complete the official getting-started tutorial",
        "Build a hello-world project",
        "Learn basic syntax and data types",
        "Practice with 10 simple exercises"
      ],
      "resources": [
        {{"title": "Official Documentation", "url": "https://docs.example.com"}},
        {{"title": "Crash Course - YouTube", "url": "https://youtube.com/watch?v=example"}},
        {{"title": "Free Course on freeCodeCamp", "url": "https://freecodecamp.org"}}
      ]
    }}
  ]
}}"""

    MODELS = ["models/gemini-2.0-flash", "models/gemini-2.0-flash-001", "models/gemini-2.0-flash-lite", "models/gemini-flash-latest", "models/gemini-pro-latest"]
    plan: Optional[AiRoadmapPlan] = None

    for model_name in MODELS:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            plan = AiRoadmapPlan(**data)
            logger.info("AI roadmap plan generated with %s for '%s'", model_name, payload.title)
            break
        except Exception as e:
            err = str(e)
            if "429" in err or "quota" in err.lower() or "404" in err:
                logger.warning("Quota/unavailable for %s, trying next...", model_name)
                continue
            logger.error("AI create roadmap failed with %s: %s", model_name, e)
            raise HTTPException(500, f"AI generation failed: {str(e)[:200]}")

    if plan is None:
        raise HTTPException(503, "All AI models are currently at quota. Please try again later.")

    # Persist the roadmap
    capped_periods = min(max(plan.total_periods, 1), 104)
    roadmap = Roadmap(
        title=payload.title,
        description=plan.description or payload.description,
        period_type=plan.period_type if plan.period_type in VALID_PERIOD_TYPES else "month",
        total_periods=capped_periods,
    )
    db.add(roadmap)
    db.flush()

    # Create periods with AI content
    for idx, p_data in enumerate(plan.periods[:capped_periods]):
        topics_text = "\n".join(f"- {t}" for t in p_data.tasks)
        period = RoadmapPeriod(
            roadmap_id=roadmap.id,
            period_index=idx,
            label=p_data.label,
            topics=topics_text,
        )
        db.add(period)
        db.flush()

        # Add resource links
        for sort_i, res in enumerate(p_data.resources[:3]):
            db.add(PeriodResource(
                period_id=period.id,
                title=res.title,
                url=res.url,
                sort_order=sort_i,
            ))

    # Ensure we have the right number of periods (pad if AI returned fewer)
    existing_count = len(plan.periods)
    ptype_label = "Month" if roadmap.period_type == "month" else "Week"
    for idx in range(existing_count, capped_periods):
        db.add(RoadmapPeriod(
            roadmap_id=roadmap.id,
            period_index=idx,
            label=f"{ptype_label} {idx + 1}",
        ))

    db.commit()
    return _roadmap_out(_fetch_roadmap(db, roadmap.id))



@router.post("/", response_model=RoadmapOut, status_code=status.HTTP_201_CREATED)
def create_roadmap(payload: RoadmapCreate, db: Session = Depends(get_db)):
    if payload.period_type not in VALID_PERIOD_TYPES:
        raise HTTPException(400, f"period_type must be one of {VALID_PERIOD_TYPES}")
    if not 1 <= payload.total_periods <= 104:
        raise HTTPException(400, "total_periods must be between 1 and 104")

    roadmap = Roadmap(
        title=payload.title,
        description=payload.description,
        period_type=payload.period_type,
        total_periods=payload.total_periods,
    )
    db.add(roadmap)
    db.flush()
    _ensure_periods(db, roadmap)
    db.commit()
    return _roadmap_out(_fetch_roadmap(db, roadmap.id))


@router.get("/{roadmap_id}", response_model=RoadmapOut)
def get_roadmap(roadmap_id: int, db: Session = Depends(get_db)):
    return _roadmap_out(_fetch_roadmap(db, roadmap_id))


@router.put("/{roadmap_id}", response_model=RoadmapOut)
def update_roadmap(roadmap_id: int, payload: RoadmapUpdate, db: Session = Depends(get_db)):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")

    if payload.title is not None:
        roadmap.title = payload.title
    if payload.description is not None:
        roadmap.description = payload.description
    if payload.period_type is not None:
        if payload.period_type not in VALID_PERIOD_TYPES:
            raise HTTPException(400, f"period_type must be one of {VALID_PERIOD_TYPES}")
        roadmap.period_type = payload.period_type
    if payload.total_periods is not None:
        if not 1 <= payload.total_periods <= 104:
            raise HTTPException(400, "total_periods must be between 1 and 104")
        roadmap.total_periods = payload.total_periods

    roadmap.updated_at = datetime.utcnow()
    db.flush()
    _ensure_periods(db, roadmap)
    db.commit()
    return _roadmap_out(_fetch_roadmap(db, roadmap.id))


@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap(roadmap_id: int, db: Session = Depends(get_db)):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    db.delete(roadmap)
    db.commit()


# ─── Start Roadmap ─────────────────────────────────────────────────────────────

@router.post("/{roadmap_id}/start", response_model=RoadmapOut)
def start_roadmap(roadmap_id: int, db: Session = Depends(get_db)):
    """Record the start time of a roadmap."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    if roadmap.started_at is None:
        roadmap.started_at = datetime.utcnow()
        roadmap.updated_at = datetime.utcnow()
        db.commit()
    return _roadmap_out(_fetch_roadmap(db, roadmap_id))


# ─── Roadmap Report ────────────────────────────────────────────────────────────

@router.get("/{roadmap_id}/report", response_model=RoadmapReport)
def get_roadmap_report(roadmap_id: int, db: Session = Depends(get_db)):
    """Return a progress/time report for a roadmap."""
    roadmap = _fetch_roadmap(db, roadmap_id)

    periods_sorted = sorted(roadmap.periods, key=lambda p: p.period_index)
    completed_count = sum(1 for p in periods_sorted if p.is_complete)
    overall_pct = math.floor(completed_count / roadmap.total_periods * 100) if roadmap.total_periods else 0

    # Time calculations
    elapsed_days: Optional[int] = None
    planned_days: Optional[int] = None
    is_on_track: Optional[bool] = None
    days_per_period = 30 if roadmap.period_type == "month" else 7
    planned_days = roadmap.total_periods * days_per_period

    if roadmap.started_at:
        end = roadmap.completed_at or datetime.utcnow()
        elapsed_days = max(0, (end - roadmap.started_at).days)
        if elapsed_days > 0 and planned_days > 0:
            time_pct = elapsed_days / planned_days * 100
            is_on_track = time_pct <= overall_pct + 10  # 10% grace

    period_statuses = []
    for p in periods_sorted:
        lines = _topic_lines(p.topics)
        status_list: List[bool] = json.loads(p.tasks_status) if p.tasks_status else []
        total_tasks = len(lines)
        done_tasks = sum(1 for s in status_list if s)
        pct = math.floor(done_tasks / total_tasks * 100) if total_tasks else (100 if p.is_complete else 0)
        period_statuses.append(PeriodStatus(
            period_id=p.id,
            period_index=p.period_index,
            label=p.label,
            is_complete=p.is_complete or False,
            total_tasks=total_tasks,
            completed_tasks=done_tasks,
            completion_pct=pct,
            completed_at=p.completed_at,
        ))

    return RoadmapReport(
        roadmap_id=roadmap.id,
        title=roadmap.title,
        period_type=roadmap.period_type,
        total_periods=roadmap.total_periods,
        completed_periods=completed_count,
        overall_pct=overall_pct,
        started_at=roadmap.started_at,
        completed_at=roadmap.completed_at,
        elapsed_days=elapsed_days,
        planned_days=planned_days,
        is_on_track=is_on_track,
        periods=period_statuses,
    )


# ─── Period CRUD ───────────────────────────────────────────────────────────────

@router.put("/{roadmap_id}/periods/{period_id}", response_model=PeriodOut)
def update_period(
    roadmap_id: int,
    period_id: int,
    payload: PeriodUpdate,
    db: Session = Depends(get_db),
):
    period = (
        db.query(RoadmapPeriod)
        .options(selectinload(RoadmapPeriod.resources))
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")

    if payload.label is not None:
        period.label = payload.label
    if payload.topics is not None:
        old_lines = _topic_lines(period.topics)
        new_lines = _topic_lines(payload.topics)
        # Remap tasks_status to the new line count
        old_status: List[bool] = json.loads(period.tasks_status) if period.tasks_status else []
        # Try to preserve status for lines that still exist
        if old_lines:
            old_map = {l: s for l, s in zip(old_lines, old_status)}
            new_status = [old_map.get(l, False) for l in new_lines]
        else:
            new_status = [False] * len(new_lines)
        period.topics = payload.topics
        period.tasks_status = json.dumps(new_status)
        # Reset completion if tasks changed
        if not all(new_status):
            period.is_complete = False
            period.completed_at = None

    period.updated_at = datetime.utcnow()
    db.commit()
    period = (
        db.query(RoadmapPeriod)
        .options(selectinload(RoadmapPeriod.resources))
        .filter(RoadmapPeriod.id == period_id)
        .first()
    )
    return _period_out(period)


# ─── Toggle Task ───────────────────────────────────────────────────────────────

@router.post("/{roadmap_id}/periods/{period_id}/toggle-task", response_model=PeriodOut)
def toggle_task(
    roadmap_id: int,
    period_id: int,
    payload: ToggleTaskRequest,
    db: Session = Depends(get_db),
):
    """
    Toggle a single task checkbox in a period.
    If all tasks become complete, marks the period as complete and
    generates revision notes. Also checks if the whole roadmap is done.
    """
    period = (
        db.query(RoadmapPeriod)
        .options(selectinload(RoadmapPeriod.resources))
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")

    lines = _topic_lines(period.topics)
    if not lines:
        raise HTTPException(400, "This period has no tasks defined yet")

    status_list: List[bool] = json.loads(period.tasks_status) if period.tasks_status else [False] * len(lines)
    # Ensure list is the right length
    while len(status_list) < len(lines):
        status_list.append(False)
    status_list = status_list[:len(lines)]

    idx = payload.task_index
    if not 0 <= idx < len(lines):
        raise HTTPException(400, f"task_index {idx} out of range (0–{len(lines)-1})")

    # Toggle
    status_list[idx] = not status_list[idx]
    period.tasks_status = json.dumps(status_list)

    # Check if period is now fully complete
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    roadmap_title = roadmap.title if roadmap else "Learning Roadmap"

    if all(status_list):
        period.is_complete = True
        period.completed_at = datetime.utcnow()
        # Kick off AI note generation in a background thread
        # so the API responds immediately without waiting for Gemini
        period_id_copy = period.id
        t = threading.Thread(
            target=_generate_ai_notes_async,
            args=(period_id_copy, roadmap_id, roadmap_title, None),
            daemon=True,
        )
        t.start()
    else:
        # Un-complete if a task was unchecked
        period.is_complete = False
        period.completed_at = None

    period.updated_at = datetime.utcnow()
    db.flush()

    # Check if entire roadmap is now complete
    all_periods = db.query(RoadmapPeriod).filter(
        RoadmapPeriod.roadmap_id == roadmap_id
    ).all()
    if roadmap and all(p.is_complete for p in all_periods):
        if not roadmap.completed_at:
            roadmap.completed_at = datetime.utcnow()
            roadmap.updated_at = datetime.utcnow()
    else:
        if roadmap and roadmap.completed_at:
            roadmap.completed_at = None  # un-complete if a task was unchecked

    db.commit()

    period = (
        db.query(RoadmapPeriod)
        .options(selectinload(RoadmapPeriod.resources))
        .filter(RoadmapPeriod.id == period_id)
        .first()
    )
    return _period_out(period)


# ─── Notes endpoints ──────────────────────────────────────────────────────────

class NotesResponse(BaseModel):
    period_id: int
    label: Optional[str]
    content: Optional[str]
    file_path: Optional[str]
    is_generating: bool = False


@router.get("/{roadmap_id}/periods/{period_id}/notes", response_model=NotesResponse)
def get_notes(
    roadmap_id: int,
    period_id: int,
    db: Session = Depends(get_db),
):
    """Return the current AI notes content for a period."""
    period = (
        db.query(RoadmapPeriod)
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")
    return NotesResponse(
        period_id=period.id,
        label=period.label,
        content=period.revision_notes,
        file_path=period.notes_file_path,
    )


@router.get("/{roadmap_id}/periods/{period_id}/notes/download")
def download_notes(
    roadmap_id: int,
    period_id: int,
    db: Session = Depends(get_db),
):
    """Stream the AI-generated .md file for download."""
    period = (
        db.query(RoadmapPeriod)
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")
    if not period.notes_file_path or not os.path.exists(period.notes_file_path):
        # Generate inline if file doesn't exist yet
        if period.revision_notes:
            label = period.label or f"Period {period.period_index + 1}"
            filename = f"roadmap_{roadmap_id}_period_{period.period_index + 1}_{_slug(label)}.md"
            file_path = os.path.join(NOTES_DIR, filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(period.revision_notes)
            period.notes_file_path = file_path
            db.commit()
        else:
            raise HTTPException(404, "Notes not yet generated for this period")
    label = period.label or f"period_{period.period_index + 1}"
    download_name = f"{_slug(label)}_notes.md"
    return FileResponse(
        path=period.notes_file_path,
        media_type="text/markdown",
        filename=download_name,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


@router.post("/{roadmap_id}/periods/{period_id}/generate-notes")
def generate_notes(
    roadmap_id: int,
    period_id: int,
    db: Session = Depends(get_db),
):
    """
    Trigger (re)generation of AI notes for a period.
    Returns immediately; generation runs in background.
    """
    period = (
        db.query(RoadmapPeriod)
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    roadmap_title = roadmap.title if roadmap else "Learning Roadmap"

    if not period.topics:
        raise HTTPException(400, "No topics defined for this period")

    t = threading.Thread(
        target=_generate_ai_notes_async,
        args=(period_id, roadmap_id, roadmap_title, None),
        daemon=True,
    )
    t.start()
    return {"status": "generating", "message": "AI notes generation started. Refresh in 10-30 seconds."}


# ─── Resource CRUD ─────────────────────────────────────────────────────────────

@router.post(
    "/{roadmap_id}/periods/{period_id}/resources",
    response_model=ResourceOut,
    status_code=status.HTTP_201_CREATED,
)
def add_resource(
    roadmap_id: int,
    period_id: int,
    payload: ResourceCreate,
    db: Session = Depends(get_db),
):
    period = (
        db.query(RoadmapPeriod)
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")

    resource = PeriodResource(
        period_id=period_id,
        title=payload.title,
        url=payload.url,
        sort_order=payload.sort_order,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.put(
    "/{roadmap_id}/periods/{period_id}/resources/{resource_id}",
    response_model=ResourceOut,
)
def update_resource(
    roadmap_id: int,
    period_id: int,
    resource_id: int,
    payload: ResourceUpdate,
    db: Session = Depends(get_db),
):
    resource = (
        db.query(PeriodResource)
        .join(RoadmapPeriod)
        .filter(
            PeriodResource.id == resource_id,
            PeriodResource.period_id == period_id,
            RoadmapPeriod.roadmap_id == roadmap_id,
        )
        .first()
    )
    if not resource:
        raise HTTPException(404, "Resource not found")

    if payload.title is not None:
        resource.title = payload.title
    if payload.url is not None:
        resource.url = payload.url
    if payload.sort_order is not None:
        resource.sort_order = payload.sort_order
    db.commit()
    db.refresh(resource)
    return resource


@router.delete(
    "/{roadmap_id}/periods/{period_id}/resources/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_resource(
    roadmap_id: int,
    period_id: int,
    resource_id: int,
    db: Session = Depends(get_db),
):
    resource = (
        db.query(PeriodResource)
        .join(RoadmapPeriod)
        .filter(
            PeriodResource.id == resource_id,
            PeriodResource.period_id == period_id,
            RoadmapPeriod.roadmap_id == roadmap_id,
        )
        .first()
    )
    if not resource:
        raise HTTPException(404, "Resource not found")
    db.delete(resource)
    db.commit()
