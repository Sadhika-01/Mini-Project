from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class FlashcardGenerateRequest(BaseModel):
    resource_id: Optional[int] = Field(None, description="Resource ID from E-Shelf to generate flashcards from")
    topic: Optional[str] = Field(None, description="Custom academic topic to generate flashcards for")
    num_cards: int = Field(10, ge=5, le=20)

class FlashcardItemResponse(BaseModel):
    id: int
    front: str
    back: str
    topic: Optional[str] = None
    order_index: int

    class Config:
        from_attributes = True

class FlashcardSetResponse(BaseModel):
    id: int
    user_id: int
    title: str
    num_cards: int
    created_at: datetime
    cards: List[FlashcardItemResponse]

    class Config:
        from_attributes = True
