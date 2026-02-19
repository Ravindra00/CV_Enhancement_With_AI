# CV Enhancer - Complete Project

A comprehensive CV enhancement platform that allows users to upload, customize, and optimize their CVs based on job descriptions using AI-powered suggestions.

## Project Overview

### Features

1. **User Authentication**
   - Secure signup and login
   - JWT-based session management
   - Password hashing with bcrypt

2. **CV Management**
   - Upload CV files (PDF, DOCX)
   - Store multiple CVs
   - Edit CV content
   - Parse and structure CV data

3. **AI-Powered Customization**
   - Analyze CV against job descriptions
   - Generate intelligent suggestions
   - Match keywords and skills
   - Apply suggestions to CV

4. **User Interface**
   - Modern React-based frontend
   - Responsive design with Tailwind CSS
   - Real-time updates
   - Intuitive CV editor

5. **API**
   - RESTful FastAPI backend
   - Comprehensive documentation
   - Bearer token authentication
   - CORS enabled

## Tech Stack

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Build Tool**: Create React App

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (PyJWT)
- **Password**: Passlib + bcrypt

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Database**: PostgreSQL 15

## Project Structure

```
CV_Enhancer/
├── frontend/                    # React application
│   ├── public/                  # Static files
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service layer
│   │   ├── store/              # Zustand state management
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   ├── package.json            # Dependencies
│   ├── tailwind.config.js      # Tailwind config
│   ├── Dockerfile              # Frontend Docker image
│   └── README.md               # Frontend documentation
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── routes/             # API endpoints
│   │   │   ├── auth.py         # Auth endpoints
│   │   │   └── cvs.py          # CV management
│   │   ├── utils/              # Utility functions
│   │   │   └── cv_parser.py    # CV parsing
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── security.py         # JWT & password utils
│   │   ├── database.py         # DB connection
│   │   ├── dependencies.py     # Dependency injection
│   │   ├── config.py           # Configuration
│   │   └── main.py             # FastAPI app
│   ├── tests/                  # Unit tests
│   ├── run.py                  # Application entry point
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend Docker image
│   └── README.md               # Backend documentation
│
├── docker-compose.yml          # Docker compose configuration
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OR
- Node.js 16+, Python 3.8+, PostgreSQL 12+

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository:
```bash
cd CV_Enhancer
```

2. Start all services:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to backend:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
# Update DATABASE_URL with your PostgreSQL connection
```

5. Run the server:
```bash
python run.py --reload
```

Backend will be available at `http://localhost:8000`

#### Frontend Setup

1. Navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
# Update REACT_APP_API_URL if backend is on different port
```

4. Start development server:
```bash
npm start
```

Frontend will be available at `http://localhost:3000`

## Workflow

### User Journey

1. **Sign Up**: User creates account with email and password
2. **Login**: User authenticates and receives JWT token
3. **Dashboard**: View all uploaded CVs
4. **Upload CV**: Upload PDF or DOCX file
5. **Edit CV**: Customize CV content with form-based editor
6. **Customize**: 
   - Paste job description
   - Get AI-powered suggestions
   - Apply suggestions to CV
7. **Download**: Export customized CV

### API Workflow

```
Client → Frontend → API Server → Database
  ↓         ↓          ↓          ↓
HTTP      React     FastAPI    PostgreSQL
```

## API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication
All protected endpoints require Bearer token:
```
Authorization: Bearer <access_token>
```

### Key Endpoints

#### Authentication
- `POST /auth/signup` - Register user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

#### CV Management
- `GET /cvs` - List user CVs
- `POST /cvs` - Create CV
- `GET /cvs/{id}` - Get CV details
- `PUT /cvs/{id}` - Update CV
- `DELETE /cvs/{id}` - Delete CV
- `POST /cvs/{id}/upload` - Upload file

#### Customization
- `POST /cvs/{id}/customize` - Analyze with job description
- `GET /cvs/{id}/suggestions` - Get suggestions
- `POST /cvs/{id}/suggestions/{suggestionId}/apply` - Apply suggestion

## Database Schema

### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  hashed_password VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### CVs
```sql
CREATE TABLE cvs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  file_path VARCHAR(500),
  parsed_data JSON,
  original_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Customizations & Suggestions
- `cv_customizations` - Stores customization history
- `suggestions` - Stores AI-generated suggestions

## Configuration

### Backend Configuration (`app/config.py`)

```python
DATABASE_URL = "postgresql://user:pass@host:port/db"
SECRET_KEY = "your-secret-key"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
CORS_ORIGINS = ["http://localhost:3000"]
```

### Frontend Configuration (`.env`)

```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_API_TIMEOUT=30000
```

## Future Enhancements

- [ ] **AI Integration**: OpenAI, HuggingFace, or custom ML models
- [ ] **File Parsing**: PDF/DOCX extraction (pypdf, python-docx)
- [ ] **Email Verification**: User signup verification
- [ ] **Advanced Analytics**: CV performance metrics
- [ ] **Templates**: Professional CV templates
- [ ] **Export Options**: PDF, DOCX, HTML export
- [ ] **Collaboration**: Share CVs with recruiters
- [ ] **Rate Limiting**: API throttling
- [ ] **Caching**: Redis layer
- [ ] **Webhooks**: Async processing
- [ ] **GraphQL**: Alternative API
- [ ] **Mobile App**: React Native/Flutter
- [ ] **CI/CD Pipeline**: GitHub Actions, GitLab CI
- [ ] **Monitoring**: Logging, error tracking
- [ ] **Database Migrations**: Alembic

## Deployment

### Docker Deployment

1. Build images:
```bash
docker-compose build
```

2. Start services:
```bash
docker-compose up -d
```

3. Check status:
```bash
docker-compose ps
```

4. View logs:
```bash
docker-compose logs -f
```

### Cloud Deployment (Example: AWS)

1. Push images to ECR
2. Deploy with ECS or Kubernetes
3. Set up RDS for PostgreSQL
4. Configure CloudFront for CDN
5. Set up CI/CD with CodePipeline

## Testing

### Backend Tests
```bash
cd backend
pytest
pytest --cov=app
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check connection string in `.env`
- Verify database exists

### API Not Responding
- Check backend is running on port 8000
- Verify CORS origins in backend config
- Check firewall rules

### Frontend Cannot Reach API
- Verify `REACT_APP_API_URL` in `.env`
- Check backend is accessible
- Check browser console for errors

## Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/feature-name`
4. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: support@cvenhancer.com
- Documentation: See individual README files

---

**Last Updated**: February 2026
**Version**: 1.0.0
