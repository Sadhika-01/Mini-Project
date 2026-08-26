from sqlalchemy.orm import Session
from sqlalchemy import cast, Date, func
from typing import Optional, List, Dict, Any
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.activity_log import ActivityLog
from app.models.planner import PointRecord
from app.schemas.leaderboard import LeaderboardEntry, LeaderboardResponse
from app.services.points_service import get_user_total_points

XP_VALUES = {
    "register": 50,
    "create_group": 30,
    "join_group": 20,
    "upload_resource": 30,
    "download_resource": 5,
    "ai_explain_doubt": 15,
    "ai_improve_answer": 20,
    "ai_generate_summary": 25,
    "login": 10,
}

def calculate_leaderboard(
    db: Session,
    current_user_id: int,
    group_id: Optional[int] = None
) -> LeaderboardResponse:
    """
    Calculate gamified leaderboard rankings combining PointRecord rewards and activity logs.
    Supports filtering by study group.
    """
    if group_id:
        target_group = db.query(Group).filter(Group.id == group_id).first()
        group_name = target_group.name if target_group else "Group"
        memberships = db.query(GroupMember.user_id).filter(GroupMember.group_id == group_id).all()
        user_ids = [m.user_id for m in memberships]
        users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    else:
        group_name = "All Groups"
        users = db.query(User).all()

    user_entries = []
    for u in users:
        # Sum from PointRecord
        planner_points = db.query(func.sum(PointRecord.points)).filter(PointRecord.user_id == u.id).scalar() or 0

        # Sum from ActivityLog
        logs = db.query(ActivityLog).filter(ActivityLog.user_id == u.id).all()
        log_points = 0
        resources_count = 0
        ai_count = 0

        for log in logs:
            log_points += XP_VALUES.get(log.activity_type, 10)
            if log.activity_type == "upload_resource":
                resources_count += 1
            elif log.activity_type.startswith("ai_"):
                ai_count += 1

        total_xp = int(planner_points) + log_points

        active_days = len(
            db.query(cast(ActivityLog.created_at, Date)).filter(ActivityLog.user_id == u.id).distinct().all()
        )
        groups_count = db.query(GroupMember).filter(GroupMember.user_id == u.id).count()

        achievements = []
        if total_xp >= 100:
            achievements.append("⚡ Active Scholar")
        if resources_count >= 1:
            achievements.append("📚 Resource Master")
        if ai_count >= 1:
            achievements.append("🤖 AI Explorer")
        if groups_count >= 1:
            achievements.append("👥 Team Collaborator")

        if not achievements:
            achievements.append("🌱 New Learner")

        user_entries.append({
            "user_id": u.id,
            "name": u.name,
            "email": u.email,
            "total_xp": total_xp,
            "active_days": active_days,
            "resources_count": resources_count,
            "groups_count": groups_count,
            "achievements": achievements,
            "is_current_user": (u.id == current_user_id)
        })

    user_entries.sort(key=lambda x: x["total_xp"], reverse=True)

    rankings = []
    for rank, entry in enumerate(user_entries, start=1):
        rankings.append(LeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            name=entry["name"],
            email=entry["email"],
            total_xp=entry["total_xp"],
            active_days=entry["active_days"],
            resources_count=entry["resources_count"],
            groups_count=entry["groups_count"],
            achievements=entry["achievements"],
            is_current_user=entry["is_current_user"]
        ))

    return LeaderboardResponse(
        filter_group_id=group_id,
        filter_group_name=group_name,
        rankings=rankings
    )
