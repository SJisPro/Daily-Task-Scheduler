from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, date
import calendar as cal_module
from pydantic import BaseModel
from .. import schemas, models
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# ─── helpers ────────────────────────────────────────────────────────────────

def _today() -> date:
    return datetime.utcnow().date()

def _month_days(year: int, month: int) -> List[date]:
    """Return all dates in the given calendar month."""
    _, last_day = cal_module.monthrange(year, month)
    return [date(year, month, d) for d in range(1, last_day + 1)]

def _filter_no_past(dates: List[date], source: date) -> List[date]:
    """Remove dates that are today or earlier and equal to source."""
    today = _today()
    return [d for d in dates if d != source and d >= today]

def _existing_titles_on_date(db: Session, target_date: str) -> set:
    """Return the set of lowercase titles already scheduled on target_date."""
    tasks = db.query(models.Task.title).filter(
        models.Task.scheduled_date == target_date
    ).all()
    return {t.title.strip().lower() for t in tasks}

def _build_target_dates(target_type: str, source: date) -> List[date]:
    """Compute raw target dates for any copy target type (no filtering yet)."""
    today = _today()

    if target_type in ("weekdays", "weekend", "week",
                       "next_week_weekdays", "next_week_weekend", "next_week"):
        if target_type.startswith("next_week"):
            monday = source - timedelta(days=source.weekday()) + timedelta(weeks=1)
        else:
            monday = source - timedelta(days=source.weekday())

        if target_type in ("weekdays", "next_week_weekdays"):
            return [monday + timedelta(days=i) for i in range(5)]
        elif target_type in ("weekend", "next_week_weekend"):
            return [monday + timedelta(days=i) for i in range(5, 7)]
        else:  # week / next_week
            return [monday + timedelta(days=i) for i in range(7)]

    elif target_type in ("month_weekdays", "month_weekend", "month_all"):
        all_days = [d for d in _month_days(source.year, source.month)
                    if d >= today and d != source]
        if target_type == "month_weekdays":
            return [d for d in all_days if d.weekday() < 5]
        elif target_type == "month_weekend":
            return [d for d in all_days if d.weekday() >= 5]
        return all_days

    elif target_type in ("next_month_weekdays", "next_month_weekend", "next_month_all"):
        if source.month == 12:
            ny, nm = source.year + 1, 1
        else:
            ny, nm = source.year, source.month + 1
        all_days = _month_days(ny, nm)
        if target_type == "next_month_weekdays":
            return [d for d in all_days if d.weekday() < 5]
        elif target_type == "next_month_weekend":
            return [d for d in all_days if d.weekday() >= 5]
        return all_days

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "target_type must be one of: weekdays, weekend, week, "
                "next_week_weekdays, next_week_weekend, next_week, "
                "month_weekdays, month_weekend, month_all, "
                "next_month_weekdays, next_month_weekend, next_month_all"
            )
        )

VALID_TARGET_TYPES = {
    "weekdays", "weekend", "week",
    "next_week_weekdays", "next_week_weekend", "next_week",
    "month_weekdays", "month_weekend", "month_all",
    "next_month_weekdays", "next_month_weekend", "next_month_all",
}

