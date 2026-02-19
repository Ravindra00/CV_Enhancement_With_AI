# CV Enhancer - Complete Architecture & Implementation Guide

**Last Updated:** February 19, 2026  
**Status:** Major Refactor in Progress - Normalizing Data Structure

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [CV Import & Parsing](#cv-import--parsing)
4. [AI Features](#ai-features)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Development Notes](#development-notes)

---

## 🏗️ System Architecture

### Tech Stack
- **Backend:** FastAPI (Python) on Port 8000
- **Frontend:** React.js on Port 3000
- **Database:** PostgreSQL
- **AI Provider:** Groq API (free tier - gemma2-9b-it model)
- **File Processing:** pdfplumber (PDF), python-docx (DOCX)
- **Web Scraping:** BeautifulSoup4

### Project Structure
```
CV_Enhancer/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.py      # Authentication
│   │   │   ├── cvs.py       # CV management
│   │   │   ├── cover_letters.py
│   │   │   └── job_applications.py
│   │   ├── utils/
│   │   │   ├── cv_parser.py       # CV file parsing & text extraction
│   │   │   ├── ai_integration.py  # Groq API calls
│   │   │   └── pdf_generator.py
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── security.py      # JWT & hashing
│   │   ├── database.py      # DB connection
│   │   └── main.py          # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client (axios)
│   │   ├── store/          # Zustand state management
│   │   └── App.js
│   └── package.json
└── README.md
```

---

## 📊 Database Schema

### CV Table Structure
The `cvs` table now has separate JSON columns for each CV section:

```sql
CREATE TABLE cvs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER FOREIGN KEY,
    title VARCHAR(255),              -- CV name (from filename)
    file_path VARCHAR(500),
    photo_path VARCHAR(500),
    original_text TEXT,              -- Raw extracted text from file
    
    -- Separated JSON columns
    personal_info JSON,              -- {name, email, phone, location, linkedin, website, summary}
    experiences JSON,                -- [{position, company, startDate, endDate, description, skills}]
    educations JSON,                 -- [{institution, degree, field, startDate, endDate, description}]
    skills JSON,                     -- [{name, level, category}]
    certifications JSON,             -- [{name, issuer, issueDate, expiryDate, credentialUrl}]
    languages JSON,                  -- [{language, proficiency}]
    projects JSON,                   -- [{name, description, link, startDate, endDate, technologies}]
    
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Example CV Record

```json
{
    "id": 1,
    "user_id": 1,
    "title": "Rabindra_Pandey_Labenslauf",
    "personal_info": {
        "name": "Rabindra Pandey",
        "email": "ravindrapandey2073@gmail.com",
        "phone": "+49 15210893413",
        "location": "München, Germany",
        "linkedin": "linkedin.com/in/Rabindra",
        "website": "gmail.com"
    },
    "experiences": [
        {
            "company": "TechCorp",
            "position": "Database Administrator",
            "startDate": "06/2022",
            "endDate": "present",
            "description": "Managed MongoDB and SQL databases",
            "skills": ["MongoDB", "SQL", "AWS"]
        }
    ],
    "educations": [
        {
            "institution": "Technical University Munich",
            "degree": "Bachelor",
            "field": "Information Technology",
            "startDate": "2018",
            "endDate": "2022",
            "description": ""
        }
    ],
    "skills": [
        {"name": "MongoDB", "level": "Expert", "category": "Database"},
        {"name": "Python", "level": "Advanced", "category": "Language"}
    ],
    "certifications": [
        {
            "name": "AWS Certified Solutions Architect",
            "issuer": "Amazon",
            "issueDate": "2023-06",
            "expiryDate": "2026-06",
            "credentialUrl": ""
        }
    ],
    "languages": [
        {"language": "German", "proficiency": "Native"},
        {"language": "English", "proficiency": "Fluent"}
    ],
    "projects": []
}
```

---

## 📄 CV Import & Parsing

### Upload Flow

**Endpoint:** `POST /api/cvs/{cv_id}/upload`

```
1. User uploads PDF/DOCX file
   ↓
2. Save file to disk (uploads/ directory)
   ↓
3. Extract text from file
   ├─ PDF: pdfplumber.open() → extract_text()
   ├─ DOCX: python-docx → Document() → get paragraphs
   └─ TXT: read() as UTF-8
   ↓
4. Parse structured data
   ├─ Extract personal info (name, email, phone, LinkedIn, location)
   ├─ Split into sections (experience, education, skills, etc.)
   ├─ Parse each section into arrays
   └─ Handle multilingual keywords (German, English, French, Spanish)
   ↓
5. Save to database
   ├─ cv.title = filename (without extension)
   ├─ cv.personal_info = {...}
   ├─ cv.experiences = [...]
   ├─ cv.educations = [...]
   ├─ cv.skills = [...]
   └─ (+ certifications, languages, projects)
   ↓
6. Return CVResponse with all populated fields
```

### Supported Formats
- **PDF**: Uses `pdfplumber` library
- **DOCX**: Uses `python-docx` library
- **TXT**: Plain text files

### Multilingual Support
CV Parser automatically detects language via keyword matching:

```python
SECTION_KEYWORDS = {
    'experience': [
        # English
        'professional experience', 'work experience', 'experience',
        # German
        'berufserfahrung', 'arbeitserfahrung', 'beruflicher werdegang',
        # French
        'expérience professionnelle', 'expérience',
        # Spanish
        'experiencia laboral', 'experiencia profesional'
    ],
    # ... similar for other sections
}
```

**Examples:**
- German CV "Berufserfahrung" → detected as "experience"
- German "Ausbildung" → detected as "education"
- German "Kenntnisse" → detected as "skills"

---

## 🤖 AI Features

### 1. CV Analysis with Groq API

**Endpoint:** `POST /api/cvs/{cv_id}/analyze`  
**Function:** `CVAnalyzer.analyze_cv(cv_data: Dict) -> Dict`

**Purpose:** Analyze CV content and provide improvement suggestions

**Process:**
```
1. Extract CV sections: personal_info, experiences, educations, skills
2. Build summary: name, email, top skills, experience count, education count
3. Call Groq API with prompt requesting:
   - strengths (list of CV strengths)
   - improvements (list of improvement suggestions)
   - score (0-100 CV quality score)
4. Parse JSON response
5. Return analysis with status
```

**Example Response:**
```json
{
    "analysis": {
        "strengths": [
            "Strong technical background in database administration",
            "Multiple certifications from recognized institutions",
            "Clear career progression over 4+ years"
        ],
        "improvements": [
            "Add more quantifiable achievements",
            "Include metrics for projects completed",
            "Expand on leadership experience"
        ],
        "score": 78
    },
    "status": "success"
}
```

### 2. CV Enhancement for Job Description

**Endpoint:** `POST /api/cvs/{cv_id}/enhance-for-job`  
**Function:** `CVAnalyzer.enhance_cv_for_job(cv_data: Dict, job_description: str) -> Dict`

**Purpose:** Create new AI-enhanced CV tailored to specific job

**Process:**
```
1. Extract current experiences from CV
2. Get job description from request
3. Call Groq API to optimize experience descriptions
4. Replace experience descriptions with AI-optimized versions
5. Return enhanced CV data
6. Frontend can save as new CV or preview
```

**Creates New CV or Updates Current:**
- Option 1: Save as new CV record (preserves original)
- Option 2: Update current CV (overwrites)

### 3. Cover Letter Generation

**Endpoint:** `POST /api/cover-letters/generate-with-ai`  
**Function:** `LLMProvider.generate_cover_letter(cv_data, job_description, user_name) -> str`

**Purpose:** Generate professional cover letter based on CV and job description

**Groq Model:** `gemma2-9b-it` (active, free tier available)

**Fallback:** If API fails, generates basic template-based cover letter

---

## 🔌 API Endpoints

### CV Management

#### Create CV
```
POST /api/cvs
Body: { "title": "My CV" }
Returns: CVResponse
```

#### List User's CVs
```
GET /api/cvs
Returns: List[CVResponse]
```

#### Get Specific CV
```
GET /api/cvs/{cv_id}
Returns: CVResponse with all sections populated
```

#### Upload & Parse CV File
```
POST /api/cvs/{cv_id}/upload
Body: file (multipart/form-data)
Returns: CVResponse with parsed data in:
  - personal_info
  - experiences
  - educations
  - skills
  - certifications
  - languages
  - projects
```

#### Analyze CV with Groq
```
POST /api/cvs/{cv_id}/analyze
Returns: {
    "analysis": {
        "strengths": [...],
        "improvements": [...],
        "score": 0-100
    },
    "status": "success|api_error|parse_error"
}
```

#### Enhance CV for Job
```
POST /api/cvs/{cv_id}/enhance-for-job
Body: { "job_description": "..." }
Returns: {
    "enhanced_cv": { full CV with optimized experiences },
    "status": "success|api_error|parse_error"
}
```

#### Customize CV (with Suggestions)
```
POST /api/cvs/{cv_id}/customize
Body: { "job_description": "..." }
Returns: CVCustomizationResponse with AI suggestions
```

### Cover Letter Management

#### Generate with AI
```
POST /api/cover-letters/generate-with-ai
Body: {
    "cv_id": 1,
    "job_description": "...",
    "title": "Application for Senior DBA"
}
Returns: { "content": "...generated letter..." }
```

#### Extract from URL
```
POST /api/cover-letters/extract-job-from-url
Body: { "url": "https://linkedin.com/jobs/..." }
Returns: { "job_description": "...extracted text..." }
```

---

## 🎨 Frontend Structure

### Components

#### DashboardPage
- Lists all user CVs
- Shows CV cards with:
  - CV name (from filename)
  - Preview of personal info
  - Edit button
  - Generate Letter button (new)
  - Delete button
- Import new CV button

#### CoverLetterGeneratorPage
- Input textarea for job description
- URL extraction field (LinkedIn/Indeed)
- Generate with AI button
- Live preview of generated letter
- Save to database button

#### CVEditorPage
- Edit CV sections manually
- Update personal info
- Add/remove experiences, educations, skills
- Save changes back to database

### State Management (Zustand)

```javascript
// authStore
{
    user,
    token,
    isAuthenticated,
    login(),
    logout(),
    signup()
}

// cvStore (if used)
{
    cvs,
    selectedCV,
    setCVs(),
    selectCV()
}
```

### API Service (`services/api.js`)

```javascript
// CV API
cvAPI.create()
cvAPI.list()
cvAPI.get(id)
cvAPI.update(id, data)
cvAPI.upload(id, file)
cvAPI.analyze(id)           // New
cvAPI.enhanceForJob(id, job) // New
cvAPI.delete(id)

// Cover Letter API
coverLetterAPI.generate(cvId, jobDesc)
coverLetterAPI.extractFromURL(url)
coverLetterAPI.list()
coverLetterAPI.get(id)
coverLetterAPI.delete(id)
```

---

## 🔄 Workflow Example

### Complete Flow: Upload CV → Analyze → Enhance → Generate Letter

```
1. User uploads German CV (PDF)
   POST /api/cvs/1/upload with file
   ↓
   → CV parsed, title = "Rabindra_Pandey_Labenslauf"
   → All sections extracted and saved to DB

2. User requests CV analysis
   POST /api/cvs/1/analyze
   ↓
   → Groq API analyzes content
   → Returns strengths, improvements, score

3. User finds job posting, requests enhancement
   POST /api/cvs/1/enhance-for-job
   Body: { "job_description": "Looking for DBA with AWS..." }
   ↓
   → Groq optimizes experience descriptions
   → Returns enhanced CV
   → User can save as new CV or discard

4. User generates cover letter for that job
   POST /api/cover-letters/generate-with-ai
   Body: {
       "cv_id": 1,
       "job_description": "...",
       "title": "Senior DBA Application"
   }
   ↓
   → Groq generates personalized letter
   → Returns generated text
   → User reviews and saves to database
```

---

## 🛠️ Development Notes

### Key Classes & Functions

#### `cv_parser.py`
- `extract_text_from_file(file_path)` - Extracts text from PDF/DOCX/TXT
- `parse_cv_text(text)` - Parses text into structured dict
- `parse_cv_file(file_path)` - Main entry point
- `_extract_personal_info(text, lines)` - Extracts name, email, phone, etc.
- `_split_into_sections(lines)` - Identifies CV sections
- `_parse_experience(lines)` - Parses job positions
- `_parse_education(lines)` - Parses degrees
- `_parse_skills(content)` - Extracts skills
- `_parse_certifications(lines)` - Extracts certifications
- `_parse_languages(lines)` - Extracts language proficiencies

#### `ai_integration.py`
- `LLMProvider._groq_request(prompt)` - Calls Groq API
- `LLMProvider.generate_cover_letter(cv_data, job_desc, name)` - Generates letter
- `CVAnalyzer.analyze_cv(cv_data)` - Analyzes CV content
- `CVAnalyzer.enhance_cv_for_job(cv_data, job_desc)` - Optimizes for job
- `JobDescriptionExtractor.extract_from_url(url)` - Extracts job description

### Environment Variables

```bash
# Backend (backend/.env)
DATABASE_URL=postgresql://user:password@localhost/cv_enhancer
GROQ_API_KEY=your-groq-api-key-here
```

### Running the Application

```bash
# Terminal 1: Backend
cd backend
python3 run.py --port 8000

# Terminal 2: Frontend
cd frontend
npm start

# Access at http://localhost:3000
```

### Database Migrations

Current schema uses SQLAlchemy ORM without migrations. When changing models:

1. Update `models.py`
2. Delete old database or drop tables
3. Restart application (tables auto-created)

For production, use Alembic for proper migrations.

---

## ⚙️ Configuration

### Groq API

**Free Tier Benefits:**
- High rate limits (3000+ requests/day)
- Models: gemma2-9b-it, mixtral-8x7b-instruct, llama-3.2-11b-vision
- No credit card required
- ~1-3 second response time

**Setup:**
1. Sign up at https://console.groq.com
2. Create API key
3. Add to `.env`: `GROQ_API_KEY=your_key`

### Database

**Development:**
- SQLite (default in local setup)
- Or PostgreSQL if configured

**Production:**
- PostgreSQL required
- Connection pooling recommended

---

## 📝 Known Limitations & Future Work

### Current
- ✅ CV file parsing (PDF, DOCX, TXT)
- ✅ Multilingual support (German, English, French, Spanish)
- ✅ Structured data storage
- ✅ Groq API integration for analysis
- ✅ Cover letter generation

### Planned
- [ ] Multiple CV templates (Modern, Classic, Minimal)
- [ ] PDF CV generation from stored data
- [ ] Advanced matching algorithm for job descriptions
- [ ] Email integration for applications
- [ ] File sync with Google Drive/OneDrive
- [ ] Interview preparation suggestions
- [ ] Salary negotiation guides
- [ ] Database query optimization & indexing
- [ ] Rate limiting for API endpoints
- [ ] Advanced error handling & logging

---

## 🔐 Security

### Current Measures
- JWT token-based authentication
- Password hashing with bcrypt
- Protected routes via `ProtectedRoute` component
- CORS configured
- Input validation with Pydantic

### Recommendations for Production
- HTTPS/TLS encryption
- Rate limiting on API endpoints
- File upload validation (size, type)
- CSRF protection
- API key rotation schedule
- Comprehensive logging & monitoring
- Database encryption at rest
- Automated backup strategy

---

## 📞 Support & Contact

For issues or questions:
1. Check existing issues in project
2. Review error logs: `backend/logs/`
3. Test API endpoints with curl or Postman
4. Verify Groq API key is valid
5. Ensure PostgreSQL is running

---

**Version:** 1.0.0  
**Last Updated:** February 19, 2026  
**Maintained by:** Development Team
