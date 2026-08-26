from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.leaderboard import LeaderboardResponse
from app.services.leaderboard_service import calculate_leaderboard

router = APIRouter()

@router.get("/", response_model=LeaderboardResponse)
def get_leaderboard(
    group_id: Optional[int] = Query(None, description="Optional study group ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve gamified student leaderboard rankings and achievement badges."""
    return calculate_leaderboard(db, current_user.id, group_id=group_id)
