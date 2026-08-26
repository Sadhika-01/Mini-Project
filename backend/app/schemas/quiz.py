from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict

class QuizGenerateRequest(BaseModel):
    resource_id: Optional[int] = Field(None, description="Resource ID from E-Shelf to generate quiz from")
    topic: Optional[str] = Field(None, description="Custom academic topic to generate quiz for")
    num_questions: int = Field(5, ge=3, le=10)

class QuestionResponse(BaseModel):
    id: int
    question_text: str
    options: List[str]

    class Config:
        from_attributes = True

class QuizDetailResponse(BaseModel):
    id: int
    title: str
    num_questions: int
    created_at: datetime
    questions: List[QuestionResponse]

    class Config:
        from_attributes = True

class QuizSubmitRequest(BaseModel):
    answers: Dict[int, int] = Field(..., description="Map of question_id to selected_option_index (0..3)")

class QuestionFeedback(BaseModel):
    question_id: int
    question_text: str
    options: List[str]
    selected_option: int
    correct_option: int
    is_correct: bool
    explanation: Optional[str] = None

class QuizResultResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    score: int
    total_questions: int
    percentage: float
    points_earned: int
    feedback: List[QuestionFeedback]
