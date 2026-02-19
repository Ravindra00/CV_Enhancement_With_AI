# CV Enhancer - Complete Running Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- PostgreSQL running at 172.16.48.134:15432
- Python 3.11+
- Node.js 16+
- npm 7+

### Step 1: Start the Backend API

```bash
# Terminal 1: Backend
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer/backend

# Install dependencies (if not already done)
pip3 install -r requirements.txt

# Start the server
python3 run.py --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

✅ Backend is ready at: **http://localhost:8000**

### Step 2: Start the Frontend

```bash
# Terminal 2: Frontend
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer/frontend

# Install dependencies (if not already done)
npm install --legacy-peer-deps

# Start the development server
BROWSER=none npm start
```

Expected output:
```
On Your Network: http://192.168.x.x:3000
  Local:         http://localhost:3000
```

✅ Frontend is ready at: **http://localhost:3000**

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (Port 3000)                    │
│                  React Frontend App                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP/REST API Calls
                       │ (Axios with JWT)
                       ↓
┌─────────────────────────────────────────────────────────┐
│                   FastAPI (Port 8000)                    │
│                   Backend API Server                     │
│  ┌──────────────────────────────────────────────┐       │
│  │  Routes:                                      │       │
│  │  - /api/auth (signup, login, logout)         │       │
│  │  - /api/cvs (CRUD operations)                │       │
│  │  - /api/cvs/customize (AI suggestions)       │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ SQLAlchemy ORM
                       │ Pydantic Validation
                       ↓
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                         │
│              (172.16.48.134:15432)                       │
│                                                          │
│  Tables:                                                 │
│  ├─ users (authentication)                              │
│  ├─ cvs (CV storage)                                    │
│  ├─ cv_customizations (customization history)           │
│  └─ suggestions (AI suggestions)                        │
└─────────────────────────────────────────────────────────┘
```

## 🔍 Verification Checklist

### Backend Verification
```bash
# Test health endpoint
curl http://localhost:8000/health

# View API documentation
# Open in browser: http://localhost:8000/docs
```

Expected response:
```json
{
  "status": "healthy"
}
```

### Frontend Verification
```bash
# Check if frontend is serving HTML
curl http://localhost:3000 | grep -o "React App" | head -1
```

Expected output:
```
React App
```

### Full Integration Test
1. Open http://localhost:3000 in browser
2. Click "Sign Up"
3. Create test account:
   - Name: Test User
   - Email: test@example.com
   - Password: Password123!
4. Login with credentials
5. You should see the Dashboard page

## 📁 Project Structure

```
CV_Enhancer/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry point
│   │   ├── models.py                 # Database models
│   │   ├── schemas.py                # Validation schemas
│   │   ├── security.py               # Auth utilities
│   │   ├── dependencies.py           # Dependency injection
│   │   ├── config.py                 # Configuration
│   │   ├── database.py               # DB connection
│   │   ├── routes/
│   │   │   ├── auth.py               # Auth endpoints
│   │   │   └── cvs.py                # CV endpoints
│   │   └── utils/
│   │       └── cv_parser.py          # CV parsing utilities
│   ├── run.py                        # Entry point
│   ├── requirements.txt              # Python dependencies
│   ├── .env                          # Environment config
│   └── Dockerfile                    # Docker image
│
├── frontend/                         # React frontend
│   ├── public/
│   │   └── index.html               # HTML entry point
│   ├── src/
│   │   ├── App.js                   # Main component
│   │   ├── index.js                 # React root
│   │   ├── index.css                # Global styles
│   │   ├── components/
│   │   │   ├── Navbar.js            # Navigation bar
│   │   │   └── ProtectedRoute.js    # Route guard
│   │   ├── pages/
│   │   │   ├── LoginPage.js         # Login form
│   │   │   ├── SignupPage.js        # Registration form
│   │   │   ├── DashboardPage.js     # CV management
│   │   │   ├── CVEditorPage.js      # Edit CV
│   │   │   └── CVCustomizePage.js   # AI customization
│   │   ├── services/
│   │   │   └── api.js               # Axios instance
│   │   └── store/
│   │       ├── authStore.js         # Auth state
│   │       └── cvStore.js           # CV state
│   ├── package.json                 # npm dependencies
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── .env                         # Environment config
│   └── Dockerfile                   # Docker image
│
├── docker-compose.yml               # Multi-container setup
├── BACKEND_FIXES.md                 # Backend troubleshooting
├── FRONTEND_SETUP.md                # Frontend guide
├── README.md                        # Project overview
└── ARCHITECTURE.md                  # System architecture

```

## 🛠️ Common Commands

### Backend Commands
```bash
# Navigate to backend
cd backend

# Install dependencies
pip3 install -r requirements.txt

# Start development server (auto-reload)
python3 run.py --reload

# Start production server
python3 run.py --host 0.0.0.0

# Initialize database
python3 -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine)"

# View API documentation
# Open browser to: http://localhost:8000/docs
```

### Frontend Commands
```bash
# Navigate to frontend
cd frontend

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps

# Start development server
BROWSER=none npm start

# Build for production
npm run build

# Run tests
npm test

# Clean install
rm -rf node_modules && npm install --legacy-peer-deps
```

### Project-level Commands
```bash
# Start both services with Docker Compose (if Docker is running)
docker-compose up --build

# View project status
ps aux | grep -E "npm|python"
```

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Issue: Address already in use (port 8000)
# Solution: Kill existing process
lsof -ti:8000 | xargs kill -9
python3 run.py --reload

# Issue: Database connection failed
# Solution: Verify PostgreSQL is running
psql -h 172.16.48.134 -U cv_editor_user -d cv_enhancer
```

### Frontend Won't Start
```bash
# Issue: Port 3000 already in use
# Solution: Use different port
PORT=3001 BROWSER=none npm start

# Issue: Module not found
# Solution: Clean install
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Issue: TypeScript errors
# Solution: These are warnings only, frontend will still run
```

### API Connection Issues
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS is enabled
curl -I http://localhost:8000/api/auth/login

# Check frontend can reach backend
curl http://localhost:3000/
```

## 📚 Documentation

- **Architecture**: See `ARCHITECTURE.md` for system design
- **Backend API**: http://localhost:8000/docs (Swagger UI)
- **Backend Setup**: See `BACKEND_FIXES.md` for troubleshooting
- **Frontend Setup**: See `FRONTEND_SETUP.md` for details
- **Project Index**: See `PROJECT_INDEX.md` for file organization

## 🎯 What Works

✅ User Authentication (JWT-based)
✅ User Registration
✅ CV Upload & Storage
✅ CV Editing
✅ CV Customization (mock AI)
✅ API Documentation (Swagger)
✅ Protected Routes
✅ State Management
✅ Responsive UI (Tailwind CSS)

## 🚧 Coming Soon

🔄 Real AI Integration (OpenAI/HuggingFace)
🔄 PDF/DOCX Parsing
🔄 Unit Tests
🔄 Email Notifications
🔄 Advanced Analytics
🔄 Performance Monitoring

## 📞 Support

If you encounter issues:
1. Check relevant `.md` file (BACKEND_FIXES.md or FRONTEND_SETUP.md)
2. Review error messages in terminal
3. Verify both services are running
4. Check PostgreSQL database connection
5. Clear browser cache and restart both servers

---

**Last Updated**: February 18, 2026
**Status**: ✅ Ready to Use
