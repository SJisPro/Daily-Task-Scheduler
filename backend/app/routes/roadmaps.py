"""
Roadmap routes
==============
GET    /api/roadmaps/                          – list all roadmaps
POST   /api/roadmaps/                          – create a roadmap
GET    /api/roadmaps/{id}                      – get roadmap (with periods + resources)
PUT    /api/roadmaps/{id}                      – update roadmap header
DELETE /api/roadmaps/{id}                      – delete roadmap

PUT    /api/roadmaps/{id}/periods/{period_id}  – upsert topics/label for a period
POST   /api/roadmaps/{id}/periods/{period_id}/resources        – add resource link
DELETE /api/roadmaps/{id}/periods/{period_id}/resources/{rid}  – delete resource link
PUT    /api/roadmaps/{id}/periods/{period_id}/resources/{rid}  – update resource link
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..models import Roadmap, RoadmapPeriod, PeriodResource

router = APIRouter(prefix="/api/roadmaps", tags=["roadmaps"])


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

    class Config:
        from_attributes = True


class RoadmapOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    period_type: str
    total_periods: int
    created_at: datetime
    updated_at: datetime
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


# ─── Roadmap CRUD ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[RoadmapListItem])
def list_roadmaps(db: Session = Depends(get_db)):
    return db.query(Roadmap).order_by(Roadmap.created_at.desc()).all()


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
    db.flush()           # get the ID
    _ensure_periods(db, roadmap)
    db.commit()
    # Re-fetch with eager loading to avoid DetachedInstanceError
    roadmap = (
        db.query(Roadmap)
        .options(selectinload(Roadmap.periods).selectinload(RoadmapPeriod.resources))
        .filter(Roadmap.id == roadmap.id)
        .first()
    )
    return roadmap


@router.get("/{roadmap_id}", response_model=RoadmapOut)
def get_roadmap(roadmap_id: int, db: Session = Depends(get_db)):
    roadmap = (
        db.query(Roadmap)
        .options(selectinload(Roadmap.periods).selectinload(RoadmapPeriod.resources))
        .filter(Roadmap.id == roadmap_id)
        .first()
    )
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    return roadmap


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
    # Re-fetch with eager loading
    roadmap = (
        db.query(Roadmap)
        .options(selectinload(Roadmap.periods).selectinload(RoadmapPeriod.resources))
        .filter(Roadmap.id == roadmap.id)
        .first()
    )
    return roadmap


@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap(roadmap_id: int, db: Session = Depends(get_db)):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    db.delete(roadmap)
    db.commit()


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
        .filter(RoadmapPeriod.id == period_id, RoadmapPeriod.roadmap_id == roadmap_id)
        .first()
    )
    if not period:
        raise HTTPException(404, "Period not found")

    if payload.label is not None:
        period.label = payload.label
    if payload.topics is not None:
        period.topics = payload.topics
    period.updated_at = datetime.utcnow()
    db.commit()
    # Re-fetch with resources eagerly loaded
    period = (
        db.query(RoadmapPeriod)
        .options(selectinload(RoadmapPeriod.resources))
        .filter(RoadmapPeriod.id == period_id)
        .first()
    )
    return period


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
