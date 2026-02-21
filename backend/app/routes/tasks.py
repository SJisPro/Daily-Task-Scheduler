from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from .. import schemas, models
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

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

class BatchDeleteRequest(BaseModel):
    task_ids: List[int]

@router.post("/batch-delete", status_code=200)
def batch_delete_tasks(request: BatchDeleteRequest, db: Session = Depends(get_db)):
    """Delete multiple tasks by their IDs"""
    if not request.task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")
    
    # Find all tasks with the given IDs
    tasks_to_delete = db.query(models.Task).filter(models.Task.id.in_(request.task_ids)).all()
    
    if not tasks_to_delete:
        raise HTTPException(status_code=404, detail="No tasks found with the provided IDs")
    
    deleted_count = len(tasks_to_delete)
    deleted_ids = [task.id for task in tasks_to_delete]
    
    # Delete all tasks
    for task in tasks_to_delete:
        db.delete(task)
    
    db.commit()
    
    return {
        "message": f"Successfully deleted {deleted_count} task(s)",
        "deleted_count": deleted_count,
        "deleted_ids": deleted_ids
    }

@router.delete("/date/{date}", status_code=200)
def delete_tasks_by_date(date: str, db: Session = Depends(get_db)):
    """Delete all tasks for a specific date"""
    try:
        # Validate date format
        datetime.strptime(date, "%Y-%m-%d")
        
        # Find all tasks for the date
        tasks_to_delete = db.query(models.Task).filter(models.Task.scheduled_date == date).all()
        
        if not tasks_to_delete:
            return {
                "message": "No tasks found for the specified date",
                "deleted_count": 0,
                "deleted_ids": []
            }
        
        deleted_count = len(tasks_to_delete)
        deleted_ids = [task.id for task in tasks_to_delete]
        
        # Delete all tasks
        for task in tasks_to_delete:
            db.delete(task)
        
        db.commit()
        
        return {
            "message": f"Successfully deleted {deleted_count} task(s) for {date}",
            "deleted_count": deleted_count,
            "deleted_ids": deleted_ids
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@router.delete("/week/{start_date}", status_code=200)
def delete_tasks_by_week(start_date: str, db: Session = Depends(get_db)):
    """Delete all tasks for a week starting from start_date"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = start + timedelta(days=6)
        
        # Find all tasks in the week range
        tasks_to_delete = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end.strftime("%Y-%m-%d")
        ).all()
        
        if not tasks_to_delete:
            return {
                "message": "No tasks found for the specified week",
                "deleted_count": 0,
                "deleted_ids": []
            }
        
        deleted_count = len(tasks_to_delete)
        deleted_ids = [task.id for task in tasks_to_delete]
        
        # Delete all tasks
        for task in tasks_to_delete:
            db.delete(task)
        
        db.commit()
        
        return {
            "message": f"Successfully deleted {deleted_count} task(s) for the week",
            "deleted_count": deleted_count,
            "deleted_ids": deleted_ids
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@router.delete("/month/{year}/{month}", status_code=200)
def delete_tasks_by_month(year: int, month: int, db: Session = Depends(get_db)):
    """Delete all tasks for a specific month"""
    try:
        # Get first and last day of month
        if month == 12:
            next_month = 1
            next_year = year + 1
        else:
            next_month = month + 1
            next_year = year
        
        start_date = f"{year}-{month:02d}-01"
        # Get last day of month
        last_day = (datetime(next_year, next_month, 1) - timedelta(days=1)).day
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        
        # Find all tasks in the month range
        tasks_to_delete = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end_date
        ).all()
        
        if not tasks_to_delete:
            return {
                "message": "No tasks found for the specified month",
                "deleted_count": 0,
                "deleted_ids": []
            }
        
        deleted_count = len(tasks_to_delete)
        deleted_ids = [task.id for task in tasks_to_delete]
        
        # Delete all tasks
        for task in tasks_to_delete:
            db.delete(task)
        
        db.commit()
        
        return {
            "message": f"Successfully deleted {deleted_count} task(s) for the month",
            "deleted_count": deleted_count,
            "deleted_ids": deleted_ids
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date: {str(e)}")

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
        # Get first and last day of month
        if month == 12:
            next_month = 1
            next_year = year + 1
        else:
            next_month = month + 1
            next_year = year
        
        start_date = f"{year}-{month:02d}-01"
        # Get last day of month
        last_day = (datetime(next_year, next_month, 1) - timedelta(days=1)).day
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        
        tasks = db.query(models.Task).filter(
            models.Task.scheduled_date >= start_date,
            models.Task.scheduled_date <= end_date
        ).order_by(models.Task.scheduled_date, models.Task.scheduled_time).all()
        
        return tasks
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date: {str(e)}")

@router.post("/duplicate", response_model=List[schemas.TaskResponse], status_code=201)
def duplicate_tasks(
    source_date: str = Query(..., description="Source date in YYYY-MM-DD format"),
    target_type: str = Query(..., description="Target type: 'weekdays', 'weekend', 'week', or 'month'"),
    db: Session = Depends(get_db)
):
    """Duplicate all tasks from a source date to weekdays, weekend, whole week, or month"""
    try:
        # Parse source date
        source = datetime.strptime(source_date, "%Y-%m-%d").date()

        # Get all tasks from source date
        source_tasks = db.query(models.Task).filter(
            models.Task.scheduled_date == source_date
        ).all()

        if not source_tasks:
            raise HTTPException(status_code=404, detail="No tasks found for the source date")

        # Determine target dates
        target_dates = []
        if target_type == "weekdays":
            # Copy to Monday–Friday of the source's calendar week (exclude source date itself)
            monday = source - timedelta(days=source.weekday())  # weekday(): 0=Mon, 6=Sun
            for i in range(5):  # Mon(0) to Fri(4)
                d = monday + timedelta(days=i)
                if d != source:
                    target_dates.append(d.strftime("%Y-%m-%d"))
        elif target_type == "weekend":
            # Copy to Saturday and Sunday of the source's calendar week (exclude source itself)
            monday = source - timedelta(days=source.weekday())
            for i in range(5, 7):  # Sat(5), Sun(6)
                d = monday + timedelta(days=i)
                if d != source:
                    target_dates.append(d.strftime("%Y-%m-%d"))
        elif target_type == "week":
            # Copy to all 7 days of the source's calendar week (exclude source itself)
            monday = source - timedelta(days=source.weekday())
            for i in range(7):
                d = monday + timedelta(days=i)
                if d != source:
                    target_dates.append(d.strftime("%Y-%m-%d"))
        elif target_type == "month":
            # Duplicate for the next 30 days (rolling month)
            for i in range(1, 31):
                target_date = source + timedelta(days=i)
                target_dates.append(target_date.strftime("%Y-%m-%d"))
        else:
            raise HTTPException(
                status_code=400,
                detail="target_type must be 'weekdays', 'weekend', 'week', or 'month'"
            )

        if not target_dates:
            raise HTTPException(
                status_code=400,
                detail="No valid target dates found. The source date may already be the only day in the target range."
            )

        # Duplicate tasks for each target date
        created_tasks = []
        for target_date in target_dates:
            for source_task in source_tasks:
                new_task = models.Task(
                    title=source_task.title,
                    description=source_task.description,
                    scheduled_date=target_date,
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

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error duplicating tasks: {str(e)}")
