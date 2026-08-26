from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, date
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.planner import StudyGoal, PlannerTask, StudySession, PointRecord
from app.schemas.planner import (
    GoalCreate, GoalUpdate, GoalResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    SessionCreate, SessionResponse,
    PlannerStats
)
from app.services.points_service import award_points, get_user_total_points
from app.services.activity_service import log_activity

router = APIRouter()

# --- GOALS ENDPOINTS ---
@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new study goal (daily or weekly)."""
    goal = StudyGoal(
        user_id=current_user.id,
        title=goal_in.title.strip(),
        description=goal_in.description.strip() if goal_in.description else None,
        goal_type=goal_in.goal_type.lower(),
        target_value=goal_in.target_value,
        due_date=goal_in.due_date
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Log activity for analytics
    log_activity(db, current_user.id, "create_goal", related_entity_id=goal.id, metadata={"title": goal.title, "type": goal.goal_type})

    return goal

@router.get("/goals", response_model=List[GoalResponse])
def get_goals(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="goal_type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all study goals for current user."""
    query = db.query(StudyGoal).filter(StudyGoal.user_id == current_user.id)
    if status_filter:
        query = query.filter(StudyGoal.status == status_filter.lower())
    if type_filter:
        query = query.filter(StudyGoal.goal_type == type_filter.lower())
    
    return query.order_by(StudyGoal.created_at.desc()).all()

