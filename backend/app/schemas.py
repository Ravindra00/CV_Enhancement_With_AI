from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

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
class CVBase(BaseModel):
    title: Optional[str] = None

class CVCreate(CVBase):
    personal_info: Optional[Dict[str, Any]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    educations: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None

class CVUpdate(CVBase):
    personal_info: Optional[Dict[str, Any]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    educations: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None

class CVResponse(CVBase):
    id: int
    user_id: int
    file_path: Optional[str] = None
    photo_path: Optional[str] = None
    original_text: Optional[str] = None
    personal_info: Optional[Dict[str, Any]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    educations: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# ── AI Customization ──────────────────────────────────────────────────────────
class CVCustomizationRequest(BaseModel):
    job_description: str

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
