# CV Enhancer - Developer Quick Reference Card

## 🚀 Start Application

### Docker (Recommended)
```bash
docker-compose up --build
```

### Manual
```bash
# Terminal 1 - Backend
cd backend && python run.py --reload

# Terminal 2 - Frontend
cd frontend && npm start
```

---

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | User interface |
| Backend | http://localhost:8000 | API server |
| API Docs | http://localhost:8000/docs | Interactive documentation |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |

---

## 📚 Essential Commands

### Backend
```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run
python run.py --reload

# Test
pytest
pytest --cov=app

# Database
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Frontend
```bash
cd frontend

# Setup
npm install

# Run
npm start

# Test
npm test

# Build
npm run build
```

---

## 🗂️ Project Structure (Simplified)

```
Frontend (React)
├── src/components/     → UI components
├── src/pages/         → Page components
├── src/services/api.js → API calls
├── src/store/         → State management

Backend (FastAPI)
├── app/routes/        → API endpoints
├── app/models.py      → Database models
├── app/schemas.py     → Data validation
├── app/security.py    → Auth utilities
├── database.py        → DB connection

Docker
├── docker-compose.yml → Multi-container setup
└── Dockerfile         → Image definitions
```

---

## 🔑 Key API Endpoints

```
POST   /api/auth/signup              # Register user
POST   /api/auth/login               # User login
GET    /api/cvs                      # List CVs
POST   /api/cvs                      # Create CV
GET    /api/cvs/{id}                 # Get CV
PUT    /api/cvs/{id}                 # Update CV
DELETE /api/cvs/{id}                 # Delete CV
POST   /api/cvs/{id}/customize       # AI analysis
GET    /api/cvs/{id}/suggestions     # Get suggestions
POST   /api/cvs/{id}/suggestions/{sid}/apply  # Apply
```

---

## 🔐 Authentication

### Login Flow
```
User → Login → Server validates → Generate JWT
                                 → Store in localStorage
                                 → Include in headers
```

### Using JWT
```javascript
// Already handled by axios interceptor
// Just include in all requests automatically
Authorization: Bearer <token>
```

---

## 📁 Adding New Features

### Add API Endpoint
1. Add model in `backend/app/models.py`
2. Add schema in `backend/app/schemas.py`
3. Add route in `backend/app/routes/`
4. Add API service in `frontend/src/services/api.js`
5. Create component in `frontend/src/components/` or `pages/`

### Add Component
1. Create file in `frontend/src/components/`
2. Use Tailwind CSS for styling
3. Use Zustand for state if needed
4. Export and import in parent

### Add Database Table
1. Create model in `backend/app/models.py`
2. Add relationships
3. Run server to create table
4. Update schemas if needed

---

## 🧪 Testing

```bash
# Backend
cd backend && pytest              # All tests
pytest -v                         # Verbose
pytest tests/test_auth.py         # Specific file
pytest -k test_login              # By name
pytest --cov=app                  # With coverage

# Frontend
cd frontend && npm test            # All tests
npm test -- MyComponent.test.js    # Specific
npm test -- --coverage             # With coverage
```

---

## 🐛 Debugging

### Backend
```python
# Add breakpoint
import pdb; pdb.set_trace()

# View logs
docker-compose logs -f backend
```

### Frontend
```javascript
// Console logging
console.log('value:', value)

// React DevTools browser extension
// Network tab in Chrome DevTools
// Redux DevTools extension
```

---

## 📊 State Management (Zustand)

### Access State
```javascript
const { user, token } = useAuthStore();
```

### Update State
```javascript
const { login } = useAuthStore();
login(userData, token);
```

### Create Store
```javascript
export const useMyStore = create((set) => ({
  data: null,
  setData: (data) => set({ data })
}));
```

---

## 🎨 Styling with Tailwind

```jsx
// Classes for colors, spacing, sizing, etc.
<div className="bg-blue-600 text-white p-4 rounded-lg">
  <h1 className="text-2xl font-bold">Title</h1>
  <p className="text-gray-700 mt-2">Description</p>
