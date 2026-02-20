# CV Model Update Summary

## Overview
Updated the CVs model to use a more structured schema with UUID primary keys and better organized JSON fields for storing resume data.

## Database Schema Changes

### Table: `cvs` (Updated)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Basic Info
    full_name VARCHAR(150),
    title VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    location VARCHAR(150),
    linkedin_url TEXT,
    profile_summary TEXT,

    -- JSON Sections (JSONB for PostgreSQL)
    education JSONB,
    experience JSONB,
    projects JSONB,
    skills JSONB,
    languages JSONB,
    certifications JSONB,
    interests JSONB,

    current_version INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Model Changes (SQLAlchemy)

### Changes to `CV` model in `backend/app/models.py`:

1. **Primary Key**: Changed from `Integer` to `UUID`
   - `id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)`

2. **Basic Information Fields**:
   - `full_name` → VARCHAR(150)
   - `title` → VARCHAR(150)
   - `email` → VARCHAR(150)
   - `phone` → VARCHAR(50)
   - `location` → VARCHAR(150)
   - `linkedin_url` → TEXT
   - `profile_summary` → TEXT

3. **Removed Fields**:
   - `file_path` - No longer tracked
   - `photo_path` - No longer tracked
   - `original_text` - No longer tracked
   - `personal_info` - Split into individual fields
   - `is_active` - Removed

4. **JSON Section Fields** (using JSONB):
   - `education` - Array of education objects
   - `experience` - Array of experience objects
   - `projects` - Array of project objects
   - `skills` - Object with skill categories
   - `languages` - Array of language objects
   - `certifications` - Array of certification objects
   - `interests` - Array of interests

5. **New Field**:
   - `current_version` - Integer, defaults to 1

### Foreign Key Updates:
- `CVCustomization.cv_id` → Changed from `Integer` to `UUID`
- `Suggestion.cv_id` → Changed from `Integer` to `UUID`
- `CoverLetter.cv_id` → Changed from `Integer` to `UUID`
- `JobApplication.cv_id` → Changed from `Integer` to `UUID`

## Schema Changes (Pydantic)

### New CV Schemas:

#### EducationItem
```python
class EducationItem(BaseModel):
    degree: str
    field_of_study: str
    institution_name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None  # e.g., "Present"
    final_project: Optional[str] = None
```

#### ExperienceItem
```python
class ExperienceItem(BaseModel):
    job_title: str
    company_name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: Optional[List[str]] = None
```

#### LanguageItem
```python
class LanguageItem(BaseModel):
    language: str
    level: str  # e.g., "Native", "B2", "Professional"
```

#### SkillsObject
```python
class SkillsObject(BaseModel):
    programming: Optional[List[str]] = None
    cloud: Optional[List[str]] = None
    databases: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    management: Optional[List[str]] = None
```

#### ProjectItem
```python
class ProjectItem(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    link: Optional[str] = None
```

#### CertificationItem
```python
class CertificationItem(BaseModel):
    name: str
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_url: Optional[str] = None
```

### Updated CVResponse
Now includes:
- `id: UUID` (instead of int)
- Individual fields: full_name, title, email, phone, location, linkedin_url, profile_summary
- JSON arrays: education, experience, projects, certifications, languages, interests
- JSON object: skills
- Version tracking: current_version

## API Route Changes

### Updated Endpoint Signatures:
All endpoints now accept `UUID` for cv_id instead of `int`:

- `GET /cvs/{cv_id}` - Get specific CV
- `PUT /cvs/{cv_id}` - Update CV
- `DELETE /cvs/{cv_id}` - Delete CV
- `POST /cvs/{cv_id}/upload` - Upload and parse CV file
- `POST /cvs/{cv_id}/analyze` - Analyze CV
- `POST /cvs/{cv_id}/customize` - Customize CV
- `POST /cvs/{cv_id}/enhance-for-job` - Enhance CV for job
- `GET /cvs/{cv_id}/suggestions` - Get suggestions
- `POST /cvs/{cv_id}/suggestions/{suggestion_id}/apply` - Apply suggestion

### Create CV Request (CVCreate)
Now accepts:
```python
{
    "full_name": "string",
    "title": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin_url": "string",
    "profile_summary": "string",
    "education": [...],
    "experience": [...],
    "projects": [...],
    "skills": {...},
    "languages": [...],
    "certifications": [...],
    "interests": [...],
    "current_version": 1
}
```

## Data Structure Examples

### Education Array
```json
[
  {
    "degree": "Masters Degree",
    "field_of_study": "Philosophy and Computer Science",
    "institution_name": "Universität Bayreuth",
    "location": "Germany",
    "start_date": "2025-10-01",
    "end_date": null,
    "status": "Present"
  },
  {
    "degree": "B.Sc.",
    "field_of_study": "Informatik und Informationstechnologie",
    "institution_name": "Tribhuvan University",
    "location": "Kathmandu, Nepal",
    "start_date": "2017-10-01",
    "end_date": "2021-12-01",
    "final_project": "Offensive Content Detection System mit Naïve Bayes"
  }
]
```

### Experience Array
```json
[
  {
    "job_title": "Datenbankadministrator",
    "company_name": "Vanilla Transtechnor Pvt. Ltd.",
    "location": "Kathmandu, Nepal",
    "start_date": "2022-06-01",
    "end_date": "2025-01-01",
    "responsibilities": [
      "Managed MS SQL Always On",
      "MySQL Group Replication",
      "PostgreSQL Streaming Replication",
      "MongoDB Replica Sets",
      "Designed ETL pipelines",
      "Performance tuning",
      "Collaboration with DevOps teams"
    ]
  }
]
```

### Skills Object
```json
{
  "programming": ["Python", "SQL", "Bash", "C#", "ASP.NET", "JS", "PHP"],
  "cloud": ["AWS", "GCP", "Azure", "Docker"],
  "databases": ["MS SQL Server", "MySQL", "PostgreSQL", "MongoDB", "MariaDB"],
  "tools": ["Power BI", "Tableau", "Git", "Conda"],
  "management": ["Scrum", "Leadership", "Incident Management"]
}
```

### Languages Array
```json
[
  { "language": "Nepali", "level": "Native" },
  { "language": "German", "level": "B2" },
  { "language": "English", "level": "Professional" },
  { "language": "Hindi", "level": "Professional" }
]
```

## Migration Steps

1. **Backup Database**: Create a backup of the existing PostgreSQL database
2. **Create Extension**: Run `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
3. **Migration Strategy**:
   - Option A: Drop and recreate tables (for development)
   - Option B: Create migration script to preserve data (for production)

## Files Modified

1. `backend/app/models.py`
   - Updated CV model with UUID and new fields
   - Updated foreign keys in related models

2. `backend/app/schemas.py`
   - Added new Pydantic models for data structures
   - Updated CV schemas with new fields
   - Updated UUID imports for CoverLetterResponse and JobApplicationResponse

3. `backend/app/routes/cvs.py`
   - Updated all endpoints to use UUID for cv_id
   - Updated CV creation to use new field names
   - Updated CV parsing logic to map to new structure

## Testing Recommendations

1. Test CV creation with all fields
2. Test CV upload and parsing
3. Test CV customization with UUID references
4. Test suggestions with new structure
5. Verify foreign key relationships work correctly

## Notes

- UUID v4 is auto-generated by the database using pgcrypto extension
- Skills are now stored as a single object with categories rather than a list
- Each CV section (education, experience, etc.) is properly typed for better data integrity
- Current version field allows for versioning and tracking CV changes over time
