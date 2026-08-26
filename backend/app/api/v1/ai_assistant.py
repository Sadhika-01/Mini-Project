from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.ai import DoubtRequest, ImproveAnswerRequest, AcademicTestRequest
from app.services.ai_service import ai_service
from app.services.activity_service import log_activity

router = APIRouter()

@router.post("/test-academic")
def test_academic_question(
    body: AcademicTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test endpoint for academic Q&A using Gemini AI service."""
    result = ai_service.explain_doubt(question=body.question, category="Academic Test")
    log_activity(db, current_user.id, "ai_ask_question", metadata={"question": body.question})
    return {
        "question": body.question,
        "source": result.get("source"),
        "response": result.get("explanation")
    }

@router.post("/explain")
def explain_doubt(
    body: DoubtRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Explain an academic doubt via Gemini AI."""
    result = ai_service.explain_doubt(question=body.question, category=body.category)
    log_activity(db, current_user.id, "ai_explain_doubt", metadata={"question": body.question, "category": body.category})
    return {
        "question": body.question,
        "category": body.category,
        "source": result.get("source"),
        "explanation": result.get("explanation")
    }

@router.post("/improve-answer")
def improve_answer(
    body: ImproveAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Improve a community answer via Gemini AI."""
    result = ai_service.improve_answer(question=body.question, raw_answer=body.raw_answer)
    log_activity(db, current_user.id, "ai_improve_answer", metadata={"question": body.question})
    return {
        "question": body.question,
        "source": result.get("source"),
        "improved_answer": result.get("improved_answer")
    }
