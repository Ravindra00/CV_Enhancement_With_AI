from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, CV, Suggestion, CVCustomization
from app.schemas import CVResponse, CVCreate, CVUpdate, CVCustomizationRequest, SuggestionResponse, ApplyAIChangesRequest
from app.dependencies import get_current_user
from app.utils.cv_parser import parse_cv_file
from app.utils.ai_integration import analyze_cv, enhance_cv_for_job
from app.utils.ai_enhance import extract_keywords, compute_match_score, rule_based_suggestions, groq_suggestions
import os
from datetime import datetime

router = APIRouter(prefix="/cvs", tags=["cvs"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _build_cv_data_dict(cv: CV) -> dict:
    """Build a unified CV data dict from the ORM model for AI functions."""
    return {
        'full_name': cv.full_name,
        'email': cv.email,
        'phone': cv.phone,
        'location': cv.location,
        'linkedin_url': cv.linkedin_url,
        'profile_summary': cv.profile_summary,
        'experiences': cv.experiences or [],
        'educations': cv.educations or [],
        'skills': cv.skills or [],
        'certifications': cv.certifications or [],
        'languages': cv.languages or [],
        'projects': cv.projects or [],
        'personal_info': cv.personal_info or {},
    }


def _sync_personal_info(cv: CV):
    """
    Keeps personal_info JSON in sync with the flat columns after
    an upload or flat-field update. This is what the editor reads.
    """
    if cv.personal_info:
        # personal_info is the authoritative source for the editor — sync flat cols from it
        pi = cv.personal_info
        cv.full_name = pi.get('name') or cv.full_name
        cv.email = pi.get('email') or cv.email
        cv.phone = pi.get('phone') or cv.phone
        cv.location = pi.get('location') or cv.location
        cv.linkedin_url = pi.get('linkedin') or cv.linkedin_url
        cv.profile_summary = pi.get('summary') or cv.profile_summary
    else:
        # Build personal_info from flat cols (e.g., after file upload)
        cv.personal_info = {
            'name': cv.full_name or '',
            'title': cv.title or '',
            'email': cv.email or '',
            'phone': cv.phone or '',
            'location': cv.location or '',
            'linkedin': cv.linkedin_url or '',
            'website': '',
            'summary': cv.profile_summary or '',
            'photo': cv.photo_path or '',
        }


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CVResponse])
def get_all_cvs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all CVs for the current user."""
    return db.query(CV).filter(CV.user_id == current_user.id).order_by(CV.updated_at.desc()).all()


@router.get("/{cv_id}", response_model=CVResponse)
def get_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific CV by ID."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return cv


@router.post("", response_model=CVResponse)
def create_cv(
    cv_data: CVCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new (blank) CV."""
    new_cv = CV(
        user_id=current_user.id,
        title=cv_data.title or "My CV",
        full_name=cv_data.full_name,
        email=cv_data.email,
        phone=cv_data.phone,
        location=cv_data.location,
        linkedin_url=cv_data.linkedin_url,
        profile_summary=cv_data.profile_summary,
        # FIX: accept personal_info from create payload
        personal_info=cv_data.personal_info or {},
        educations=cv_data.educations or [],
        experiences=cv_data.experiences or [],
        projects=cv_data.projects or [],
        skills=cv_data.skills or [],
        languages=cv_data.languages or [],
        certifications=cv_data.certifications or [],
        current_version=cv_data.current_version or 1,
    )
    db.add(new_cv)
    db.commit()
    db.refresh(new_cv)
    return new_cv


@router.put("/{cv_id}", response_model=CVResponse)
def update_cv(
    cv_id: int,
    cv_data: CVUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a CV.
    The editor sends personal_info as a JSON object. The flat columns
    (full_name, email, …) are synced from it automatically.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # if cv_data.title is not None:
    #     cv.title = cv_data.title

    # FIX: handle personal_info from editor and sync flat cols
    if cv_data.personal_info is not None:
        cv.personal_info = cv_data.personal_info
        pi = cv_data.personal_info
        cv.full_name = pi.get('name') or cv.full_name
        cv.email = pi.get('email') or cv.email
        cv.phone = pi.get('phone') or cv.phone
        cv.location = pi.get('location') or cv.location
        cv.linkedin_url = pi.get('linkedin') or cv.linkedin_url
        cv.profile_summary = pi.get('summary') or cv.profile_summary

    # Flat field overrides (for non-editor callers)
    if cv_data.full_name is not None:
        cv.full_name = cv_data.full_name
    if cv_data.email is not None:
        cv.email = cv_data.email
    if cv_data.phone is not None:
        cv.phone = cv_data.phone
    if cv_data.location is not None:
        cv.location = cv_data.location
    if cv_data.linkedin_url is not None:
        cv.linkedin_url = cv_data.linkedin_url
    if cv_data.profile_summary is not None:
        cv.profile_summary = cv_data.profile_summary

    # Array / JSON sections
    if cv_data.educations is not None:
        cv.educations = cv_data.educations
    if cv_data.experiences is not None:
        cv.experiences = cv_data.experiences
    if cv_data.projects is not None:
        cv.projects = cv_data.projects
    if cv_data.skills is not None:
        cv.skills = cv_data.skills
    if cv_data.languages is not None:
        cv.languages = cv_data.languages
    if cv_data.certifications is not None:
        cv.certifications = cv_data.certifications

    cv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cv)
    return cv


