from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview
from app.services.analytics_service import calculate_user_analytics

router = APIRouter()

@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve calculated learning analytics and raw activity breakdown for authenticated student."""
    return calculate_user_analytics(db, current_user.id)
