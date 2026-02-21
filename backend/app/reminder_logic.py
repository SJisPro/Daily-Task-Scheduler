"""
reminder_logic.py – Pure, side-effect-free functions for computing
next_fire_at and deciding whether a reminder is due.

Kept separate from the scheduler so it can be unit-tested independently.
All datetimes are UTC-naive (we store UTC, offset supplied by client).
"""

from datetime import datetime, timedelta
from typing import Optional


# ─── Constants ────────────────────────────────────────────────────────────────

SNOOZE_OPTIONS_MINUTES = {5, 10, 30, 60}
BEFORE_OPTIONS_MINUTES = {0, 5, 10, 15, 30, 60}
MISSED_REMINDER_HOUR_LOCAL = 9  # 09:00 in user's local time → converted to UTC by caller


# ─── Helpers ──────────────────────────────────────────────────────────────────

def task_scheduled_utc(scheduled_date: str, scheduled_time: str,
                       tz_offset_minutes: int = 0) -> datetime:
    """
    Convert a task's stored date+time strings (local) to a UTC datetime.

    scheduled_date : "YYYY-MM-DD"
    scheduled_time : "HH:MM"
    tz_offset_minutes : user's UTC offset in minutes, e.g. +330 for IST (UTC+5:30)

    Returns a naive UTC datetime.
    """
    local_dt = datetime.strptime(f"{scheduled_date} {scheduled_time}", "%Y-%m-%d %H:%M")
    return local_dt - timedelta(minutes=tz_offset_minutes)


def compute_next_fire_at(
    reminder_type: str,
    scheduled_date: str,
    scheduled_time: str,
    before_minutes: int = 0,
    tz_offset_minutes: int = 0,
    recurrence: Optional[str] = None,
    recurrence_days: Optional[str] = None,
    last_fired_at: Optional[datetime] = None,
) -> Optional[datetime]:
    """
    Compute (in UTC) when this reminder should next fire.

    Returns None if the reminder has no future fire time (e.g. one-shot already past).
    """
    now_utc = datetime.utcnow()

    if reminder_type == "missed":
        # Fire at 09:00 local *tomorrow* relative to now, converted to UTC.
        # We check again each night; if a task is still missed tomorrow we let
        # the scheduler skip it (status stays "acknowledged" from the previous day).
        tomorrow_local_9am = (
            (now_utc + timedelta(minutes=tz_offset_minutes))
            .replace(hour=MISSED_REMINDER_HOUR_LOCAL, minute=0, second=0, microsecond=0)
        )
        # If it's already past 09:00 local today, schedule for tomorrow
        today_9am_utc = tomorrow_local_9am - timedelta(minutes=tz_offset_minutes)
        if now_utc >= today_9am_utc:
            tomorrow_local_9am += timedelta(days=1)
        return tomorrow_local_9am - timedelta(minutes=tz_offset_minutes)

    # --- "exact" or "before" ---
    base_utc = task_scheduled_utc(scheduled_date, scheduled_time, tz_offset_minutes)
    fire_utc = base_utc - timedelta(minutes=before_minutes)

    if not recurrence:
        # One-shot: only valid if it's in the future
        return fire_utc if fire_utc > now_utc else None

    # --- Recurring ---
    if last_fired_at is None:
        # First fire
        if fire_utc > now_utc:
            return fire_utc
        # Already passed the first slot; fall through to next recurrence

    # Advance from the last_fired_at (or fire_utc if never fired) by the
    # recurrence interval until we find a slot in the future.
    cursor = last_fired_at if last_fired_at else fire_utc

    if recurrence == "daily":
        step = timedelta(days=1)
        while cursor <= now_utc:
            cursor += step
        return cursor

    if recurrence == "weekly":
        step = timedelta(weeks=1)
        while cursor <= now_utc:
            cursor += step
        return cursor

    if recurrence == "weekdays":
        # Advance day by day; only land on Mon-Fri
        cursor += timedelta(days=1)
        for _ in range(14):  # safety cap
            if cursor.weekday() < 5 and cursor > now_utc:
                return cursor
            cursor += timedelta(days=1)
        return None

    if recurrence == "custom" and recurrence_days:
        allowed = {int(d) for d in recurrence_days.split(",") if d.strip()}
        cursor += timedelta(days=1)
        for _ in range(14):
            if cursor.weekday() in allowed and cursor > now_utc:
                return cursor
            cursor += timedelta(days=1)
        return None

    return None


def is_due(next_fire_at: Optional[datetime], tolerance_seconds: int = 90) -> bool:
    """
    A reminder is 'due' when next_fire_at is within [now - tolerance, now + 30s].
    The tolerance window prevents missed fires from fast/slow scheduler ticks.
    """
    if next_fire_at is None:
        return False
    now = datetime.utcnow()
    return (now - timedelta(seconds=tolerance_seconds)) <= next_fire_at <= (now + timedelta(seconds=30))
