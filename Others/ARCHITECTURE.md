/* CV Enhancer - Architecture Diagram

This document describes the system architecture of the CV Enhancer application.

## High-Level Architecture

┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐           │
│  │   React SPA      │         │   Components     │           │
│  │                  │◄───────►│   - Login Page   │           │
│  │  - Zustand       │         │   - Dashboard    │           │
│  │  - Router        │         │   - CV Editor    │           │
│  │  - Axios         │         │   - Customize    │           │
│  └──────────────────┘         └──────────────────┘           │
│                                                               │
│  Port: 3000 (HTTP)                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                    REST API (JSON)
                            │
┌─────────────────────────────────────────────────────────────┐
│                         API LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │         FastAPI Application                      │       │
│  │                                                   │       │
│  │  ┌─────────────────────────────────────────┐    │       │
│  │  │  Routes                                  │    │       │
│  │  │  ├── /auth (login, signup, logout)      │    │       │
│  │  │  ├── /cvs (CRUD operations)             │    │       │
│  │  │  └── /customize (AI suggestions)        │    │       │
│  │  └─────────────────────────────────────────┘    │       │
│  │                                                   │       │
│  │  ┌─────────────────────────────────────────┐    │       │
│  │  │  Middleware                             │    │       │
│  │  │  ├── CORS                               │    │       │
│  │  │  ├── JWT Authentication                │    │       │
│  │  │  └── Error Handling                     │    │       │
│  │  └─────────────────────────────────────────┘    │       │
│  │                                                   │       │
│  │  ┌─────────────────────────────────────────┐    │       │
│  │  │  Services                               │    │       │
│  │  │  ├── CV Parser                          │    │       │
│  │  │  ├── Suggestion Engine                  │    │       │
│  │  │  └── Security (JWT, Hash)               │    │       │
│  │  └─────────────────────────────────────────┘    │       │
│  │                                                   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Port: 8000 (HTTP)                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                      SQL Queries
                            │
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │      PostgreSQL Database                        │       │
│  │                                                  │       │
│  │  Tables:                                         │       │
│  │  ├── users                                       │       │
│  │  ├── cvs                                         │       │
│  │  ├── cv_customizations                          │       │
│  │  └── suggestions                                │       │
│  │                                                  │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │      File Storage (Uploads)                     │       │
│  │      - CV PDF files                             │       │
│  │      - CV DOCX files                            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Port: 5432 (PostgreSQL)                                      │
└─────────────────────────────────────────────────────────────┘


## Data Flow Diagrams

### Authentication Flow

1. User Signup
   ┌─────────┐                ┌────────┐                ┌──────────┐
   │ Client  │────Sign Up────►│FastAPI │────Hash Pass──►│PostgreSQL│
   └─────────┘                │Server  │                └──────────┘
                               │        │◄───Save User───┘
                               │        │
                               │◄──JWT Token────┐
   ┌─────────┐                │        │       │
   │ Store   │◄──Access Token─┤        │       │
   │ in Local│                └────────┘       │
   │Storage  │                                 │
   └─────────┘

2. User Login
   ┌─────────┐                ┌────────┐                ┌──────────┐
   │ Client  │────Credentials─►│FastAPI │────Query DB──►│PostgreSQL│
   └─────────┐                │Server  │◄──User Data───┘
             │                │        │
             │                │ Verify │
             │                │Password│
             │                │        │
             │                │Create  │
             │◄──JWT Token────│ JWT    │
   ┌─────────┘                └────────┘
   │
   └──► Store Token


### CV Upload & Parse Flow

┌──────────┐
│  User    │
│Selects   │
│CV File   │
└──────────┘
      │
      ▼
┌──────────────────┐
│  Client sends    │
│  multipart file  │
└──────────────────┘
      │
      │ POST /cvs/upload
      ▼
┌──────────────────┐      ┌─────────────┐
│  FastAPI Server  │─────►│ CV Parser   │
│  Saves file      │      │ Extracts    │
│  to disk         │      │ text & data │
└──────────────────┘      └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌──────────────────┐      ┌──────────────────┐
│  Store in        │      │  Structured      │
│  PostgreSQL      │      │  JSON data       │
└──────────────────┘      └──────────────────┘


### CV Customization Flow

┌──────────────┐
│ User Pastes  │
│ Job Desc     │
└──────────────┘
      │
      ▼
┌──────────────────────┐
│  Frontend sends      │
│  CV ID + Job Desc    │
└──────────────────────┘
      │
      │ POST /cvs/{id}/customize
      ▼
┌──────────────────────┐
│  FastAPI Server      │
│  - Load CV           │
│  - Extract keywords  │
│  - Compare with JD   │
└──────────────────────┘
      │
      │ (Future: AI Integration)
      │
      ▼
┌──────────────────────┐
│  Generate            │
│  Suggestions         │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│  Store               │
│  Customization       │
│  & Suggestions       │
│  in Database         │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│  Return to Client    │
│  JSON response       │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│  Frontend displays   │
│  suggestions with    │
│  apply buttons       │
└──────────────────────┘


## Component Architecture

### Frontend Component Hierarchy

App
├── Routes
│   ├── LoginPage
│   ├── SignupPage
│   └── ProtectedRoute
│       ├── Navbar
│       └── Page Component
│           ├── DashboardPage
│           │   └── CVCard (multiple)
│           ├── CVEditorPage
│           │   └── Form Fields
│           └── CVCustomizePage
│               ├── JobDescriptionInput
│               └── SuggestionsList


### Backend Module Organization

app/
├── main.py (FastAPI app initialization)
├── config.py (Configuration)
├── database.py (DB connection & session)
├── models.py (SQLAlchemy models)
├── schemas.py (Pydantic validation)
├── security.py (JWT & passwords)
├── dependencies.py (get_current_user)
├── routes/
│   ├── auth.py (signup, login, logout)
│   └── cvs.py (CRUD & customization)
└── utils/
    └── cv_parser.py (CV text extraction)


## Security Architecture

1. Frontend
   - No secrets stored in code
   - JWT tokens in localStorage
   - HTTPS only in production
   - CORS configured

2. Backend
   - Environment variables for secrets
   - Password hashing (bcrypt)
   - JWT validation on each request
   - Input validation (Pydantic)
   - SQL injection prevention (ORM)
   - CORS middleware

3. Database
   - PostgreSQL user with limited permissions
   - SSL connection support
   - Regular backups
   - Encrypted passwords


## Deployment Architecture

### Docker Compose Setup

┌────────────────────────────────────┐
│       Docker Compose Network       │
├────────────────────────────────────┤
│                                    │
│  ┌──────────┐  ┌──────────────┐   │
│  │ Frontend │  │  Backend API │   │
│  │ Port 3000│  │  Port 8000   │   │
│  └──────────┘  └──────────────┘   │
│                      │              │
│                      ▼              │
│              ┌──────────────┐       │
│              │ PostgreSQL   │       │
│              │ Port 5432    │       │
│              └──────────────┘       │
│                                    │
└────────────────────────────────────┘


## Scalability Considerations

1. **Horizontal Scaling**
   - Load balancer for backend instances
   - CDN for frontend assets
   - Database read replicas

2. **Vertical Scaling**
   - Increase container resources
   - Upgrade database instance

3. **Caching**
   - Redis for session storage
   - Browser caching for frontend
   - Query result caching

4. **Async Processing**
   - Celery for background tasks
   - Queue for CV processing
   - Webhook notifications


## Integration Points

1. **AI/ML Integration**
   - OpenAI API for suggestions
   - HuggingFace for NLP
   - Custom ML models

2. **File Processing**
   - PDF parsing (pypdf)
   - DOCX parsing (python-docx)
   - Image extraction

3. **Email Services**
   - SendGrid for notifications
   - AWS SES for email

4. **Analytics**
   - Google Analytics
   - Sentry for error tracking
   - DataDog for monitoring


## Performance Metrics

- Backend response time: < 500ms
- Database query time: < 100ms
- Frontend load time: < 3s
- API availability: > 99.9%
- Database uptime: 99.95%

*/