# ─── CRUD ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(
    date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all tasks, optionally filtered by date"""
    query = db.query(models.Task)
    if date:
        query = query.filter(models.Task.scheduled_date == date)
    tasks = query.order_by(models.Task.scheduled_time).offset(skip).limit(limit).all()
    return tasks

@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task by ID"""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/", response_model=schemas.TaskResponse, status_code=201)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    """Update a task"""
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.patch("/{task_id}/complete", response_model=schemas.TaskResponse)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    """Mark a task as completed"""
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db_task.is_completed = True
    db_task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(db_task)
    return db_task

@router.patch("/{task_id}/uncomplete", response_model=schemas.TaskResponse)
def uncomplete_task(task_id: int, db: Session = Depends(get_db)):
    """Mark a task as not completed"""
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db_task.is_completed = False
    db_task.completed_at = None
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return None

# ─── batch / date / week / month deletes ─────────────────────────────────────

class BatchDeleteRequest(BaseModel):
    task_ids: List[int]

@router.post("/batch-delete", status_code=200)
def batch_delete_tasks(request: BatchDeleteRequest, db: Session = Depends(get_db)):
    """Delete multiple tasks by their IDs"""
    if not request.task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")
    tasks_to_delete = db.query(models.Task).filter(models.Task.id.in_(request.task_ids)).all()
    if not tasks_to_delete:
        raise HTTPException(status_code=404, detail="No tasks found with the provided IDs")
    deleted_count = len(tasks_to_delete)
    deleted_ids = [task.id for task in tasks_to_delete]
    for task in tasks_to_delete:
        db.delete(task)
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} task(s)", "deleted_count": deleted_count, "deleted_ids": deleted_ids}

@router.delete("/date/{date}", status_code=200)
def delete_tasks_by_date(date: str, db: Session = Depends(get_db)):
    """Delete all tasks for a specific date"""
    try:
        datetime.strptime(date, "%Y-%m-%d")
        tasks_to_delete = db.query(models.Task).filter(models.Task.scheduled_date == date).all()
        if not tasks_to_delete:
            return {"message": "No tasks found for the specified date", "deleted_count": 0, "deleted_ids": []}
        deleted_count = len(tasks_to_delete)
        deleted_ids = [task.id for task in tasks_to_delete]
        for task in tasks_to_delete:
            db.delete(task)
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} task(s) for {date}", "deleted_count": deleted_count, "deleted_ids": deleted_ids}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@router.delete("/week/{start_date}", status_code=200)
def delete_tasks_by_week(start_date: str, db: Session = Depends(get_db)):
    """Delete all tasks for a week starting from start_date"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = start + timedelta(days=6)
        tasks_to_delete = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end.strftime("%Y-%m-%d")
        ).all()
        if not tasks_to_delete:
            return {"message": "No tasks found for the specified week", "deleted_count": 0, "deleted_ids": []}
        deleted_count = len(tasks_to_delete)
        deleted_ids = [task.id for task in tasks_to_delete]
        for task in tasks_to_delete:
            db.delete(task)
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} task(s) for the week", "deleted_count": deleted_count, "deleted_ids": deleted_ids}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@router.delete("/month/{year}/{month}", status_code=200)
def delete_tasks_by_month(year: int, month: int, db: Session = Depends(get_db)):
    """Delete all tasks for a specific month"""
    try:
        start_date = f"{year}-{month:02d}-01"
        last_day = cal_module.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        tasks_to_delete = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end_date
        ).all()
        if not tasks_to_delete:
            return {"message": "No tasks found for the specified month", "deleted_count": 0, "deleted_ids": []}
        deleted_count = len(tasks_to_delete)
        deleted_ids = [task.id for task in tasks_to_delete]
        for task in tasks_to_delete:
            db.delete(task)
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} task(s) for the month", "deleted_count": deleted_count, "deleted_ids": deleted_ids}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date: {str(e)}")

# ─── range gets ─────────────────────────────────────────────────────────────

