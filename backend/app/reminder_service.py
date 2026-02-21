"""
reminder_service.py – Lightweight APScheduler job that runs every 60 seconds.

What it does (all in a single short-lived DB session):
  1. Find reminders in "pending" or "snoozed" state whose next_fire_at has passed.
  2. Flip them to "due" so the frontend can pick them up via GET /api/reminders/due.
  3. For recurring reminders that are already "acknowledged", compute and set
     the next next_fire_at and reset to "pending".
  4. Scan for missed tasks (due yesterday or earlier, not completed, no active
     missed reminder) and create a "missed" reminder for 09:00 the next morning.

Constraints:
  - Job runs at most once per minute (CronTrigger second=0, max_instances=1).
  - No external I/O, no threads spawned, no heavyweight operations.
  - Safe to restart: all operations are idempotent.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from .database import SessionLocal
from .models import Task, TaskReminder
from .reminder_logic import compute_next_fire_at, is_due

scheduler = None


# ─────────────────────────────────────────────────────────────────────────────
# Main job
# ─────────────────────────────────────────────────────────────────────────────

def _tick():
    """Called every 60 seconds by APScheduler."""
    db: Session = SessionLocal()
    try:
        now_utc = datetime.utcnow()

        # ── 1. Activate pending/snoozed reminders that are due ───────────────
        candidates = (
            db.query(TaskReminder)
            .filter(
                TaskReminder.status.in_(["pending", "snoozed"]),
                TaskReminder.next_fire_at <= now_utc + timedelta(seconds=30),
            )
            .all()
        )

        for reminder in candidates:
            reminder.status = "due"
            reminder.fired_at = now_utc
            reminder.fire_count = (reminder.fire_count or 0) + 1

        # ── 2. Advance acknowledged recurring reminders ───────────────────────
        recurring_acked = (
            db.query(TaskReminder)
            .filter(
                TaskReminder.status == "acknowledged",
                TaskReminder.recurrence.isnot(None),
                TaskReminder.recurrence != "",
            )
            .all()
        )

        for reminder in recurring_acked:
            task = reminder.task
            if task is None or task.is_completed:
                continue
            next_fire = compute_next_fire_at(
                reminder_type=reminder.reminder_type,
                scheduled_date=task.scheduled_date,
                scheduled_time=task.scheduled_time,
                before_minutes=reminder.before_minutes or 0,
                tz_offset_minutes=0,  # stored as UTC; offset handled at creation
                recurrence=reminder.recurrence,
                recurrence_days=reminder.recurrence_days,
                last_fired_at=reminder.fired_at,
            )
            if next_fire:
                reminder.next_fire_at = next_fire
                reminder.status = "pending"
                reminder.acknowledged_at = None

        # ── 3. Create missed-task reminders ───────────────────────────────────
        _create_missed_reminders(db, now_utc)

        db.commit()

    except Exception as exc:
        print(f"[reminder_service] tick error: {exc}")
        db.rollback()
    finally:
        db.close()


def _create_missed_reminders(db: Session, now_utc: datetime):
    """
    For every task that is:
      - not completed
      - scheduled_date < today (i.e., overdue)
      - has NO existing "missed" reminder in pending/due/snoozed state

    ...create a "missed" reminder firing at 09:00 UTC next morning.
    We limit the scan to the last 7 days to avoid massive table scans.
    """
    today = now_utc.date()
    week_ago = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    overdue_tasks = (
        db.query(Task)
        .filter(
            Task.is_completed.is_(False),
            Task.scheduled_date >= week_ago,
            Task.scheduled_date <= yesterday,
        )
        .all()
    )

    for task in overdue_tasks:
        # Check if already has an active missed reminder
        existing = (
            db.query(TaskReminder)
            .filter(
                TaskReminder.task_id == task.id,
                TaskReminder.reminder_type == "missed",
                TaskReminder.status.in_(["pending", "due", "snoozed"]),
            )
            .first()
        )
        if existing:
            continue

        # Schedule for 09:00 UTC tomorrow
        tomorrow_9am = (
            datetime(now_utc.year, now_utc.month, now_utc.day, 9, 0, 0)
            + timedelta(days=1)
        )
        new_reminder = TaskReminder(
            task_id=task.id,
            reminder_type="missed",
            before_minutes=0,
            recurrence=None,
            status="pending",
            next_fire_at=tomorrow_9am,
        )
        db.add(new_reminder)


# ─────────────────────────────────────────────────────────────────────────────
# Lifecycle
# ─────────────────────────────────────────────────────────────────────────────

def start_reminder_service():
    global scheduler
    if scheduler and scheduler.running:
        return

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        _tick,
        trigger=CronTrigger(second=0),   # top of every minute
        id="reminder_tick",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=45,
    )
    scheduler.start()
    print("[reminder_service] started – polling every 60 s")


def stop_reminder_service():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None
        print("[reminder_service] stopped")