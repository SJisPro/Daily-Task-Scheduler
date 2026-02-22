"""
push_service.py  –  APScheduler job that sends OneSignal Web Push
                    notifications at three fixed times each day.

Three automatic notifications (no per-task configuration needed):

  1. 09:00 AM local  →  Morning Schedule   (list of today's tasks)
  2. T − 10 min      →  Pre-task Alert     (10 min before each task)
  3. 23:59 PM local  →  Daily Report       (completed vs missed summary)

Required environment variables:
  ONESIGNAL_APP_ID   – "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  (public)
  ONESIGNAL_API_KEY  – "os_..." REST API key                   (secret)
  TZ_OFFSET_MINUTES  – User's UTC offset in minutes, e.g. 330 for IST

The scheduler runs every 60 seconds (top of the minute) and decides
whether a notification should fire based on the current local time.
An in-memory dict tracks what has been sent today; it resets at midnight
(or on server restart – acceptable since the notification window is 2 min).
"""

import os
import httpx
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Task

# ─── Config from environment ──────────────────────────────────────────────────

ONESIGNAL_APP_ID  = os.getenv("ONESIGNAL_APP_ID", "")
ONESIGNAL_API_KEY = os.getenv("ONESIGNAL_API_KEY", "")
TZ_OFFSET_MINUTES = int(os.getenv("TZ_OFFSET_MINUTES", "330"))  # default: IST

scheduler = None

# ─── In-memory dedup tracker ─────────────────────────────────────────────────
# Resets automatically when the date changes (or on server restart).

_sent: dict = {}   # {"date": "YYYY-MM-DD", "morning": bool, "report": bool, "tasks": [id…]}


def _sent_today() -> dict:
    today = _local_now().strftime("%Y-%m-%d")
    global _sent
    if _sent.get("date") != today:
        _sent = {"date": today, "morning": False, "report": False, "tasks": []}
    return _sent


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _local_now() -> datetime:
    return datetime.utcnow() + timedelta(minutes=TZ_OFFSET_MINUTES)


def _fmt_time(t: str) -> str:
    """'14:30'  →  '2:30 PM'"""
    try:
        h, m = map(int, t.split(":"))
        return f"{h % 12 or 12}:{m:02d} {'PM' if h >= 12 else 'AM'}"
    except Exception:
        return t


def _send_push(title: str, body: str, collapse_id: str = "") -> None:
    """
    POST to the OneSignal v1 notifications endpoint.
    Sends to ALL subscribers of the app (single-user app model).
    """
    if not ONESIGNAL_APP_ID or not ONESIGNAL_API_KEY:
        print(f"[push_service] OneSignal not configured — skipping: {title!r}")
        return

    payload: dict = {
        "app_id":             ONESIGNAL_APP_ID,
        "included_segments":  ["All"],
        "headings":           {"en": title},
        "contents":           {"en": body},
        "url":                "/",           # Opens the PWA when tapped
        "chrome_web_icon":    "/icon-192.png",
    }
    if collapse_id:
        # Replaces any previous notification with the same ID on the device
        payload["collapse_id"] = collapse_id

    try:
        resp = httpx.post(
            "https://onesignal.com/api/v1/notifications",
            headers={
                "Authorization":  f"Key {ONESIGNAL_API_KEY}",
                "Content-Type":   "application/json",
            },
            json=payload,
            timeout=10,
        )
        data = resp.json()
        if resp.status_code == 200:
            print(f"[push_service] ✓ Sent {title!r} → {data.get('recipients', 0)} recipient(s)")
        else:
            print(f"[push_service] ✗ OneSignal {resp.status_code}: {data}")
    except Exception as exc:
        print(f"[push_service] ✗ HTTP error: {exc}")


# ─── The three notification types ────────────────────────────────────────────