</div>
```

---

## 🔄 API Service Pattern

```javascript
// Define endpoint
export const myAPI = {
  getAll: () => apiClient.get('/endpoint'),
  create: (data) => apiClient.post('/endpoint', data),
  update: (id, data) => apiClient.put(`/endpoint/${id}`, data),
  delete: (id) => apiClient.delete(`/endpoint/${id}`)
};

// Use in component
const response = await myAPI.getAll();
```

---

## ⚙️ Configuration Files

### Backend `.env`
```
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-secret-key
ENV=development
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_API_TIMEOUT=30000
```

---

## 📝 Git Workflow

```bash
# Create branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add feature"

# Push and create PR
git push origin feature/my-feature

# After approval, merge
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | Kill process: `lsof -i :8000` |
| DB connection error | Check DATABASE_URL |
| CORS error | Check frontend URL in backend |
| Module not found | Run install: `npm install` or `pip install -r requirements.txt` |
| Container won't start | Check logs: `docker-compose logs` |

---

## 📚 Documentation Quick Links

- **Quick Start**: QUICKSTART.md
- **Development**: DEVELOPMENT.md
- **Architecture**: ARCHITECTURE.md
- **Workflows**: WORKFLOW_VISUALIZATION.md
- **CI/CD**: CICD_STRATEGY.md
- **Frontend README**: frontend/README.md
- **Backend README**: backend/README.md

---

## 💾 Database Queries

```sql
-- Connect
psql -U postgres -d cv_enhancer

-- Common queries
SELECT * FROM users;
SELECT * FROM cvs WHERE user_id = 1;
SELECT * FROM suggestions WHERE cv_id = 1;

-- Useful commands
\dt              -- List tables
\d table_name    -- Describe table
\l               -- List databases
\q               -- Quit
```

---

## 🔑 Important Files

| File | Purpose |
|------|---------|
| `frontend/src/App.js` | App routing |
| `frontend/src/services/api.js` | API client |
| `frontend/src/store/*.js` | State stores |
| `backend/app/main.py` | FastAPI app |
| `backend/app/models.py` | Database models |
| `backend/app/routes/*.py` | API routes |
| `docker-compose.yml` | Container setup |

---

## 🎯 Development Workflow

1. **Plan** → Read docs, understand requirements
2. **Implement** → Write code, follow guidelines
3. **Test** → Run tests, verify functionality
4. **Commit** → Push to feature branch
5. **Review** → Create pull request
6. **Merge** → After approval, merge to develop

---

## 📊 Code Statistics

- **Frontend Files**: ~10 components + pages
- **Backend Files**: ~15 modules
- **Database Tables**: 4
- **API Endpoints**: 10+
- **Lines of Code**: ~3000+

---

## ⏱️ Typical Workflow Times

| Task | Time |
|------|------|
| Setup | 5-10 min |
| Start dev server | 1-2 min |
| Add component | 5-15 min |
| Add API endpoint | 10-20 min |
| Full feature | 1-2 hours |
| Testing | 30 min |

---

## 🎓 Learning Path

1. **Day 1**: QUICKSTART.md, explore project
2. **Day 2**: DEVELOPMENT.md, run application
3. **Day 3**: ARCHITECTURE.md, understand design
4. **Day 4**: Make first code change
5. **Day 5**: Implement first feature

---

## 🚀 Next Steps

- [ ] Run application
- [ ] Create test account
- [ ] Test CV workflow
- [ ] Read development guide
- [ ] Make first code change
- [ ] Submit pull request
- [ ] Implement AI integration
- [ ] Deploy to production

---

## 📞 Quick Help

**Stuck?** Check:
1. DEVELOPMENT.md (troubleshooting)
2. API docs: http://localhost:8000/docs
3. Code comments
4. Individual READMEs

---

## 🎉 Key Takeaways

✅ React + FastAPI + PostgreSQL stack  
✅ Docker containerized  
✅ JWT authentication  
✅ Zustand state management  
✅ Tailwind CSS styling  
✅ SQLAlchemy ORM  
✅ Fully documented  
✅ Ready for deployment  

**Happy coding! 🚀**

---

*Keep this card handy while developing!*  
*Last Updated: February 2026*