@router.delete("/{cv_id}")
def delete_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a CV and all linked records."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    db.delete(cv)
    db.commit()
    return {"message": "CV deleted successfully"}


# ── File upload ────────────────────────────────────────────────────────────────

@router.post("/{cv_id}/upload", response_model=CVResponse)
def upload_cv_file(
    cv_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF/DOCX file, parse it, and populate all CV columns.
    Also builds personal_info so the editor loads the data correctly.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    try:
        file_path = os.path.join(UPLOAD_DIR, f"{cv_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file.file.read())

        parsed_data = parse_cv_file(file_path)

        # --- Flat fields ---
        cv.title = os.path.splitext(file.filename)[0]
        cv.file_path = file_path
        cv.original_text = parsed_data.get('original_text', '')

        cv.full_name = parsed_data.get('full_name') or parsed_data.get('personalInfo', {}).get('name', '')
        cv.email = parsed_data.get('email') or parsed_data.get('personalInfo', {}).get('email', '')
        cv.phone = parsed_data.get('phone') or parsed_data.get('personalInfo', {}).get('phone', '')
        cv.location = parsed_data.get('location') or parsed_data.get('personalInfo', {}).get('location', '')
        cv.linkedin_url = parsed_data.get('linkedin_url') or parsed_data.get('personalInfo', {}).get('linkedin', '')
        cv.profile_summary = parsed_data.get('profile_summary') or parsed_data.get('personalInfo', {}).get('summary', '')

        # --- JSON sections ---
        cv.educations = parsed_data.get('education') or parsed_data.get('educations', [])
        cv.experiences = parsed_data.get('experience') or parsed_data.get('experiences', [])
        cv.skills = parsed_data.get('skills', [])
        cv.certifications = parsed_data.get('certifications', [])
        cv.languages = parsed_data.get('languages', [])
        cv.projects = parsed_data.get('projects', [])

        # FIX: build personal_info so the editor gets a fully-populated object
        cv.personal_info = {
            'name': cv.full_name or '',
            'title': cv.title or '',
            'email': cv.email or '',
            'phone': cv.phone or '',
            'location': cv.location or '',
            'linkedin': cv.linkedin_url or '',
            'website': parsed_data.get('website', ''),
            'summary': cv.profile_summary or '',
            'photo': cv.photo_path or '',
        }

        cv.current_version = (cv.current_version or 0) + 1
        cv.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(cv)
        return cv

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse CV file: {str(e)}"
        )


@router.post("/{cv_id}/photo")
def upload_photo(
    cv_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile photo for a CV."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    photo_dir = os.path.join(UPLOAD_DIR, "photos")
    os.makedirs(photo_dir, exist_ok=True)
    photo_path = os.path.join(photo_dir, f"{cv_id}_{file.filename}")
    with open(photo_path, "wb") as f:
        f.write(file.file.read())

    cv.photo_path = photo_path
    if cv.personal_info:
        cv.personal_info = {**cv.personal_info, 'photo': photo_path}
    cv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cv)
    return {"photo_path": photo_path}


# ── AI endpoints ───────────────────────────────────────────────────────────────

@router.post("/{cv_id}/analyze")
def analyze_cv_endpoint(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze CV with Groq and return strengths, improvements, score."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    cv_data = _build_cv_data_dict(cv)
    result = analyze_cv(cv_data)
    return result


@router.post("/{cv_id}/customize")
def customize_cv(
    cv_id: int,
    request: CVCustomizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze CV against a job description.
    Returns a keyword match score, matched/missing keywords, and AI suggestions.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    cv_data = _build_cv_data_dict(cv)
    job_desc = request.job_description

    # ── keyword analysis ──────────────────────────────────────────────────────
    # Build a text blob from the CV to extract its keywords
    cv_text_parts = [
        cv.full_name or '',
        cv.profile_summary or '',
        ' '.join([e.get('description', '') or ' '.join(e.get('responsibilities', [])) for e in (cv.experiences or [])]),
        ' '.join([s if isinstance(s, str) else s.get('name', '') for s in (cv.skills or [])]),
    ]
    cv_text = ' '.join(cv_text_parts)
    cv_keywords = extract_keywords(cv_text)
    jd_keywords = extract_keywords(job_desc)
    score, matched, missing = compute_match_score(cv_keywords, jd_keywords)

    # ── AI suggestions (Groq) with rule-based fallback ────────────────────────
    suggestions_data = groq_suggestions(cv_data, job_desc, missing, score)
    if not suggestions_data:
        suggestions_data = rule_based_suggestions(cv_data, job_desc, missing, score)

    # ── Persist customization record ──────────────────────────────────────────
    customization = CVCustomization(
        cv_id=cv_id,
        job_description=job_desc,
        matched_keywords=matched,
        missing_keywords=missing,
        score=score,
    )
    db.add(customization)
    db.flush()   # get customization.id

    db_suggestions = []
    for s in suggestions_data:
        obj = Suggestion(
            cv_id=cv_id,
            customization_id=customization.id,
            title=s['title'],
            description=s['description'],
            suggestion=s['suggestion'],
            section=s.get('section', 'general'),
        )
        db.add(obj)
        db_suggestions.append(obj)

    db.commit()
    db.refresh(customization)
    for obj in db_suggestions:
        db.refresh(obj)

    return {
        "id": customization.id,
        "cv_id": cv_id,
        "score": score,
        "matched_keywords": matched[:20],
        "missing_keywords": missing[:20],
        "suggestions": [SuggestionResponse.from_orm(s) for s in db_suggestions],
    }


@router.post("/{cv_id}/enhance-for-job")
def enhance_cv_for_job_endpoint(
    cv_id: int,
    request: CVCustomizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI-enhanced version of the CV tailored to the job description.
    Returns the enhanced data. Call /apply-ai-changes to persist it.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    cv_data = _build_cv_data_dict(cv)
    result = enhance_cv_for_job(cv_data, request.job_description)

    return {
        "status": result.get('status', 'error'),
        "enhanced_cv": result.get('enhanced_cv', cv_data),
        "message": "AI enhancement complete. Call /apply-ai-changes to save." if result.get('status') == 'success'
                   else "AI unavailable — returning original CV data.",
    }


@router.post("/{cv_id}/apply-ai-changes", response_model=CVResponse)
def apply_ai_changes(
    cv_id: int,
    request: ApplyAIChangesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FIX: NEW ENDPOINT
    Apply AI-enhanced CV data back to the database.
    The frontend calls enhance-for-job → user reviews → calls this to save.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    enhanced = request.enhanced_cv

    # Update all sections from the enhanced payload
    if 'personal_info' in enhanced:
        cv.personal_info = enhanced['personal_info']
        pi = enhanced['personal_info']
        cv.full_name = pi.get('name') or cv.full_name
        cv.email = pi.get('email') or cv.email
        cv.phone = pi.get('phone') or cv.phone
        cv.location = pi.get('location') or cv.location
        cv.linkedin_url = pi.get('linkedin') or cv.linkedin_url
        cv.profile_summary = pi.get('summary') or cv.profile_summary

    if 'profile_summary' in enhanced:
        cv.profile_summary = enhanced['profile_summary']
    if 'experiences' in enhanced:
        cv.experiences = enhanced['experiences']
    if 'educations' in enhanced:
        cv.educations = enhanced['educations']
    if 'skills' in enhanced:
        cv.skills = enhanced['skills']
    if 'certifications' in enhanced:
        cv.certifications = enhanced['certifications']
    if 'languages' in enhanced:
        cv.languages = enhanced['languages']
    if 'projects' in enhanced:
        cv.projects = enhanced['projects']

    cv.current_version = (cv.current_version or 1) + 1
    cv.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(cv)
    return cv


# ── Suggestions ───────────────────────────────────────────────────────────────

@router.get("/{cv_id}/suggestions", response_model=List[SuggestionResponse])
def get_suggestions(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return db.query(Suggestion).filter(Suggestion.cv_id == cv_id).order_by(Suggestion.created_at.desc()).all()


@router.post("/{cv_id}/suggestions/{suggestion_id}/apply")
def apply_suggestion(
    cv_id: int,
    suggestion_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a suggestion as applied (tracks UI state)."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.cv_id == cv_id
    ).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    suggestion.is_applied = True
    suggestion.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(suggestion)
    return {"message": "Suggestion applied", "suggestion": SuggestionResponse.from_orm(suggestion)}