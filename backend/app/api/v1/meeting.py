import json
import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.security import decode_token
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.services.activity_service import log_activity

logger = logging.getLogger(__name__)

router = APIRouter()

class MeetingConnectionManager:
    """Manages active WebRTC WebSockets signaling connections per group meeting room."""

    def __init__(self):
        # group_id -> Dict[user_id, WebSocket]
        self.active_meetings: Dict[int, Dict[int, WebSocket]] = {}
        # user_id -> Dict[str, Any] (user details)
        self.user_details: Dict[int, Dict[str, Any]] = {}

    async def connect(self, group_id: int, user_id: int, user_name: str, websocket: WebSocket) -> List[Dict[str, Any]]:
        """Accept connection, register user in meeting room, and return list of existing participants."""
        await websocket.accept()

        if group_id not in self.active_meetings:
            self.active_meetings[group_id] = {}

        # List existing participants before adding current user
        existing_participants = [
            {"user_id": uid, "user_name": self.user_details.get(uid, {}).get("name", "Student")}
            for uid in self.active_meetings[group_id].keys()
        ]

        self.active_meetings[group_id][user_id] = websocket
        self.user_details[user_id] = {"id": user_id, "name": user_name}

        logger.info(f"User {user_id} ({user_name}) joined WebRTC meeting room for group {group_id}. Total: {len(self.active_meetings[group_id])}")
        return existing_participants

    def disconnect(self, group_id: int, user_id: int):
        """Remove user from meeting room upon leave or disconnect."""
        if group_id in self.active_meetings:
            if user_id in self.active_meetings[group_id]:
                del self.active_meetings[group_id][user_id]
            if not self.active_meetings[group_id]:
                del self.active_meetings[group_id]
        logger.info(f"User {user_id} disconnected from meeting in group {group_id}.")

    async def send_to_user(self, group_id: int, target_user_id: int, message_data: dict):
        """Send direct WebRTC signaling message (e.g. SDP offer/answer/ICE candidate) to specific target user."""
        if group_id in self.active_meetings and target_user_id in self.active_meetings[group_id]:
            try:
                await self.active_meetings[group_id][target_user_id].send_json(message_data)
            except Exception as e:
                logger.error(f"Error sending signaling message to user {target_user_id} in group {group_id}: {e}")

    async def broadcast(self, group_id: int, message_data: dict, exclude_user_id: Optional[int] = None):
        """Broadcast WebRTC signaling event to all active participants in group meeting."""
        if group_id in self.active_meetings:
            for uid, connection in list(self.active_meetings[group_id].items()):
                if exclude_user_id is not None and uid == exclude_user_id:
                    continue
                try:
                    await connection.send_json(message_data)
                except Exception as e:
                    logger.error(f"Error broadcasting meeting signal to user {uid} in group {group_id}: {e}")

meeting_manager = MeetingConnectionManager()

@router.get("/groups/{group_id}/meeting/participants")
def get_meeting_participants(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve active virtual meeting participants for a study group."""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this study group to access virtual meeting information."
        )

    active_uids = list(meeting_manager.active_meetings.get(group_id, {}).keys())
    participants = []
    for uid in active_uids:
        details = meeting_manager.user_details.get(uid)
        if details:
            participants.append(details)
        else:
            user_obj = db.query(User).filter(User.id == uid).first()
            if user_obj:
                participants.append({"id": user_obj.id, "name": user_obj.name})

    return {
        "group_id": group_id,
        "active_meeting": len(participants) > 0,
        "participant_count": len(participants),
        "participants": participants
    }

@router.get("/groups/{group_id}/meeting/status")
def get_meeting_status(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve active virtual meeting status for a study group."""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this study group to access virtual meeting information."
        )

    active_uids = list(meeting_manager.active_meetings.get(group_id, {}).keys())
    participant_count = len(active_uids)

    return {
        "active": participant_count > 0,
        "participant_count": participant_count
    }

@router.websocket("/groups/{group_id}/meeting/ws")
async def study_meeting_websocket(
    websocket: WebSocket,
    group_id: int,
    token: Optional[str] = Query(None)
):
    """
    FastAPI WebSockets Signaling Endpoint for WebRTC Virtual Study Meetings.
    Handles JWT authentication, group membership authorization, SDP offers/answers, and ICE candidate exchange.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = int(payload["sub"])

    # Verify group membership in DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()

        if not user or not membership:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user_name = user.name
    finally:
        db.close()

    # Accept connection and fetch existing active participants
    existing_participants = await meeting_manager.connect(group_id, user_id, user_name, websocket)

    # Log meeting join activity
    db = SessionLocal()
    try:
        log_activity(db, user_id, "join_study_meeting", related_entity_id=group_id, metadata={"group_id": group_id})
    finally:
        db.close()

    # Notify newly connected user of existing room participants
    await websocket.send_json({
        "type": "room_state",
        "user_id": user_id,
        "existing_participants": existing_participants
    })

    # Broadcast participant_joined event to all other peers in room
    await meeting_manager.broadcast(
        group_id,
        {
            "type": "participant_joined",
            "user_id": user_id,
            "user_name": user_name
        },
        exclude_user_id=user_id
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except Exception:
                continue

            msg_type = msg.get("type")
            target_id = msg.get("target_id")

            # Attach sender info to payload
            msg["sender_id"] = user_id
            msg["sender_name"] = user_name

            if msg_type in ["offer", "answer", "ice_candidate"]:
                # Route WebRTC peer signaling to target participant
                if target_id:
                    await meeting_manager.send_to_user(group_id, int(target_id), msg)
                else:
                    await meeting_manager.broadcast(group_id, msg, exclude_user_id=user_id)

            elif msg_type == "toggle_media":
                # Broadcast camera/microphone mute state updates
                await meeting_manager.broadcast(group_id, msg, exclude_user_id=user_id)

            elif msg_type == "leave":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket meeting error in group {group_id} for user {user_id}: {e}")
    finally:
        meeting_manager.disconnect(group_id, user_id)

        # Broadcast participant_left to remaining peers
        await meeting_manager.broadcast(
            group_id,
            {
                "type": "participant_left",
                "user_id": user_id,
                "user_name": user_name
            }
        )

        # Log meeting leave activity
        db = SessionLocal()
        try:
            log_activity(db, user_id, "leave_study_meeting", related_entity_id=group_id, metadata={"group_id": group_id})
        finally:
            db.close()
