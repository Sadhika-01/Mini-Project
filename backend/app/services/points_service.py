import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.planner import PointRecord
from app.services.activity_service import log_activity

logger = logging.getLogger(__name__)

# Transparent Points Allocation Table
POINT_VALUES = {
    "complete_daily_goal": 10,
    "complete_weekly_goal": 30,
    "complete_task": 5,
    "record_study_session": 10,
    "complete_quiz": 10,
    "high_quiz_score": 15,
    "upload_resource": 10,
    "answer_doubt": 10,
    "attend_group_meeting": 10,
}

def award_points(
    db: Session,
    user_id: int,
    activity_type: str,
    points: Optional[int] = None,
    related_entity_id: Optional[int] = None,
    metadata: Optional[dict] = None
) -> Optional[PointRecord]:
    """
    Award points to a student for completing a learning activity.
    ENFORCES AT-MOST-ONCE POINT AWARDING:
    Checks if points were already awarded for the same (user_id, activity_type, related_entity_id).
    """
    try:
        points_to_award = points if points is not None else POINT_VALUES.get(activity_type, 10)

        if related_entity_id is not None:
            existing = db.query(PointRecord).filter(
                PointRecord.user_id == user_id,
                PointRecord.activity_type == activity_type,
                PointRecord.related_entity_id == related_entity_id
            ).first()

            if existing:
                logger.info(f"Points already awarded for user {user_id}, {activity_type}, entity {related_entity_id}.")
                return existing

        record = PointRecord(
            user_id=user_id,
            activity_type=activity_type,
            points=points_to_award,
            related_entity_id=related_entity_id
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # Log for Learning Analytics
        log_activity(
            db=db,
            user_id=user_id,
            activity_type=activity_type,
            related_entity_id=related_entity_id,
            metadata=metadata or {"points_awarded": points_to_award}
        )

        return record

    except Exception as e:
        logger.error(f"Failed to award points ({activity_type}) to user {user_id}: {e}")
        db.rollback()
        return None

def get_user_total_points(db: Session, user_id: int) -> int:
    """Calculate total accumulated points for a user from PointRecord table."""
    total = db.query(func.sum(PointRecord.points)).filter(PointRecord.user_id == user_id).scalar()
    return int(total) if total else 0
