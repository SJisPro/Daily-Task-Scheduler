from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from plyer import notification
import sys
from .database import SessionLocal
from .models import Task

scheduler = BackgroundScheduler()

def check_and_send_reminders():
    """Check for tasks that need reminders and send notifications"""
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_date = now.strftime("%Y-%m-%d")
        
        # Find tasks scheduled for now that are not completed
        tasks = db.query(Task).filter(
            Task.scheduled_date == current_date,
            Task.scheduled_time == current_time,
            Task.is_completed == False,
            Task.reminder_sent == False
        ).all()
        
        for task in tasks:
            # Send desktop notification
            try:
                notification.notify(
                    title="Task Reminder",
                    message=f"It's time for: {task.title}",
                    timeout=10
                )
                task.reminder_sent = True
                db.commit()
            except Exception as e:
                print(f"Error sending notification: {e}")
        
    except Exception as e:
        print(f"Error in reminder service: {e}")
    finally:
        db.close()

def start_reminder_service():
    """Start the reminder scheduler"""
    # Run every minute to check for tasks
    scheduler.add_job(
        check_and_send_reminders,
        trigger=CronTrigger(second=0),  # Run at the start of every minute
        id='task_reminder',
        name='Check and send task reminders',
        replace_existing=True
    )
    scheduler.start()
    print("Reminder service started")

def stop_reminder_service():
    """Stop the reminder scheduler"""
    scheduler.shutdown()

