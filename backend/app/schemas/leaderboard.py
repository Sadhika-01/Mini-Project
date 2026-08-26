from pydantic import BaseModel
from typing import List, Optional

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    email: str
    total_xp: int
    active_days: int
    resources_count: int
    groups_count: int
    achievements: List[str]
    is_current_user: bool = False

    class Config:
        from_attributes = True

class LeaderboardResponse(BaseModel):
    filter_group_id: Optional[int] = None
    filter_group_name: Optional[str] = "All Groups"
    rankings: List[LeaderboardEntry]
