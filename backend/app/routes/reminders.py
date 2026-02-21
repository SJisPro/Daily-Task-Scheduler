"""
routes/reminders.py – CRUD + polling endpoints for task reminders.

Endpoints
---------
GET    /api/reminders/due          → Poll for reminders the frontend must display
POST   /api/reminders/             → Create a reminder config for a task
GET    /api/reminders/{task_id}    → List all reminders for a task
PATCH  /api/reminders/{id}/acknowledge  → Mark fired reminder as seen
PATCH  /api/reminders/{id}/snooze       → Snooze a fired reminder
DELETE /api/reminders/{id}         → Remove a reminder config
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from .. import schemas, models
from ..database import get_db
from ..reminder_logic import compute_next_fire_at

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


# ─── Helper ───────────────────────────────────────────────────────────────────

def _serialize(reminder: models.TaskReminder) -> schemas.ReminderResponse:
    task = reminder.task
    return schemas.ReminderResponse(
        id=reminder.id,
        task_id=reminder.task_id,
        reminder_type=reminder.reminder_type,
        before_minutes=reminder.before_minutes or 0,
        recurrence=reminder.recurrence,
        recurrence_days=reminder.recurrence_days,
        status=reminder.status,
        next_fire_at=reminder.next_fire_at,
        snooze_until=reminder.snooze_until,
        fire_count=reminder.fire_count or 0,
        created_at=reminder.created_at,
        fired_at=reminder.fired_at,
        acknowledged_at=reminder.acknowledged_at,
        task_title=task.title if task else None,
        task_description=task.description if task else None,
        task_scheduled_date=task.scheduled_date if task else None,
        task_scheduled_time=task.scheduled_time if task else None,
    )


# ─── GET /api/reminders/due ──────────────────────────────────────────────────

@router.get("/due", response_model=schemas.DueRemindersResponse)
def get_due_reminders(db: Session = Depends(get_db)):
    """
    Frontend polls this endpoint every ~60 seconds.

    Returns all reminders currently in "due" status.
    The scheduler (reminder_service._tick) is responsible for flipping
    reminders from "pending"/"snoozed" → "due", so this endpoint is a
    pure read – fast, safe, and idempotent.

    The `server_utc` field lets the client detect large clock skew.
    """
    due = (
        db.query(models.TaskReminder)
        .filter(models.TaskReminder.status == "due")
        .order_by(models.TaskReminder.fired_at.asc())
        .all()
    )
    return schemas.DueRemindersResponse(
        reminders=[_serialize(r) for r in due],
        server_utc=datetime.utcnow().isoformat() + "Z",
    )


# ─── POST /api/reminders/ ────────────────────────────────────────────────────

@router.post("/", response_model=schemas.ReminderResponse, status_code=201)
def create_reminder(body: schemas.ReminderCreate, db: Session = Depends(get_db)):
    """
    Create a new reminder configuration for a task.

    The caller supplies tz_offset_minutes so we can correctly compute next_fire_at
    as UTC. Example: IST (UTC+5:30) → tz_offset_minutes=330.

    For "missed" type, next_fire_at is forced to 09:00 UTC tomorrow.
    """
    task = db.query(models.Task).filter(models.Task.id == body.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.is_completed:
        raise HTTPException(status_code=400, detail="Cannot add reminder to a completed task")

    if body.reminder_type == "missed":
        # One-off missed reminder always fires at 09:00 UTC tomorrow
        now_utc = datetime.utcnow()
        next_fire = datetime(now_utc.year, now_utc.month, now_utc.day, 9, 0, 0) + timedelta(days=1)
    else:
        next_fire = compute_next_fire_at(
            reminder_type=body.reminder_type,
            scheduled_date=task.scheduled_date,
            scheduled_time=task.scheduled_time,
            before_minutes=body.before_minutes,
            tz_offset_minutes=body.tz_offset_minutes,
            recurrence=body.recurrence,
            recurrence_days=body.recurrence_days,
            last_fired_at=None,
        )
        if next_fire is None:
            raise HTTPException(
                status_code=400,
                detail="Reminder time is already in the past and has no future recurrence.",
            )

    reminder = models.TaskReminder(
        task_id=body.task_id,
        reminder_type=body.reminder_type,
        before_minutes=body.before_minutes,
        recurrence=body.recurrence,
        recurrence_days=body.recurrence_days,
        status="pending",
        next_fire_at=next_fire,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return _serialize(reminder)


# ─── GET /api/reminders/{task_id} ────────────────────────────────────────────

@router.get("/{task_id}", response_model=List[schemas.ReminderResponse])
def get_task_reminders(task_id: int, db: Session = Depends(get_db)):
    """List all reminders configured for a task."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    reminders = (
        db.query(models.TaskReminder)
        .filter(models.TaskReminder.task_id == task_id)
        .order_by(models.TaskReminder.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in reminders]


# ─── PATCH /api/reminders/{id}/acknowledge ───────────────────────────────────

@router.patch("/{reminder_id}/acknowledge", response_model=schemas.ReminderResponse)
def acknowledge_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """
    Called by the frontend immediately after showing a notification.

    - One-shot reminders → status = "acknowledged" (terminal)
    - Recurring reminders → status = "acknowledged"; the scheduler will
      advance next_fire_at and reset to "pending" on its next tick.
    """
    reminder = db.query(models.TaskReminder).filter(
        models.TaskReminder.id == reminder_id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if reminder.status != "due":
        raise HTTPException(
            status_code=400,
            detail=f"Reminder is in '{reminder.status}' state, not 'due'.",
        )

    reminder.status = "acknowledged"
    reminder.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(reminder)
    return _serialize(reminder)


# ─── PATCH /api/reminders/{id}/snooze ────────────────────────────────────────

@router.patch("/{reminder_id}/snooze", response_model=schemas.ReminderResponse)
def snooze_reminder(
    reminder_id: int,
    body: schemas.SnoozeRequest,
    db: Session = Depends(get_db),
):
    """
    Snooze a 'due' reminder for 5, 10, 30, or 60 minutes.

    The reminder's status becomes "snoozed" and next_fire_at is set to
    utcnow() + snooze_minutes. The scheduler will re-activate it when that
    time passes on its next tick.
    """
    reminder = db.query(models.TaskReminder).filter(
        models.TaskReminder.id == reminder_id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if reminder.status != "due":
        raise HTTPException(
            status_code=400,
            detail=f"Can only snooze a 'due' reminder; current status is '{reminder.status}'.",
        )

    snooze_until = datetime.utcnow() + timedelta(minutes=body.snooze_minutes)
    reminder.status = "snoozed"
    reminder.snooze_until = snooze_until
    reminder.next_fire_at = snooze_until
    db.commit()
    db.refresh(reminder)
    return _serialize(reminder)


# ─── DELETE /api/reminders/{id} ──────────────────────────────────────────────

@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Remove a reminder configuration entirely."""
    reminder = db.query(models.TaskReminder).filter(
        models.TaskReminder.id == reminder_id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return None
