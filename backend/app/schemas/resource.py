from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ResourceResponse(BaseModel):
    id: int
    group_id: int
    uploaded_by: int
    uploader_name: Optional[str] = "Unknown"
    filename: str
    file_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True
