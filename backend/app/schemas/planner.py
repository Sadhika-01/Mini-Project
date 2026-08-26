from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional, List

# Goal Schemas
class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    goal_type: str = Field("daily", description="daily or weekly")
    target_value: int = Field(1, ge=1)
    due_date: Optional[datetime] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal_type: Optional[str] = None
    target_value: Optional[int] = None
    completed_value: Optional[int] = None
    due_date: Optional[datetime] = None

class GoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    goal_type: str
    target_value: int
    completed_value: int
    due_date: Optional[datetime] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Task Schemas
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: str = Field("medium", description="low, medium, high")
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    priority: str
    due_date: Optional[datetime] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Study Session Schemas
class SessionCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    duration_minutes: int = Field(..., ge=1)
    session_date: Optional[date] = None
    notes: Optional[str] = None

class SessionResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    duration_minutes: int
    session_date: date
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Planner Stats
class PlannerStats(BaseModel):
    todays_goals_completed: int
    todays_goals_total: int
    weekly_goals_completed: int
    weekly_goals_total: int
    pending_tasks_count: int
    completed_tasks_count: int
    task_completion_pct: float
    total_study_hours: float
    total_study_sessions_count: int
    total_points: int
