import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import GroupMember
from app.models.resource import Resource
from app.models.flashcard import FlashcardSet, Flashcard
from app.schemas.flashcard import (
    FlashcardGenerateRequest, FlashcardSetResponse, FlashcardItemResponse
)
from app.services.storage_service import storage_service
from app.services.pdf_service import extract_text_from_pdf, PDFExtractionError
from app.services.ai_service import ai_service
from app.services.activity_service import log_activity

router = APIRouter()

@router.post("/generate", response_model=FlashcardSetResponse, status_code=status.HTTP_201_CREATED)
def generate_flashcards(
    body: FlashcardGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an AI Flashcard Set from an E-Shelf PDF resource or academic topic.
    Extracts text using pdf_service, calls Gemini via ai_service, validates output, and saves in DB.
    """
    resource_id = body.resource_id
    topic = body.topic
    num_cards = body.num_cards

    if not resource_id and not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either resource_id or topic must be provided to generate flashcards."
        )

    title = "Academic Study Flashcards"
    text_content = ""
    group_id = None

    if resource_id:
        resource = db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study resource not found.")

        membership = db.query(GroupMember).filter(
            GroupMember.group_id == resource.group_id,
            GroupMember.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")

        title = f"Flashcards for {resource.filename}"
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
        title = f"Flashcards on {topic}"
        text_content = f"Academic course concepts and principles related to {topic}."

    # Call Gemini AIService
    ai_result = ai_service.generate_flashcards_from_text(title=title, text=text_content, num_cards=num_cards)
    raw_cards = ai_result.get("flashcards", [])

    if not raw_cards:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate valid flashcards.")

    # Save FlashcardSet in DB
    fc_set = FlashcardSet(
        user_id=current_user.id,
        resource_id=resource_id,
        group_id=group_id,
        title=title,
        num_cards=len(raw_cards)
    )
    db.add(fc_set)
    db.commit()
    db.refresh(fc_set)

    # Save Flashcard Items
    saved_cards = []
    for idx, card_data in enumerate(raw_cards):
        card_obj = Flashcard(
            set_id=fc_set.id,
            front=card_data["front"],
            back=card_data["back"],
            topic=card_data.get("topic", "General Engineering"),
            order_index=idx
        )
        db.add(card_obj)
        db.commit()
        db.refresh(card_obj)

        saved_cards.append(FlashcardItemResponse(
            id=card_obj.id,
            front=card_obj.front,
            back=card_obj.back,
            topic=card_obj.topic,
            order_index=card_obj.order_index
        ))

    # Log activity for analytics
    log_activity(db, current_user.id, "flashcards_generated", related_entity_id=fc_set.id, metadata={"title": fc_set.title, "num_cards": len(saved_cards)})

    return FlashcardSetResponse(
        id=fc_set.id,
        user_id=fc_set.user_id,
        title=fc_set.title,
        num_cards=len(saved_cards),
        created_at=fc_set.created_at,
        cards=saved_cards
    )

@router.get("/my", response_model=List[FlashcardSetResponse])
def list_my_flashcard_sets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all flashcard sets created by the current user."""
    sets = db.query(FlashcardSet).filter(FlashcardSet.user_id == current_user.id).order_by(FlashcardSet.created_at.desc()).all()
    result = []
    for s in sets:
        cards = db.query(Flashcard).filter(Flashcard.set_id == s.id).order_by(Flashcard.order_index.asc()).all()
        card_responses = [
            FlashcardItemResponse(
                id=c.id, front=c.front, back=c.back, topic=c.topic, order_index=c.order_index
            ) for c in cards
        ]
        result.append(FlashcardSetResponse(
            id=s.id, user_id=s.user_id, title=s.title, num_cards=len(card_responses), created_at=s.created_at, cards=card_responses
        ))
    return result

@router.get("/{set_id}", response_model=FlashcardSetResponse)
def get_flashcard_set_by_id(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve flashcard set and log review activity."""
    fc_set = db.query(FlashcardSet).filter(FlashcardSet.id == set_id).first()
    if not fc_set:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard set not found.")

    cards = db.query(Flashcard).filter(Flashcard.set_id == fc_set.id).order_by(Flashcard.order_index.asc()).all()
    card_responses = [
        FlashcardItemResponse(
            id=c.id, front=c.front, back=c.back, topic=c.topic, order_index=c.order_index
        ) for c in cards
    ]

    # Log activity for analytics
    log_activity(db, current_user.id, "flashcards_reviewed", related_entity_id=fc_set.id, metadata={"title": fc_set.title})

    return FlashcardSetResponse(
        id=fc_set.id,
        user_id=fc_set.user_id,
        title=fc_set.title,
        num_cards=len(card_responses),
        created_at=fc_set.created_at,
        cards=card_responses
    )