@router.get("/week/{start_date}", response_model=List[schemas.TaskResponse])
def get_week_tasks(start_date: str, db: Session = Depends(get_db)):
    """Get all tasks for a week starting from start_date"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = start + timedelta(days=6)
        tasks = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end.strftime("%Y-%m-%d")
        ).order_by(models.Task.scheduled_date, models.Task.scheduled_time).all()
        return tasks
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@router.get("/month/{year}/{month}", response_model=List[schemas.TaskResponse])
def get_month_tasks(year: int, month: int, db: Session = Depends(get_db)):
    """Get all tasks for a specific month"""
    try:
        start_date = f"{year}-{month:02d}-01"
        last_day = cal_module.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        tasks = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end_date
        ).order_by(models.Task.scheduled_date, models.Task.scheduled_time).all()
        return tasks
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date: {str(e)}")

# ─── duplicate (bulk) ────────────────────────────────────────────────────────

@router.post("/duplicate", response_model=List[schemas.TaskResponse], status_code=201)
def duplicate_tasks(
    source_date: str = Query(..., description="Source date in YYYY-MM-DD format"),
    target_type: str = Query(..., description="Copy target type"),
    db: Session = Depends(get_db)
):
    """Duplicate all tasks from a source date to the selected target type.
    Skips dates in the past and skips tasks whose title already exists on a target date."""
    try:
        source = datetime.strptime(source_date, "%Y-%m-%d").date()
        today = _today()

        source_tasks = db.query(models.Task).filter(
            models.Task.scheduled_date == source_date
        ).all()
        if not source_tasks:
            raise HTTPException(status_code=404, detail="No tasks found for the source date")

        raw_dates = _build_target_dates(target_type, source)
        # Filter out past dates (but for next_month types allow all days)
        if target_type in ("next_month_weekdays", "next_month_weekend", "next_month_all"):
            target_dates = [d for d in raw_dates if d != source]
        else:
            target_dates = [d for d in raw_dates if d != source and d >= today]

        if not target_dates:
            raise HTTPException(
                status_code=400,
                detail="No valid future target dates found."
            )

        created_tasks = []
        for target_date in target_dates:
            target_date_str = target_date.strftime("%Y-%m-%d")
            existing_titles = _existing_titles_on_date(db, target_date_str)
            for source_task in source_tasks:
                if source_task.title.strip().lower() in existing_titles:
                    continue  # skip duplicate
                new_task = models.Task(
                    title=source_task.title,
                    description=source_task.description,
                    scheduled_date=target_date_str,
                    scheduled_time=source_task.scheduled_time,
                    is_completed=False,
                    reminder_sent=False
                )
                db.add(new_task)
                created_tasks.append(new_task)

        db.commit()
        for task in created_tasks:
            db.refresh(task)
        return created_tasks

    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error duplicating tasks: {str(e)}")

# ─── duplicate (single task) ─────────────────────────────────────────────────

class SingleDuplicateRequest(BaseModel):
    task_id: int
    target_type: str

@router.post("/duplicate/single", response_model=List[schemas.TaskResponse], status_code=201)
def duplicate_single_task(request: SingleDuplicateRequest, db: Session = Depends(get_db)):
    """Duplicate a single task to the selected target type.
    Skips past dates and dates where the task title already exists."""
    try:
        if request.target_type not in VALID_TARGET_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"target_type must be one of: {', '.join(sorted(VALID_TARGET_TYPES))}"
            )

        source_task = db.query(models.Task).filter(models.Task.id == request.task_id).first()
        if not source_task:
            raise HTTPException(status_code=404, detail="Task not found")

        source = datetime.strptime(source_task.scheduled_date, "%Y-%m-%d").date()
        today = _today()

        raw_dates = _build_target_dates(request.target_type, source)
        if request.target_type in ("next_month_weekdays", "next_month_weekend", "next_month_all"):
            target_dates = [d for d in raw_dates if d != source]
        else:
            target_dates = [d for d in raw_dates if d != source and d >= today]

        if not target_dates:
            raise HTTPException(status_code=400, detail="No valid future target dates found.")

        created_tasks = []
        for target_date in target_dates:
            target_date_str = target_date.strftime("%Y-%m-%d")
            existing_titles = _existing_titles_on_date(db, target_date_str)
            if source_task.title.strip().lower() in existing_titles:
                continue
            new_task = models.Task(
                title=source_task.title,
                description=source_task.description,
                scheduled_date=target_date_str,
                scheduled_time=source_task.scheduled_time,
                is_completed=False,
                reminder_sent=False
            )
            db.add(new_task)
            created_tasks.append(new_task)

        db.commit()
        for task in created_tasks:
            db.refresh(task)
        return created_tasks

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error duplicating task: {str(e)}")

# ─── analytics ───────────────────────────────────────────────────────────────

@router.get("/analytics/week")
def get_week_analytics(start_date: str = Query(..., description="Week start in YYYY-MM-DD"), db: Session = Depends(get_db)):
    """Day-by-day analytics for a 7-day week."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = start + timedelta(days=6)
        tasks = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end.strftime("%Y-%m-%d")
        ).all()

        days = []
        for i in range(7):
            d = start + timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            day_tasks = [t for t in tasks if t.scheduled_date == d_str]
            total = len(day_tasks)
            completed = sum(1 for t in day_tasks if t.is_completed)
            missed = sum(1 for t in day_tasks if t.is_missed and not t.is_completed)
            pending = total - completed - missed
            days.append({
                "date": d_str,
                "weekday": d.strftime("%A"),
                "total": total,
                "completed": completed,
                "missed": missed,
                "pending": max(0, pending),
                "completion_pct": round(completed / total * 100) if total > 0 else 0
            })
        return {"start_date": start_date, "end_date": end.strftime("%Y-%m-%d"), "days": days}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@router.get("/analytics/month")
