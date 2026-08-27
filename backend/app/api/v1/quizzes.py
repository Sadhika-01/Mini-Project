import os
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import GroupMember
from app.models.resource import Resource
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.schemas.quiz import (
    QuizGenerateRequest, QuizDetailResponse, QuestionResponse,
    QuizSubmitRequest, QuizResultResponse, QuestionFeedback
)
from app.services.storage_service import storage_service
from app.services.pdf_service import extract_text_from_pdf, PDFExtractionError
from app.services.ai_service import ai_service
from app.services.points_service import award_points
from app.services.activity_service import log_activity

router = APIRouter()

@router.post("/generate", response_model=QuizDetailResponse, status_code=status.HTTP_201_CREATED)
def generate_quiz(
    body: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an AI quiz from an E-Shelf PDF resource or academic topic.
    Extracts text using pdf_service, calls Gemini via ai_service, validates output, and saves in DB.
    """
    resource_id = body.resource_id
    topic = body.topic
    num_questions = body.num_questions

    if not resource_id and not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either resource_id or topic must be provided to generate a quiz."
        )

    title = "Academic Practice Quiz"
    text_content = ""
    group_id = None

    if resource_id:
        resource = db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study resource not found.")

        # Authorization check
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == resource.group_id,
            GroupMember.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")

        title = f"Quiz on {resource.filename}"
        group_id = resource.group_id

        is_pdf = "pdf" in resource.file_type.lower() or resource.filename.lower().endswith(".pdf")
        if is_pdf:
            filepath = storage_service.get_file_path(resource.storage_location)
            if not filepath or not os.path.exists(filepath):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF resource file not found on disk.")

            try:
                text_content, _ = extract_text_from_pdf(filepath)
            except PDFExtractionError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        else:
            text_content = f"Study topic covering {resource.filename} in group study materials."
    else:
        title = f"Quiz on {topic}"
        text_content = f"Academic course concepts and principles related to {topic}."

    # Call Gemini AIService
    ai_result = ai_service.generate_quiz_from_text(title=title, text=text_content, num_questions=num_questions)
    raw_questions = ai_result.get("questions", [])

    if not raw_questions:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate valid quiz questions.")

    # Save Quiz in DB
    quiz = Quiz(
        user_id=current_user.id,
        resource_id=resource_id,
        group_id=group_id,
        title=title,
        num_questions=len(raw_questions)
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # Save Questions in DB
    saved_questions = []
    for q_data in raw_questions:
        q_obj = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q_data["question"],
            options_json=json.dumps(q_data["options"]),
            correct_answer=q_data["correct_answer"],
            explanation=q_data.get("explanation", "")
        )
        db.add(q_obj)
        db.commit()
        db.refresh(q_obj)

        saved_questions.append(QuestionResponse(
            id=q_obj.id,
            question_text=q_obj.question_text,
            options=json.loads(q_obj.options_json)
        ))

    # Log activity for analytics
    log_activity(db, current_user.id, "quiz_generated", related_entity_id=quiz.id, metadata={"title": quiz.title, "num_questions": len(saved_questions)})

    return QuizDetailResponse(
        id=quiz.id,
        title=quiz.title,
        num_questions=quiz.num_questions,
        created_at=quiz.created_at,
        questions=saved_questions
    )

@router.get("/{quiz_id}", response_model=QuizDetailResponse)
def get_quiz_by_id(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch quiz details and questions for an active quiz attempt."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id.asc()).all()

    q_responses = []
    for q in questions:
        opts = json.loads(q.options_json) if q.options_json else []
        q_responses.append(QuestionResponse(
            id=q.id,
            question_text=q.question_text,
            options=opts
        ))

    # Log activity
    log_activity(db, current_user.id, "quiz_started", related_entity_id=quiz.id, metadata={"title": quiz.title})

    return QuizDetailResponse(
        id=quiz.id,
        title=quiz.title,
        num_questions=len(q_responses),
        created_at=quiz.created_at,
        questions=q_responses
    )

@router.post("/{quiz_id}/attempt", response_model=QuizResultResponse)
def submit_quiz_attempt(
    quiz_id: int,
    body: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit student answers for a quiz attempt.
    Calculates score, percentage, records attempt, awards XP (+10 completion, +15 bonus if >= 80%), and returns detailed feedback.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    if not questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz contains no questions.")

    total_questions = len(questions)
    correct_count = 0
    feedback_list = []

    user_answers = body.answers  # Dict of {question_id: selected_index}

    for q in questions:
        selected_idx = user_answers.get(q.id)
        if selected_idx is None:
            selected_idx = user_answers.get(str(q.id), -1)

        is_correct = (selected_idx == q.correct_answer)
        if is_correct:
            correct_count += 1

        opts = json.loads(q.options_json) if q.options_json else []

        feedback_list.append(QuestionFeedback(
            question_id=q.id,
            question_text=q.question_text,
            options=opts,
            selected_option=selected_idx if isinstance(selected_idx, int) else -1,
            correct_option=q.correct_answer,
            is_correct=is_correct,
            explanation=q.explanation
        ))

    percentage = round((correct_count / total_questions) * 100.0, 1)

    # Save Attempt in PostgreSQL
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        score=correct_count,
        total_questions=total_questions,
        percentage=percentage
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Award Points using points_service
    points_earned = 0
    # 1. Base completion (+10 XP)
    rec1 = award_points(
        db=db,
        user_id=current_user.id,
        activity_type="complete_quiz",
        points=10,
        related_entity_id=attempt.id,
        metadata={"quiz_id": quiz.id, "score": correct_count, "percentage": percentage}
    )
    if rec1: points_earned += 10

    # 2. High score bonus (+15 XP if >= 80%)
    if percentage >= 80.0:
        rec2 = award_points(
            db=db,
            user_id=current_user.id,
            activity_type="high_quiz_score",
            points=15,
            related_entity_id=attempt.id,
            metadata={"quiz_id": quiz.id, "percentage": percentage}
        )
        if rec2: points_earned += 15

    # Log activity for analytics
    log_activity(db, current_user.id, "quiz_completed", related_entity_id=attempt.id, metadata={"quiz_id": quiz.id, "percentage": percentage, "score": correct_count})

    return QuizResultResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        score=correct_count,
        total_questions=total_questions,
        percentage=percentage,
        points_earned=points_earned,
        feedback=feedback_list
    )
