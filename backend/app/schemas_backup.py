from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from uuid import UUID

# ── Auth ──────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

class SignupRequest(UserCreate):
    pass

class SignupResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

# ── CV ────────────────────────────────────────────────────────────────────────
class EducationItem(BaseModel):
    degree: str
    field_of_study: str
    institution_name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None  # e.g., "Present"
    final_project: Optional[str] = None

class ExperienceItem(BaseModel):
    job_title: str
    company_name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: Optional[List[str]] = None

class LanguageItem(BaseModel):
    language: str
    level: str  # e.g., "Native", "B2", "Professional"

class SkillsObject(BaseModel):
    programming: Optional[List[str]] = None
    cloud: Optional[List[str]] = None
    databases: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    management: Optional[List[str]] = None

class ProjectItem(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    link: Optional[str] = None

class CertificationItem(BaseModel):
    name: str
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_url: Optional[str] = None

class CVBase(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_summary: Optional[str] = None

class CVCreate(BaseModel):
    educations: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Dict[str, Any]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    current_version: Optional[int] = 1

class CVUpdate(BaseModel):
    educations: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Dict[str, Any]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None

class CVResponse(BaseModel):
    id: int
    user_id: int
    educations: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    # skills: Optional[Dict[str, Any]] = None
    # skills: Optional[List[Dict[str, Any]]] = None
    skills: Optional[Dict[str, List[str]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    file_path: Optional[str] = None
    photo_path: Optional[str] = None
    original_text: Optional[str] = None
    personal_info: Optional[Dict[str, Any]] = None
    current_version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# ── AI Customization ──────────────────────────────────────────────────────────
class CVCustomizationRequest(BaseModel):
    job_description: str

class ApplyAIChangesRequest(BaseModel):
    """Payload for applying AI-enhanced CV data back to the database."""
    enhanced_cv: Dict[str, Any]

class SuggestionResponse(BaseModel):
    id: int
    title: str
    description: str
    suggestion: str
    section: Optional[str] = None
    is_applied: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ── Cover Letter ──────────────────────────────────────────────────────────────
class CoverLetterContent(BaseModel):
    """Structured content of a cover letter."""
    recipient_name: Optional[str] = ""
    company: Optional[str] = ""
    role: Optional[str] = ""
    date: Optional[str] = ""
    opening: Optional[str] = ""      # Opening paragraph
    body: Optional[str] = ""         # Main body
    closing: Optional[str] = ""      # Closing paragraph
    signature: Optional[str] = ""    # Your name

class CoverLetterCreate(BaseModel):
    title: Optional[str] = "My Cover Letter"
    cv_id: Optional[int] = None
    content: Optional[Dict[str, Any]] = {}

class CoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    cv_id: Optional[int] = None
    content: Optional[Dict[str, Any]] = None

class CoverLetterResponse(BaseModel):
    id: int
    user_id: int
    cv_id: Optional[int] = None
    title: str
    content: Optional[Dict[str, Any]] = {}
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# ── Job Application ───────────────────────────────────────────────────────────
class JobStatusEnum(str, Enum):
    saved = "saved"
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"

class JobApplicationCreate(BaseModel):
    company: str
    role: str
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[JobStatusEnum] = JobStatusEnum.saved
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    cv_id: Optional[int] = None
    cover_letter_id: Optional[int] = None

class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[JobStatusEnum] = None
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    cv_id: Optional[int] = None
    cover_letter_id: Optional[int] = None

class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    company: str
    role: str
    job_url: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    status: str
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    cv_id: Optional[int] = None
    cover_letter_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ErrorResponse(BaseModel):
    detail: str
