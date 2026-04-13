from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean,
    ForeignKey, Index, SmallInteger, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    scheduled_date = Column(String, nullable=False)  # YYYY-MM-DD
    scheduled_time = Column(String, nullable=False)  # HH:MM
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reminder_sent = Column(Boolean, default=False)  # legacy – kept for compatibility

    # Relationship to reminders (cascade delete when task is deleted)
    reminders = relationship(
        "TaskReminder",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    @property
    def is_missed(self):
        if self.is_completed:
            return False
        try:
            task_date = datetime.strptime(self.scheduled_date, "%Y-%m-%d").date()
            return task_date < datetime.now().date()
        except ValueError:
            return False


class TaskReminder(Base):
    """
    One row = one reminder configuration for one task.

    reminder_type:
        "exact"     – fire at task's scheduled datetime
        "before"    – fire `before_minutes` minutes before scheduled datetime
        "missed"    – fire at 09:00 the day after the task was due (once per day)

    recurrence:
        None / ""   – one-shot
        "daily"     – repeat every day at the same time offset
        "weekly"    – repeat every 7 days
        "weekdays"  – repeat Mon-Fri only
        "custom"    – repeat on days listed in `recurrence_days`
                      (comma-separated 0=Mon … 6=Sun)

    State machine:
        pending   → due             (scheduler marks it)
        due       → acknowledged    (frontend ACKs after showing notification)
        due       → snoozed         (frontend snoozes; scheduler re-queues)
        snoozed   → due             (scheduler reactivates after snooze_until passes)
    """

    __tablename__ = "task_reminders"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    # ── Configuration (set at creation time, never mutated) ──────────────────
    reminder_type = Column(String, nullable=False, default="exact")
    # minutes before scheduled_time to fire (0 for "exact", ignored for "missed")
    before_minutes = Column(SmallInteger, nullable=False, default=0)
    recurrence = Column(String, nullable=True)       # see docstring
    recurrence_days = Column(String, nullable=True)  # e.g. "0,2,4" = Mon,Wed,Fri

    # ── State ─────────────────────────────────────────────────────────────────
    # "pending" | "due" | "acknowledged" | "snoozed"
    status = Column(String, nullable=False, default="pending")

    # UTC datetime when this reminder should next fire into "due" state
    next_fire_at = Column(DateTime, nullable=True, index=True)

    # UTC datetime the user chose to snooze until (NULL unless snoozed)
    snooze_until = Column(DateTime, nullable=True)

    # How many times this reminder has already fired (for recurrences)
    fire_count = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    fired_at = Column(DateTime, nullable=True)       # last time it became "due"
    acknowledged_at = Column(DateTime, nullable=True)

    # ── Relationship ─────────────────────────────────────────────────────────
    task = relationship("Task", back_populates="reminders")

    # ── Indexes ──────────────────────────────────────────────────────────────
    # Scheduler only needs to scan rows that may fire soon:
    __table_args__ = (
        Index(
            "ix_task_reminders_poll",
            "status",
            "next_fire_at",
        ),
    )


# ─── Roadmap models ────────────────────────────────────────────────────────────

class Roadmap(Base):
    """
    Top-level roadmap entity.

    period_type: "week" | "month"
        Determines the granularity of each slot inside the roadmap.
    total_periods: number of weeks or months in this roadmap.
    """
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    period_type = Column(String, nullable=False, default="month")  # "week" | "month"
    total_periods = Column(Integer, nullable=False, default=4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    periods = relationship(
        "RoadmapPeriod",
        back_populates="roadmap",
        cascade="all, delete-orphan",
        lazy="select",
    )


class RoadmapPeriod(Base):
    """
    A single slot (week N / month N) inside a roadmap.
    period_index is 0-based.
    """
    __tablename__ = "roadmap_periods"

    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    period_index = Column(Integer, nullable=False)   # 0-based slot number
    label = Column(String, nullable=True)            # e.g. "Month 1: Foundations"
    topics = Column(Text, nullable=True)             # Free-form markdown / plain text
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="periods")
    resources = relationship(
        "PeriodResource",
        back_populates="period",
        cascade="all, delete-orphan",
        lazy="select",
    )


class PeriodResource(Base):
    """
    A URL/link resource attached to a RoadmapPeriod.
    """
    __tablename__ = "period_resources"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("roadmap_periods.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    period = relationship("RoadmapPeriod", back_populates="resources")
