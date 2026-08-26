import json
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)

def log_activity(
    db: Session,
    user_id: int,
    activity_type: str,
    related_entity_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[ActivityLog]:
    """
    Record a student activity log entry in PostgreSQL.
    Safe helper that catches exceptions to prevent business logic failure.
    """
    try:
        meta_str = json.dumps(metadata) if metadata else None
        log_entry = ActivityLog(
            user_id=user_id,
            activity_type=activity_type,
            related_entity_id=related_entity_id,
            metadata_json=meta_str
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        logger.error(f"Failed to record activity log ({activity_type}) for user {user_id}: {e}")
        db.rollback()
        return None

def get_user_activity_logs(
    db: Session,
    user_id: int,
    limit: int = 50
) -> List[ActivityLog]:
    """Retrieve recent activity logs for a specific user."""
    return db.query(ActivityLog).filter(
        ActivityLog.user_id == user_id
    ).order_by(ActivityLog.created_at.desc()).limit(limit).all()
