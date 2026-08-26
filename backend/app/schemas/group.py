from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150, example="Cloud Computing & AWS Study Lab")
    description: Optional[str] = Field(None, max_length=500, example="Weekly group discussions on AWS EC2, S3, and Serverless architectures.")

class GroupMemberResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    joined_at: datetime

    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    member_count: int = 0
    is_member: bool = False

    class Config:
        from_attributes = True

class GroupDetailResponse(GroupResponse):
    members: List[GroupMemberResponse] = []
