import json
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.security import decode_token
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.chat import GroupMessage
from app.schemas.chat import MessageResponse, MessageCreate
from app.services.points_service import award_points
from app.services.activity_service import log_activity

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """Manages active WebSockets connections grouped by group_id."""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, group_id: int, websocket: WebSocket):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)
        logger.info(f"WebSocket connected to group {group_id}. Active: {len(self.active_connections[group_id])}")

    def disconnect(self, group_id: int, websocket: WebSocket):
        if group_id in self.active_connections:
            if websocket in self.active_connections[group_id]:
                self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast(self, group_id: int, message_data: dict):
        if group_id in self.active_connections:
            for connection in list(self.active_connections[group_id]):
                try:
                    await connection.send_json(message_data)
                except Exception as e:
                    logger.error(f"Error broadcasting to socket in group {group_id}: {e}")
                    self.disconnect(group_id, connection)

manager = ConnectionManager()

# REST API: Fetch Chat History
@router.get("/groups/{group_id}/messages", response_model=List[MessageResponse])
def get_group_chat_history(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve chat message history for a study group."""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this study group to view its chat history."
        )

    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id
    ).order_by(GroupMessage.created_at.asc()).all()

    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append(MessageResponse(
            id=msg.id,
            group_id=msg.group_id,
            sender_id=msg.sender_id,
            sender_name=sender.name if sender else "Unknown",
            message_text=msg.message_text,
            created_at=msg.created_at
        ))
    return result

# WebSocket Endpoint: Real-time Group Chat
@router.websocket("/groups/{group_id}/ws")
async def group_chat_websocket(
    websocket: WebSocket,
    group_id: int,
    token: Optional[str] = Query(None)
):
    """FastAPI WebSocket endpoint for real-time study group chat."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Authenticate JWT token
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = int(payload["sub"])

    # Verify user is a member of the study group
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

        sender_name = user.name
    finally:
        db.close()

    # Accept connection
    await manager.connect(group_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_payload = json.loads(data)
                text = msg_payload.get("message_text", "").strip()
            except Exception:
                text = data.strip()

            if not text:
                continue

            # Store message in PostgreSQL
            db = SessionLocal()
            try:
                msg = GroupMessage(
                    group_id=group_id,
                    sender_id=user_id,
                    message_text=text
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                # Award +10 XP for sending group chat message
                award_points(
                    db=db,
                    user_id=user_id,
                    activity_type="send_group_message",
                    points=10,
                    related_entity_id=msg.id,
                    metadata={"group_id": group_id}
                )

                broadcast_data = {
                    "id": msg.id,
                    "group_id": group_id,
                    "sender_id": user_id,
                    "sender_name": sender_name,
                    "message_text": msg.message_text,
                    "created_at": msg.created_at.isoformat()
                }

                await manager.broadcast(group_id, broadcast_data)

            finally:
                db.close()

    except WebSocketDisconnect:
        manager.disconnect(group_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error in group {group_id}: {e}")
        manager.disconnect(group_id, websocket)
