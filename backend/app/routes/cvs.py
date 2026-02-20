from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, CV, Suggestion, CVCustomization
from app.schemas import CVResponse, CVCreate, CVUpdate, CVCustomizationRequest, SuggestionResponse
from app.dependencies import get_current_user
from app.utils.cv_parser import parse_cv_file
from app.utils.ai_integration import analyze_cv, enhance_cv_for_job
import os
from datetime import datetime
import tempfile

router = APIRouter(prefix="/cvs", tags=["cvs"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[CVResponse])
def get_all_cvs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all CVs for the current user."""
    cvs = db.query(CV).filter(CV.user_id == current_user.id).all()
    return cvs

@router.get("/{cv_id}", response_model=CVResponse)
def get_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific CV by ID."""
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    return cv

@router.post("", response_model=CVResponse)
def create_cv(
    cv_data: CVCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new CV."""
    new_cv = CV(
        user_id=current_user.id,
        full_name=cv_data.full_name,
        title=cv_data.title,
        email=cv_data.email,
        phone=cv_data.phone,
        location=cv_data.location,
        linkedin_url=cv_data.linkedin_url,
        profile_summary=cv_data.profile_summary,
        educations=cv_data.educations or [],
        experiences=cv_data.experiences or [],
        projects=cv_data.projects or [],
        skills=cv_data.skills or {},
        languages=cv_data.languages or [],
        certifications=cv_data.certifications or [],
        current_version=cv_data.current_version or 1
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
    """Update a CV."""
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Update only provided fields
    if cv_data.full_name is not None:
        cv.full_name = cv_data.full_name
    if cv_data.title is not None:
        cv.title = cv_data.title
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
    """Delete a CV."""
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    db.delete(cv)
    db.commit()
    
    return {"message": "CV deleted successfully"}

@router.post("/{cv_id}/upload", response_model=CVResponse)
def upload_cv_file(
    cv_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a CV file (PDF or DOCX) and parse the content into separate fields."""
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    try:
        # Save file to disk
        file_path = os.path.join(UPLOAD_DIR, f"{cv_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        
        # Parse the file to extract structured content
        parsed_data = parse_cv_file(file_path)
        
        # Update CV with parsed data - save into separate columns
        cv.title = os.path.splitext(file.filename)[0]  # CV name = filename without extension
        
        # Map parser output to new CV schema
        cv.full_name = parsed_data.get('full_name') or parsed_data.get('personalInfo', {}).get('name')
        cv.email = parsed_data.get('email') or parsed_data.get('personalInfo', {}).get('email')
        cv.phone = parsed_data.get('phone') or parsed_data.get('personalInfo', {}).get('phone')
        cv.location = parsed_data.get('location') or parsed_data.get('personalInfo', {}).get('location')
        cv.linkedin_url = parsed_data.get('linkedin_url') or parsed_data.get('personalInfo', {}).get('linkedin')
        cv.profile_summary = parsed_data.get('profile_summary') or parsed_data.get('personalInfo', {}).get('summary')
        
        # Map array sections
        cv.educations = parsed_data.get('education', [])
        cv.experiences = parsed_data.get('experience', [])
        cv.skills = parsed_data.get('skills', {})
        cv.certifications = parsed_data.get('certifications', [])
        cv.languages = parsed_data.get('languages', [])
        cv.projects = parsed_data.get('projects', [])
        cv.current_version = 1
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

@router.post("/{cv_id}/analyze")
def analyze_cv_endpoint(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze CV using Groq API.
    Returns strengths, improvements, and quality score.
    """
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Build CV data dict from all columns
    cv_data = {
        'full_name': cv.full_name,
        'email': cv.email,
        'phone': cv.phone,
        'location': cv.location,
        'linkedin_url': cv.linkedin_url,
        'profile_summary': cv.profile_summary,
        'experiences': cv.experiences or [],
        'educations': cv.educations or [],
        'skills': cv.skills or {},
        'certifications': cv.certifications or [],
        'languages': cv.languages or [],
        'projects': cv.projects or []
    }
    
    # Use Groq API to analyze CV
    analysis_result = analyze_cv(cv_data)
    
    return analysis_result

@router.post("/{cv_id}/customize")
def customize_cv(
    cv_id: int,
    request: CVCustomizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Customize CV based on job description.
    Uses Groq API to analyze CV and generate AI-powered suggestions.
    """
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Build CV data dict from all columns
    cv_data = {
        'full_name': cv.full_name,
        'email': cv.email,
        'phone': cv.phone,
        'location': cv.location,
        'linkedin_url': cv.linkedin_url,
        'profile_summary': cv.profile_summary,
        'experiences': cv.experiences or [],
        'educations': cv.educations or [],
        'skills': cv.skills or {},
        'certifications': cv.certifications or [],
        'languages': cv.languages or [],
        'projects': cv.projects or []
    }
    
    # Use Groq API to analyze CV and generate suggestions
    analysis_result = analyze_cv(cv_data)
    
    # Create customization record
    customization = CVCustomization(
        cv_id=cv_id,
        job_description=request.job_description,
        matched_keywords=analysis_result.get('analysis', {}).get('improvements', []),
        score=analysis_result.get('analysis', {}).get('score', 0)
    )
    
    db.add(customization)
    db.flush()
    
    # Generate suggestions based on job description
    # Compare job keywords with CV content
    suggestions_data = []
    
    # Suggestion 1: CV analysis-based
    if analysis_result.get('analysis'):
        analysis = analysis_result['analysis']
        if analysis.get('improvements'):
            suggestions_data.append({
                "title": "AI Recommendations",
                "description": "Based on CV analysis",
                "suggestion": " | ".join(analysis['improvements'][:2]),  # Top 2 improvements
                "section": "general"
            })
    
    # Suggestion 2: Job description matching
    job_desc_lower = request.job_description.lower()
    current_skills = []
    if cv.skills:
        if isinstance(cv.skills, dict):
            for skill_list in cv.skills.values():
                if isinstance(skill_list, list):
                    current_skills.extend([str(s).lower() for s in skill_list])
        elif isinstance(cv.skills, list):
            current_skills = [str(s).lower() for s in cv.skills]
    
    if 'python' in job_desc_lower and 'python' not in ' '.join(current_skills):
        suggestions_data.append({
            "title": "Missing Technical Skill",
            "description": "Job description mentions Python",
            "suggestion": "Add Python to your skills section",
            "section": "skills"
        })
    
    if 'aws' in job_desc_lower or 'cloud' in job_desc_lower:
        suggestions_data.append({
            "title": "Cloud Skills",
            "description": "Job requires cloud platform experience",
            "suggestion": "Highlight any AWS, Azure, or GCP experience you have",
            "section": "skills"
        })
    
    # Suggestion 3: Summary enhancement
    if not cv.profile_summary:
        suggestions_data.append({
            "title": "Add Professional Summary",
            "description": "A summary helps recruiters understand your value",
            "suggestion": "Add a 2-3 sentence professional summary at the top of your CV",
            "section": "summary"
        })
    
    # Create suggestion records
    for suggestion_data in suggestions_data:
        suggestion = Suggestion(
            cv_id=cv_id,
            customization_id=customization.id,
            title=suggestion_data["title"],
            description=suggestion_data["description"],
            suggestion=suggestion_data["suggestion"],
            section=suggestion_data["section"]
        )
        db.add(suggestion)
    
    db.commit()
    db.refresh(customization)
    
    return {
        "id": customization.id,
        "cv_id": cv_id,
        "job_description": customization.job_description,
        "score": customization.score,
        "suggestions": [SuggestionResponse.from_orm(s) for s in customization.suggestions]
    }

@router.post("/{cv_id}/enhance-for-job")
def enhance_cv_for_job_endpoint(
    cv_id: int,
    request: CVCustomizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create AI-enhanced CV tailored to a specific job description.
    Uses Groq API to optimize experience descriptions.
    Returns the enhanced CV data.
    """
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Build CV data dict from all columns
    cv_data = {
        'full_name': cv.full_name,
        'email': cv.email,
        'phone': cv.phone,
        'location': cv.location,
        'linkedin_url': cv.linkedin_url,
        'profile_summary': cv.profile_summary,
        'experiences': cv.experiences or [],
        'educations': cv.educations or [],
        'skills': cv.skills or {},
        'certifications': cv.certifications or [],
        'languages': cv.languages or [],
        'projects': cv.projects or []
    }
    
    # Use Groq API to enhance CV for this job
    enhancement_result = enhance_cv_for_job(cv_data, request.job_description)
    
    if enhancement_result.get('status') == 'success':
        return {
            "status": "success",
            "enhanced_cv": enhancement_result.get('enhanced_cv'),
            "message": "CV successfully enhanced for the job description"
        }
    else:
        return {
            "status": enhancement_result.get('status', 'error'),
            "enhanced_cv": cv_data,
            "message": "Could not enhance CV with AI, returning original"
        }

@router.get("/{cv_id}/suggestions", response_model=List[SuggestionResponse])
def get_suggestions(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all suggestions for a CV."""
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    suggestions = db.query(Suggestion).filter(Suggestion.cv_id == cv_id).all()
    return suggestions

@router.post("/{cv_id}/suggestions/{suggestion_id}/apply")
def apply_suggestion(
    cv_id: int,
    suggestion_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply a suggestion to the CV."""
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.cv_id == cv_id
    ).first()
    
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found"
        )
    
    suggestion.is_applied = True
    suggestion.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(suggestion)
    
    return {"message": "Suggestion applied successfully", "suggestion": SuggestionResponse.from_orm(suggestion)}