def _morning_schedule(tasks: list[Task]) -> None:
    pending = sorted(
        [t for t in tasks if not t.is_completed],
        key=lambda t: t.scheduled_time,
    )
    if not pending:
        _send_push("📅 Good morning! No tasks today", "You have a free day 🎉", "morning-schedule")
        return

    lines = "\n".join(
        f"{_fmt_time(t.scheduled_time)}  {t.title}"
        for t in pending[:5]
    )
    if len(pending) > 5:
        lines += f"\n…and {len(pending) - 5} more"

    _send_push(
        f"📅 Good morning! {len(pending)} task{'s' if len(pending) != 1 else ''} today",
        lines,
        "morning-schedule",
    )


def _pre_task_alert(task: Task) -> None:
    body = _fmt_time(task.scheduled_time)
    if task.description:
        body += f"  ·  {task.description}"
    _send_push(
        f"⏰ Starting in 10 min — {task.title}",
        body,
        f"pre-task-{task.id}",
    )


def _daily_report(tasks: list[Task]) -> None:
    if not tasks:
        _send_push("🌙 Daily Report", "No tasks were scheduled today.", "daily-report")
        return

    completed = [t for t in tasks if t.is_completed]
    missed    = [t for t in tasks if not t.is_completed]
    parts     = []
    if completed:
        parts.append(f"✅ Completed: {len(completed)}")
    if missed:
        parts.append(f"❌ Missed: {len(missed)}")

    body = "  ·  ".join(parts)
    missed_names = ", ".join(t.title for t in missed[:3])
    if missed_names:
        body += f"\nMissed: {missed_names}"

    _send_push(
        f"🌙 Day complete — {len(completed)}/{len(tasks)} done",
        body,
        "daily-report",
    )


# ─── Main tick ────────────────────────────────────────────────────────────────

def _tick() -> None:
    """Runs every 60 seconds. Decides which (if any) notification to send."""
    db: Session = SessionLocal()
    try:
        now   = _local_now()
        h, m  = now.hour, now.minute
        today = now.strftime("%Y-%m-%d")
        sent  = _sent_today()

        tasks = db.query(Task).filter(Task.scheduled_date == today).all()

        # 1. Morning schedule at 09:00 ─────────────────────────────────────────
        if h == 9 and m == 0 and not sent["morning"]:
            _morning_schedule(tasks)
            sent["morning"] = True

        # 2. Pre-task alerts — 10 minutes before each pending task ─────────────
        for task in tasks:
            if task.is_completed:
                continue
            if task.id in sent["tasks"]:
                continue
            try:
                th, tm   = map(int, task.scheduled_time.split(":"))
                task_dt  = now.replace(hour=th, minute=tm, second=0, microsecond=0)
                diff_min = int((task_dt - now).total_seconds() / 60)
                if 9 <= diff_min <= 11:
                    _pre_task_alert(task)
                    sent["tasks"].append(task.id)
            except Exception:
                pass

        # 3. Daily report at 23:59 ─────────────────────────────────────────────
        if h == 23 and m == 59 and not sent["report"]:
            _daily_report(tasks)
            sent["report"] = True

    except Exception as exc:
        print(f"[push_service] tick error: {exc}")
    finally:
        db.close()


# ─── Lifecycle ────────────────────────────────────────────────────────────────

def start_push_service() -> None:
    global scheduler
    if scheduler and scheduler.running:
        return

    if not ONESIGNAL_APP_ID or not ONESIGNAL_API_KEY:
        print("[push_service] ONESIGNAL_APP_ID / ONESIGNAL_API_KEY not set — push disabled.")
        return

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        _tick,
        trigger=CronTrigger(second=0),   # top of every minute
        id="push_tick",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=45,
    )
    scheduler.start()
    print(
        f"[push_service] Started — polling every 60 s, "
        f"TZ offset: {TZ_OFFSET_MINUTES} min "
        f"({'UTC+' if TZ_OFFSET_MINUTES >= 0 else 'UTC'}"
        f"{TZ_OFFSET_MINUTES // 60}:{abs(TZ_OFFSET_MINUTES) % 60:02d})"
    )


def stop_push_service() -> None:
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None
        print("[push_service] Stopped")
