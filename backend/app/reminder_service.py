from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime
import os

from .database import SessionLocal
from .models import Task

scheduler = None


def check_and_send_reminders():
    """Check for tasks that need reminders and mark them as sent"""
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_date = now.strftime("%Y-%m-%d")

        tasks = db.query(Task).filter(
            Task.scheduled_date == current_date,
            Task.scheduled_time == current_time,
            Task.is_completed.is_(False),
            Task.reminder_sent.is_(False)
        ).all()

        if not tasks:
            return

        for task in tasks:
            # ❌ DO NOT send desktop notifications in cloud
            # ✅ Just mark reminder as sent
            task.reminder_sent = True

        db.commit()

    except Exception as e:
        print("Reminder job error:", e)
        db.rollback()
    finally:
        db.close()


def start_reminder_service():
    global scheduler

    if scheduler and scheduler.running:
        return  # Prevent duplicate schedulers

    scheduler = BackgroundScheduler()

    scheduler.add_job(
        check_and_send_reminders,
        trigger=CronTrigger(second=0),
        id="task_reminder",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=30,
    )

    scheduler.start()
    print("Reminder service started")


def stop_reminder_service():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None