def get_month_analytics(year: int = Query(...), month: int = Query(...), db: Session = Depends(get_db)):
    """Day-by-day analytics for a calendar month."""
    try:
        start_date = f"{year}-{month:02d}-01"
        last_day = cal_module.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        tasks = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end_date
        ).all()

        days = []
        for d in _month_days(year, month):
            d_str = d.strftime("%Y-%m-%d")
            day_tasks = [t for t in tasks if t.scheduled_date == d_str]
            total = len(day_tasks)
            completed = sum(1 for t in day_tasks if t.is_completed)
            missed = sum(1 for t in day_tasks if t.is_missed and not t.is_completed)
            pending = total - completed - missed
            days.append({
                "date": d_str,
                "weekday": d.strftime("%A"),
                "total": total,
                "completed": completed,
                "missed": missed,
                "pending": max(0, pending),
                "completion_pct": round(completed / total * 100) if total > 0 else 0
            })
        return {"year": year, "month": month, "days": days}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date: {str(e)}")

@router.get("/analytics/insights")
def get_analytics_insights(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """Rule-based productivity insights for a date range."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        tasks = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end_date
        ).all()

        today = _today()
        # Build per-day stats
        day_stats = {}
        current = start
        while current <= end:
            d_str = current.strftime("%Y-%m-%d")
            day_tasks = [t for t in tasks if t.scheduled_date == d_str]
            total = len(day_tasks)
            completed = sum(1 for t in day_tasks if t.is_completed)
            missed = sum(1 for t in day_tasks if t.is_missed and not t.is_completed)
            day_stats[d_str] = {
                "date": d_str,
                "weekday": current.strftime("%A"),
                "total": total,
                "completed": completed,
                "missed": missed,
                "pending": max(0, total - completed - missed),
                "completion_pct": round(completed / total * 100) if total > 0 else 0,
                "is_past": current <= today,
            }
            current += timedelta(days=1)

        past_days = [v for v in day_stats.values() if v["is_past"] and v["total"] > 0]
        all_days = list(day_stats.values())

        total_tasks = sum(v["total"] for v in past_days)
        total_completed = sum(v["completed"] for v in past_days)
        total_missed = sum(v["missed"] for v in past_days)
        overall_pct = round(total_completed / total_tasks * 100) if total_tasks > 0 else 0

        # Best / worst day
        best_day = max(past_days, key=lambda d: d["completion_pct"], default=None)
        worst_day = min(
            [d for d in past_days if d["completion_pct"] < 100],
            key=lambda d: d["completion_pct"],
            default=None
        )

        # Streak — consecutive days ending today with at least 1 completed task
        streak = 0
        check = today
        while True:
            s = check.strftime("%Y-%m-%d")
            if s in day_stats and day_stats[s]["completed"] > 0:
                streak += 1
                check -= timedelta(days=1)
            else:
                break

        # Weekday breakdown
        weekday_stats = {}
        for v in past_days:
            wd = v["weekday"]
            if wd not in weekday_stats:
                weekday_stats[wd] = {"total": 0, "completed": 0, "days": 0}
            weekday_stats[wd]["total"] += v["total"]
            weekday_stats[wd]["completed"] += v["completed"]
            weekday_stats[wd]["days"] += 1

        # Average tasks per day (past days with tasks)
        avg_tasks = round(total_tasks / len(past_days), 1) if past_days else 0
        overloaded_days = [v for v in past_days if v["total"] > avg_tasks * 1.5 and avg_tasks > 0]

        # Generate suggestions
        suggestions = []

        if overall_pct < 50 and total_tasks > 0:
            suggestions.append("Your overall completion rate is below 50%. Try breaking tasks into smaller, more achievable steps.")

        if best_day:
            suggestions.append(f"You perform best on {best_day['weekday']}s — consider scheduling your most important tasks on those days.")

        if worst_day and worst_day["completion_pct"] < 40:
            suggestions.append(f"You struggle most on {worst_day['weekday']}s ({worst_day['completion_pct']}% completion). Consider reducing task load or adding buffer time.")

        # Weekend vs weekday analysis
        weekend_days = [v for v in past_days if v["weekday"] in ("Saturday", "Sunday")]
        weekday_days_list = [v for v in past_days if v["weekday"] not in ("Saturday", "Sunday")]
        wknd_pct = round(sum(v["completed"] for v in weekend_days) / sum(v["total"] for v in weekend_days) * 100) if weekend_days and sum(v["total"] for v in weekend_days) > 0 else None
        wkdy_pct = round(sum(v["completed"] for v in weekday_days_list) / sum(v["total"] for v in weekday_days_list) * 100) if weekday_days_list and sum(v["total"] for v in weekday_days_list) > 0 else None

        if wknd_pct is not None and wkdy_pct is not None:
            if wknd_pct < wkdy_pct - 20:
                suggestions.append(f"Weekend completion ({wknd_pct}%) is significantly lower than weekdays ({wkdy_pct}%). Consider scheduling lighter tasks on weekends.")
            elif wknd_pct > wkdy_pct + 20:
                suggestions.append(f"You complete more tasks on weekends ({wknd_pct}%) than weekdays ({wkdy_pct}%). Use that energy to tackle important tasks on weekends too.")

        if streak >= 5:
            suggestions.append(f"🔥 Amazing! You're on a {streak}-day streak. Keep it going!")
        elif streak >= 3:
            suggestions.append(f"Nice streak of {streak} days! Push for 7 days to build a solid habit.")
        elif streak == 0 and total_tasks > 0:
            suggestions.append("Start fresh today — completing even 1 task will restart your streak!")

        if overloaded_days:
            suggestions.append(f"You have {len(overloaded_days)} day(s) with unusually heavy task loads. Spreading tasks more evenly might improve completion rates.")

        if total_missed > total_completed and total_tasks > 0:
            suggestions.append("You're missing more tasks than you complete. Consider setting reminders or reducing the number of daily tasks.")

        if not suggestions:
            suggestions.append("Great job! Keep maintaining your current productivity level.")

        return {
            "start_date": start_date,
            "end_date": end_date,
            "summary": {
                "total_tasks": total_tasks,
                "total_completed": total_completed,
                "total_missed": total_missed,
                "overall_completion_pct": overall_pct,
                "current_streak": streak,
                "avg_tasks_per_day": avg_tasks,
            },
            "best_day": best_day,
            "worst_day": worst_day,
            "weekday_breakdown": weekday_stats,
            "suggestions": suggestions,
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
