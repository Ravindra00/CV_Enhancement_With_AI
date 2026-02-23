from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel, HttpUrl
from app.database import get_db
from app.models import User, CoverLetter, CV
from app.schemas import CoverLetterCreate, CoverLetterUpdate, CoverLetterResponse
from app.dependencies import get_current_user
from app.utils.ai_integration import generate_cover_letter, extract_job_description

router = APIRouter(prefix="/cover-letters", tags=["cover-letters"])

# Schema for AI generation
class GenerateCoverLetterRequest(BaseModel):
    cv_id: int
    job_description: str
    title: str = "AI Generated Cover Letter"

class ExtractJobDescriptionRequest(BaseModel):
    url: str


@router.get("", response_model=List[CoverLetterResponse])
def get_cover_letters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all cover letters for the current user."""
    return db.query(CoverLetter).filter(CoverLetter.user_id == current_user.id).order_by(CoverLetter.updated_at.desc()).all()


@router.get("/{cl_id}", response_model=CoverLetterResponse)
def get_cover_letter(
    cl_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single cover letter by ID."""
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == current_user.id).first()
    if not cl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")
    return cl


@router.post("", response_model=CoverLetterResponse)
def create_cover_letter(
    data: CoverLetterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new cover letter."""
    cl = CoverLetter(
        user_id=current_user.id,
        cv_id=data.cv_id,
        title=data.title or "My Cover Letter",
        content=data.content or {}
    )
    db.add(cl)
    db.commit()
    db.refresh(cl)
    return cl


@router.put("/{cl_id}", response_model=CoverLetterResponse)
def update_cover_letter(
    cl_id: int,
    data: CoverLetterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a cover letter."""
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == current_user.id).first()
    if not cl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")
    if data.title is not None:
        cl.title = data.title
    if data.cv_id is not None:
        cl.cv_id = data.cv_id
    if data.content is not None:
        cl.content = data.content
    cl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cl)
    return cl


@router.delete("/{cl_id}")
def delete_cover_letter(
    cl_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a cover letter."""
    cl = db.query(CoverLetter).filter(CoverLetter.id == cl_id, CoverLetter.user_id == current_user.id).first()
    if not cl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")
    db.delete(cl)
    db.commit()
    return {"message": "Cover letter deleted successfully"}


# @router.post("/generate-with-ai")
# def generate_with_ai(
#     request: GenerateCoverLetterRequest,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Generate a cover letter using AI"""
#     try:
#         # Get CV
#         cv = db.query(CV).filter(CV.id == request.cv_id, CV.user_id == current_user.id).first()
#         if not cv:
#             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
        
#         # Generate cover letter using AI
#         # cv_data = cv.parsed_data or {}
#         cv_data = {
#             'full_name': cv.full_name,
#             'experiences': cv.experiences or [],
#             'skills': cv.skills or [],
#             'educations': cv.educations or [],
#             'projects': cv.projects or [],
#             'certifications': cv.certifications or [],
#             # 'achievements': cv.achievements or [],
#             # 'volunteering': cv.volunteering or [],
#             'languages': cv.languages or [],
#             'interest': cv.interests or [],
#             'summary': cv.profile_summary or "",
#             # 'contact': cv.contact or {},
#             # 'social_links': cv.social_links or [],
#             # 'publications': cv.publications or [],
#             # 'patents': cv.patents or [],
#             # 'awards': cv.awards or [],
#             # 'references': cv.references or [],
#             # 'additional_info': cv.additional_info or {},
#             # … etc
#         }
#         content = generate_cover_letter(cv_data, request.job_description, current_user.name)
        
#         if not content:
#             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI generation failed")
        
#         # Save to database
#         cl = CoverLetter(
#             user_id=current_user.id,
#             cv_id=request.cv_id,
#             title=request.title,
#             content={"text": content, "generated_with_ai": True}
#         )
#         db.add(cl)
#         db.commit()
#         db.refresh(cl)
        
#         return CoverLetterResponse.from_orm(cl)
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/generate-with-ai")
def generate_with_ai(
    request: GenerateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a cover letter using AI based on CV and job description"""
    try:
        # ── Get CV ──────────────────────────────────────────────────────────
        cv = db.query(CV).filter(CV.id == request.cv_id, CV.user_id == current_user.id).first()
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="CV not found"
            )
        
        # ── Build CV data dict ──────────────────────────────────────────────
        cv_data = {
            'full_name': cv.full_name or current_user.name or "Applicant",
            'experiences': cv.experiences or [],
            'skills': cv.skills or [],
            'educations': cv.educations or [],
            'projects': cv.projects or [],
            'certifications': cv.certifications or [],
            'languages': cv.languages or [],
            'interests': cv.interests or [],
            'summary': cv.profile_summary or "",
        }
        
        # ── Generate cover letter (plain text string) ────────────────────────
        cover_letter_text = generate_cover_letter(
            cv_data, 
            request.job_description, 
            current_user.name or "User"
        )
        
        if not cover_letter_text:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Failed to generate cover letter"
            )
        
        # ── Save to database ────────────────────────────────────────────────
        # Store as simple dict with 'text' field
        cl = CoverLetter(
            user_id=current_user.id,
            cv_id=request.cv_id,
            title=request.title or f"Cover Letter - {request.title}",
            content={
                "text": cover_letter_text,  # Plain text string
                "generated_with_ai": True,
                "job_description": request.job_description,
                "created_at": datetime.utcnow().isoformat()
            }
        )
        
        db.add(cl)
        db.commit()
        db.refresh(cl)
        
        # ── Return response ────────────────────────────────────────────────
        return CoverLetterResponse.from_orm(cl)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in generate_with_ai: {str(e)}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Cover letter generation failed: {str(e)}"
        )

@router.post("/extract-job-from-url")
def extract_job_from_url(
    request: ExtractJobDescriptionRequest,
    current_user: User = Depends(get_current_user)
):
    """Extract job description from a URL"""
    try:
        job_desc = extract_job_description(request.url)
        
        if not job_desc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not extract job description")
        
        return {"job_description": job_desc, "url": request.url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
