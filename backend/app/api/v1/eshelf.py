import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.resource import Resource
from app.schemas.resource import ResourceResponse
from app.services.storage_service import storage_service
from app.services.pdf_service import extract_text_from_pdf, PDFExtractionError
from app.services.ai_service import ai_service
from app.services.activity_service import log_activity

router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".pdf", ".ppt", ".pptx", ".doc", ".docx",
    ".png", ".jpg", ".jpeg", ".webp", ".gif"
}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

@router.post("/groups/{group_id}/resources/upload", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    group_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a study resource (PDF, PPT, DOC, Image) to a study group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found.")

    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of this study group to upload resources.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PPT/PPTX, DOC/DOCX, PNG, JPG, WEBP."
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds 15 MB limit. Uploaded size: {file_size / (1024 * 1024):.2f} MB."
        )

    subfolder = f"group_{group_id}"
    storage_location = storage_service.save_file(file_bytes, file.filename, subfolder=subfolder)

    resource = Resource(
        group_id=group_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        file_type=ext.lstrip('.'),
        file_size=file_size,
        storage_location=storage_location
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    # Log upload resource activity
    log_activity(db, current_user.id, "upload_resource", related_entity_id=resource.id, metadata={"filename": resource.filename, "file_type": resource.file_type})

    return ResourceResponse(
        id=resource.id,
        group_id=resource.group_id,
        uploaded_by=resource.uploaded_by,
        uploader_name=current_user.name,
        filename=resource.filename,
        file_type=resource.file_type,
        file_size=resource.file_size,
        created_at=resource.created_at
    )

@router.get("/groups/{group_id}/resources", response_model=List[ResourceResponse])
def get_group_resources(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all study resources shared within a specific group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found.")

    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of this group to access its E-Shelf.")

    resources = db.query(Resource).filter(Resource.group_id == group_id).order_by(Resource.created_at.desc()).all()
    result = []
    for r in resources:
        uploader = db.query(User).filter(User.id == r.uploaded_by).first()
        result.append(ResourceResponse(
            id=r.id,
            group_id=r.group_id,
            uploaded_by=r.uploaded_by,
            uploader_name=uploader.name if uploader else "Unknown",
            filename=r.filename,
            file_type=r.file_type,
            file_size=r.file_size,
            created_at=r.created_at
        ))
    return result

@router.get("/resources/my", response_model=List[ResourceResponse])
def get_my_accessible_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all E-Shelf resources across groups the user belongs to."""
    memberships = db.query(GroupMember.group_id).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]

    if not group_ids:
        return []

    resources = db.query(Resource).filter(Resource.group_id.in_(group_ids)).order_by(Resource.created_at.desc()).all()
    result = []
    for r in resources:
        uploader = db.query(User).filter(User.id == r.uploaded_by).first()
        result.append(ResourceResponse(
            id=r.id,
            group_id=r.group_id,
            uploaded_by=r.uploaded_by,
            uploader_name=uploader.name if uploader else "Unknown",
            filename=r.filename,
            file_type=r.file_type,
            file_size=r.file_size,
            created_at=r.created_at
        ))
    return result

@router.get("/resources/{resource_id}/download")
def download_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a study resource file."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource file not found.")

    membership = db.query(GroupMember).filter(
        GroupMember.group_id == resource.group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to download this resource.")

    filepath = storage_service.get_file_path(resource.storage_location)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource file not found on disk.")

    # Log download resource activity
    log_activity(db, current_user.id, "download_resource", related_entity_id=resource.id, metadata={"filename": resource.filename})

    return FileResponse(
        path=filepath,
        filename=resource.filename,
        media_type="application/octet-stream"
    )

@router.post("/resources/{resource_id}/summarize")
def summarize_pdf_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract text from a PDF study resource and generate a structured AI summary."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource file not found.")

    if resource.file_type.lower() != "pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI Summarization is currently supported for PDF files only.")

    membership = db.query(GroupMember).filter(
        GroupMember.group_id == resource.group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")

    filepath = storage_service.get_file_path(resource.storage_location)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource file not found on storage disk.")

    try:
        extracted_text, total_pages = extract_text_from_pdf(filepath)
    except PDFExtractionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    ai_result = ai_service.summarize_pdf_content(filename=resource.filename, text=extracted_text)

    # Log AI summarize activity
    log_activity(db, current_user.id, "ai_generate_summary", related_entity_id=resource.id, metadata={"filename": resource.filename, "pages": total_pages})

    return {
        "resource_id": resource.id,
        "filename": resource.filename,
        "total_pages": total_pages,
        "extracted_chars": len(extracted_text),
        "source": ai_result.get("source"),
        "summary": ai_result.get("summary")
    }
