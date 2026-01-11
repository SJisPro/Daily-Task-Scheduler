from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from .database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    scheduled_date = Column(String, nullable=False)  # YYYY-MM-DD format
    scheduled_time = Column(String, nullable=False)   # HH:MM format
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reminder_sent = Column(Boolean, default=False)

    @property
    def is_missed(self):
        if self.is_completed:
            return False
        
        # Parse scheduled date
        try:
            task_date = datetime.strptime(self.scheduled_date, "%Y-%m-%d").date()
            today = datetime.now().date()
            return task_date < today
        except ValueError:
            return False