@router.put("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_in: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update goal details."""
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id, StudyGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study goal not found.")

    if goal_in.title is not None:
        goal.title = goal_in.title.strip()
    if goal_in.description is not None:
        goal.description = goal_in.description.strip()
    if goal_in.goal_type is not None:
        goal.goal_type = goal_in.goal_type.lower()
    if goal_in.target_value is not None:
        goal.target_value = goal_in.target_value
    if goal_in.completed_value is not None:
        goal.completed_value = goal_in.completed_value
    if goal_in.due_date is not None:
        goal.due_date = goal_in.due_date

    db.commit()
    db.refresh(goal)
    return goal

@router.post("/goals/{goal_id}/complete", response_model=GoalResponse)
def complete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a goal as completed and award points (preventing duplicate points)."""
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id, StudyGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study goal not found.")

    if goal.status != "completed":
        goal.status = "completed"
        goal.completed_value = goal.target_value
        goal.completed_at = datetime.now(timezone.utc)
        db.commit()

        # Award points based on daily (+10) or weekly (+30) goal type
        act_type = "complete_weekly_goal" if goal.goal_type == "weekly" else "complete_daily_goal"
        pts = 30 if goal.goal_type == "weekly" else 10
        award_points(
            db=db,
            user_id=current_user.id,
            activity_type=act_type,
            points=pts,
            related_entity_id=goal.id,
            metadata={"title": goal.title, "goal_type": goal.goal_type}
        )

    db.refresh(goal)
    return goal

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a study goal."""
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id, StudyGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study goal not found.")

    db.delete(goal)
    db.commit()
    return None

# --- TASKS ENDPOINTS ---
@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new planner task."""
    task = PlannerTask(
        user_id=current_user.id,
        title=task_in.title.strip(),
        description=task_in.description.strip() if task_in.description else None,
        priority=task_in.priority.lower(),
        due_date=task_in.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Log activity for analytics
    log_activity(db, current_user.id, "create_task", related_entity_id=task.id, metadata={"title": task.title, "priority": task.priority})

    return task

@router.get("/tasks", response_model=List[TaskResponse])
def get_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all planner tasks for current user."""
    query = db.query(PlannerTask).filter(PlannerTask.user_id == current_user.id)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(PlannerTask.status == status_filter.lower())
    
    return query.order_by(PlannerTask.created_at.desc()).all()

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update task details."""
    task = db.query(PlannerTask).filter(PlannerTask.id == task_id, PlannerTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner task not found.")

    if task_in.title is not None:
        task.title = task_in.title.strip()
    if task_in.description is not None:
        task.description = task_in.description.strip()
    if task_in.priority is not None:
        task.priority = task_in.priority.lower()
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.status is not None:
        task.status = task_in.status.lower()

    db.commit()
    db.refresh(task)
    return task

@router.post("/tasks/{task_id}/complete", response_model=TaskResponse)
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark task as completed and award +5 points (preventing duplicate points)."""
    task = db.query(PlannerTask).filter(PlannerTask.id == task_id, PlannerTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner task not found.")

    if task.status != "completed":
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)
        db.commit()

        award_points(
            db=db,
            user_id=current_user.id,
            activity_type="complete_task",
            points=5,
            related_entity_id=task.id,
            metadata={"title": task.title}
        )

    db.refresh(task)
    return task

@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a planner task."""
    task = db.query(PlannerTask).filter(PlannerTask.id == task_id, PlannerTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner task not found.")

    db.delete(task)
    db.commit()
    return None

# --- STUDY SESSIONS ENDPOINTS ---
@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def record_study_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a study session and award +10 points."""
    sess_date = session_in.session_date or date.today()
    session = StudySession(
        user_id=current_user.id,
        subject=session_in.subject.strip(),
        duration_minutes=session_in.duration_minutes,
        session_date=sess_date,
        notes=session_in.notes.strip() if session_in.notes else None
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Award points & log activity
    award_points(
        db=db,
        user_id=current_user.id,
        activity_type="record_study_session",
        points=10,
        related_entity_id=session.id,
        metadata={"subject": session.subject, "duration": session.duration_minutes}
    )

    return session

@router.get("/sessions", response_model=List[SessionResponse])
def get_study_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recorded study sessions for current user."""
    return db.query(StudySession).filter(
        StudySession.user_id == current_user.id
    ).order_by(StudySession.created_at.desc()).all()

# --- STATS ENDPOINT ---
@router.get("/stats", response_model=PlannerStats)
def get_planner_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve aggregate progress and points stats for authenticated student."""
    uid = current_user.id

    # Goals stats
    todays_goals_total = db.query(StudyGoal).filter(StudyGoal.user_id == uid, StudyGoal.goal_type == "daily").count()
    todays_goals_comp = db.query(StudyGoal).filter(StudyGoal.user_id == uid, StudyGoal.goal_type == "daily", StudyGoal.status == "completed").count()

    weekly_goals_total = db.query(StudyGoal).filter(StudyGoal.user_id == uid, StudyGoal.goal_type == "weekly").count()
    weekly_goals_comp = db.query(StudyGoal).filter(StudyGoal.user_id == uid, StudyGoal.goal_type == "weekly", StudyGoal.status == "completed").count()

    # Tasks stats
    pending_tasks = db.query(PlannerTask).filter(PlannerTask.user_id == uid, PlannerTask.status == "pending").count()
    comp_tasks = db.query(PlannerTask).filter(PlannerTask.user_id == uid, PlannerTask.status == "completed").count()
    total_tasks = pending_tasks + comp_tasks
    task_completion_pct = round((comp_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    # Sessions & Study Duration
    total_minutes = db.query(func.sum(StudySession.duration_minutes)).filter(StudySession.user_id == uid).scalar() or 0
    total_study_hours = round(total_minutes / 60.0, 1)
    total_sessions_count = db.query(StudySession).filter(StudySession.user_id == uid).count()

    # Total points from PointRecord
    total_points = get_user_total_points(db, uid)

    return PlannerStats(
        todays_goals_completed=todays_goals_comp,
        todays_goals_total=todays_goals_total,
        weekly_goals_completed=weekly_goals_comp,
        weekly_goals_total=weekly_goals_total,
        pending_tasks_count=pending_tasks,
        completed_tasks_count=comp_tasks,
        task_completion_pct=task_completion_pct,
        total_study_hours=total_study_hours,
        total_study_sessions_count=total_sessions_count,
        total_points=total_points
    )
