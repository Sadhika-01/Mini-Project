from pydantic import BaseModel, Field
from datetime import datetime

class MessageCreate(BaseModel):
    message_text: str = Field(..., min_length=1, max_length=2000)

class MessageResponse(BaseModel):
    id: int
    group_id: int
    sender_id: int
    sender_name: str
    message_text: str
    created_at: datetime

    class Config:
        from_attributes = True
