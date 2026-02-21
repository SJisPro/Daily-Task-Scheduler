from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
from .reminder_logic import BEFORE_OPTIONS_MINUTES, SNOOZE_OPTIONS_MINUTES


# ─── Task schemas (unchanged) ─────────────────────────────────────────────────

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_date: str   # YYYY-MM-DD
    scheduled_time: str   # HH:MM


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    is_completed: Optional[bool] = None


class TaskResponse(TaskBase):
    id: int
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    reminder_sent: bool
    is_missed: bool

    class Config:
        from_attributes = True


# ─── Reminder schemas ─────────────────────────────────────────────────────────

VALID_REMINDER_TYPES = {"exact", "before", "missed"}
VALID_RECURRENCES = {None, "", "daily", "weekly", "weekdays", "custom"}
VALID_STATUSES = {"pending", "due", "acknowledged", "snoozed"}


class ReminderCreate(BaseModel):
    """
    Body for POST /api/reminders/

    Examples
    --------
    Exact-time, one-shot:
        { "task_id": 1, "reminder_type": "exact" }

    15 minutes before, repeat every weekday:
        { "task_id": 1, "reminder_type": "before", "before_minutes": 15,
          "recurrence": "weekdays" }

    Custom days (Mon, Wed, Fri):
        { "task_id": 1, "reminder_type": "before", "before_minutes": 10,
          "recurrence": "custom", "recurrence_days": "0,2,4" }

    tz_offset_minutes: caller's UTC offset in MINUTES, so IST = +330.
    """
    task_id: int
    reminder_type: str = "exact"
    before_minutes: int = 0
    recurrence: Optional[str] = None
    recurrence_days: Optional[str] = None   # "0,2,4" → Mon, Wed, Fri
    tz_offset_minutes: int = 0              # user timezone offset

    @field_validator("reminder_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_REMINDER_TYPES:
            raise ValueError(f"reminder_type must be one of {VALID_REMINDER_TYPES}")
        return v

    @field_validator("before_minutes")
    @classmethod
    def validate_before(cls, v: int) -> int:
        if v not in BEFORE_OPTIONS_MINUTES:
            raise ValueError(f"before_minutes must be one of {BEFORE_OPTIONS_MINUTES}")
        return v

    @field_validator("recurrence")
    @classmethod
    def validate_recurrence(cls, v: Optional[str]) -> Optional[str]:
        if v not in VALID_RECURRENCES:
            raise ValueError(f"recurrence must be one of {VALID_RECURRENCES}")
        return v or None

    @field_validator("tz_offset_minutes")
    @classmethod
    def validate_tz(cls, v: int) -> int:
        if not (-720 <= v <= 840):
            raise ValueError("tz_offset_minutes must be between -720 and 840")
        return v


class ReminderResponse(BaseModel):
    id: int
    task_id: int
    reminder_type: str
    before_minutes: int
    recurrence: Optional[str]
    recurrence_days: Optional[str]
    status: str
    next_fire_at: Optional[datetime]
    snooze_until: Optional[datetime]
    fire_count: int
    created_at: datetime
    fired_at: Optional[datetime]
    acknowledged_at: Optional[datetime]

    # Inlined task info so the frontend can build the notification without
    # a second API call
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    task_scheduled_date: Optional[str] = None
    task_scheduled_time: Optional[str] = None

    class Config:
        from_attributes = True


class SnoozeRequest(BaseModel):
    snooze_minutes: int

    @field_validator("snooze_minutes")
    @classmethod
    def validate_snooze(cls, v: int) -> int:
        if v not in SNOOZE_OPTIONS_MINUTES:
            raise ValueError(f"snooze_minutes must be one of {SNOOZE_OPTIONS_MINUTES}")
        return v


class DueRemindersResponse(BaseModel):
    reminders: List[ReminderResponse]
    server_utc: str   # ISO string so client can detect clock skew
