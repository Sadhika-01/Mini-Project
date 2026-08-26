from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class ActivityLogResponse(BaseModel):
    id: int
    activity_type: str
    related_entity_id: Optional[int] = None
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WeeklyTrendItem(BaseModel):
    date_str: str
    day_name: str
    activity_count: int

class AnalyticsOverview(BaseModel):
    total_active_days: int
    total_activities: int
    resource_uploads_count: int
    resource_downloads_count: int
    group_memberships_count: int
    ai_interactions_count: int
    estimated_study_hours: float
    quiz_accuracy_pct: float
    goal_completion_pct: float
    weekly_trend: List[WeeklyTrendItem]
    activity_breakdown: Dict[str, int]
    recent_activities: List[ActivityLogResponse]
