from pydantic import BaseModel, Field
from typing import Optional

class DoubtRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000, example="What is the difference between Amazon S3 and EBS?")
    category: Optional[str] = Field(None, example="Cloud Computing")

class ImproveAnswerRequest(BaseModel):
    question: str = Field(..., min_length=3, example="How does backpropagation work?")
    raw_answer: str = Field(..., min_length=3, example="It updates weights using derivative of loss.")

class AcademicTestRequest(BaseModel):
    question: str = Field(..., min_length=3, example="Explain CAP theorem in distributed systems.")
