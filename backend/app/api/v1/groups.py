from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.schemas.group import GroupCreate, GroupResponse, GroupDetailResponse, GroupMemberResponse
from app.services.activity_service import log_activity

router = APIRouter()

@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new study group and auto-add creator as first member."""
    group = Group(
        name=group_in.name.strip(),
        description=group_in.description.strip() if group_in.description else None,
        created_by=current_user.id
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Add creator as group member
    membership = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(membership)
    db.commit()

    # Log group creation activity
    log_activity(db, current_user.id, "create_group", related_entity_id=group.id, metadata={"name": group.name})

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        creator_name=current_user.name,
        created_at=group.created_at,
        member_count=1,
        is_member=True
    )

@router.get("/", response_model=List[GroupResponse])
def list_all_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all available study groups in the platform."""
    groups = db.query(Group).order_by(Group.created_at.desc()).all()
    user_memberships = {
        m.group_id for m in db.query(GroupMember.group_id).filter(GroupMember.user_id == current_user.id).all()
    }

    result = []
    for g in groups:
        count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        creator = db.query(User).filter(User.id == g.created_by).first()
        result.append(GroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            created_by=g.created_by,
            creator_name=creator.name if creator else "Unknown",
            created_at=g.created_at,
            member_count=count,
            is_member=(g.id in user_memberships)
        ))
    return result

@router.get("/my", response_model=List[GroupResponse])
def list_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all study groups the current user belongs to."""
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]

    if not group_ids:
        return []

    groups = db.query(Group).filter(Group.id.in_(group_ids)).order_by(Group.created_at.desc()).all()
    result = []
    for g in groups:
        count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        creator = db.query(User).filter(User.id == g.created_by).first()
        result.append(GroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            created_by=g.created_by,
            creator_name=creator.name if creator else "Unknown",
            created_at=g.created_at,
            member_count=count,
            is_member=True
        ))
    return result

@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed workspace information for a specific group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found.")

    memberships = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_user_ids = [m.user_id for m in memberships]
    is_member = current_user.id in member_user_ids

    member_responses = []
    for m in memberships:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            member_responses.append(GroupMemberResponse(
                id=m.id,
                user_id=u.id,
                name=u.name,
                email=u.email,
                joined_at=m.joined_at
            ))

    creator = db.query(User).filter(User.id == group.created_by).first()

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        creator_name=creator.name if creator else "Unknown",
        created_at=group.created_at,
        member_count=len(memberships),
        is_member=is_member,
        members=member_responses
    )

@router.post("/{group_id}/join", response_model=GroupResponse)
def join_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join an existing study group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found.")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a member of this group.")

    membership = GroupMember(group_id=group_id, user_id=current_user.id)
    db.add(membership)
    db.commit()

    # Log join group activity
    log_activity(db, current_user.id, "join_group", related_entity_id=group_id, metadata={"name": group.name})

    count = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
    creator = db.query(User).filter(User.id == group.created_by).first()

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        creator_name=creator.name if creator else "Unknown",
        created_at=group.created_at,
        member_count=count,
        is_member=True
    )

@router.post("/{group_id}/leave")
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Leave a study group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found.")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are not a member of this group.")

    db.delete(existing)
    db.commit()

    # Log leave group activity
    log_activity(db, current_user.id, "leave_group", related_entity_id=group_id, metadata={"name": group.name})

    return {"message": f"Successfully left group '{group.name}'."}

@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
def get_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members of a specific study group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found.")

    memberships = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    result = []
    for m in memberships:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append(GroupMemberResponse(
                id=m.id,
                user_id=u.id,
                name=u.name,
                email=u.email,
                joined_at=m.joined_at
            ))
    return result
