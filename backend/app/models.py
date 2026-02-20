from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from app.database import Base


class JobStatus(str, enum.Enum):
    saved = "saved"
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    cvs = relationship("CV", back_populates="user", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="user", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")


class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Basic Info
    full_name = Column(String(150), nullable=True)
    title = Column(String(255), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(150), nullable=True)
    linkedin_url = Column(Text, nullable=True)
    profile_summary = Column(Text, nullable=True)
    
    # JSON Sections (JSONB for PostgreSQL)
    educations = Column(JSON, nullable=True)      # Array of education objects
    experiences = Column(JSON, nullable=True)     # Array of experience objects
    projects = Column(JSON, nullable=True)        # Array of project objects
    skills = Column(JSON, nullable=True)          # Object with skill categories
    languages = Column(JSON, nullable=True)       # Array of language objects
    certifications = Column(JSON, nullable=True)  # Array of certification objects
    
    # File paths
    file_path = Column(String(500), nullable=True)
    photo_path = Column(String(500), nullable=True)
    original_text = Column(Text, nullable=True)
    personal_info = Column(JSON, nullable=True)
    
    # Versioning
    current_version = Column(Integer, default=1, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="cvs")
    customizations = relationship("CVCustomization", back_populates="cv", cascade="all, delete-orphan")
    suggestions = relationship("Suggestion", back_populates="cv", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="cv")
    job_applications = relationship("JobApplication", back_populates="cv")


class CVCustomization(Base):
    __tablename__ = "cv_customizations"

    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id"), nullable=False)
    job_description = Column(Text, nullable=False)
    matched_keywords = Column(JSON, nullable=True)
    customized_data = Column(JSON, nullable=True)
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cv = relationship("CV", back_populates="customizations")
    suggestions = relationship("Suggestion", back_populates="customization")


class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id"), nullable=False)
    customization_id = Column(Integer, ForeignKey("cv_customizations.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=False)
    section = Column(String(50), nullable=True)
    is_applied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cv = relationship("CV", back_populates="suggestions")
    customization = relationship("CVCustomization", back_populates="suggestions")


class CoverLetter(Base):
    """Cover letters tied to a user and optionally to a specific CV."""
    __tablename__ = "cover_letters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id"), nullable=True)  # Optional: linked CV
    title = Column(String(255), nullable=False, default="My Cover Letter")
    # content JSON: { recipient_name, company, role, opening, body, closing, date }
    content = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cover_letters")
    cv = relationship("CV", back_populates="cover_letters")
    job_applications = relationship("JobApplication", back_populates="cover_letter")


class JobApplication(Base):
    """Tracks job applications per user."""
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id"), nullable=True)
    cover_letter_id = Column(Integer, ForeignKey("cover_letters.id"), nullable=True)

    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    job_url = Column(String(1000), nullable=True)
    location = Column(String(255), nullable=True)
    salary_range = Column(String(100), nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.saved, nullable=False)
    applied_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="job_applications")
    cv = relationship("CV", back_populates="job_applications")
    cover_letter = relationship("CoverLetter", back_populates="job_applications")
