from fastapi import APIRouter, status
from app.core.database import check_database_health
from app.core.config import settings

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Health check endpoint to verify backend and database status."""
    db_status = "connected" if check_database_health() else "disconnected"
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "database": db_status
    }
