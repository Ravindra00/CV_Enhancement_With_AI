# Development Workflow Guide

This document outlines the development workflow and best practices for the CV Enhancer project.

## Setting Up Development Environment

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git
- Docker & Docker Compose (optional)

### Quick Start

**Using Setup Script:**

```bash
# macOS/Linux
chmod +x setup.sh
./setup.sh

# Windows
setup.bat
```

**Manual Setup:**

See `backend/README.md` and `frontend/README.md` for detailed instructions.

## Development Workflow

### Branch Strategy (Git Flow)

```
main (production)
  ↑
  └── release/v1.0.0
        ↑
develop (staging)
  ↑
  └── feature/new-feature
  └── bugfix/issue-name
```

**Branch Naming:**
- Features: `feature/feature-name`
- Bug fixes: `bugfix/bug-name`
- Hotfixes: `hotfix/bug-name`
- Releases: `release/v1.0.0`

### Creating a Feature

1. **Create feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes:**
   - Write code following project standards
   - Test your changes
   - Commit regularly

3. **Commit messages:**
   ```
   type: subject

   body (optional)

   Types:
   - feat: New feature
   - fix: Bug fix
   - refactor: Code refactoring
   - style: Formatting
   - test: Tests
   - docs: Documentation
   ```

4. **Push and create pull request:**
   ```bash
   git push origin feature/my-feature
   ```
   - Create PR on GitHub
   - Link related issues
   - Add description and screenshots

5. **Code review:**
   - Address feedback
   - Rebase if needed
   - Merge when approved

## Backend Development

### Adding a New API Endpoint

1. **Define the schema** in `app/schemas.py`:
   ```python
   class MyRequest(BaseModel):
       field: str
   
   class MyResponse(BaseModel):
       id: int
       field: str
   ```

2. **Create the model** in `app/models.py` (if needed):
   ```python
   class MyModel(Base):
       __tablename__ = "my_models"
       # ... columns
   ```

3. **Create the route** in `app/routes/`:
   ```python
   @router.get("/endpoint", response_model=MyResponse)
   def my_endpoint(current_user: User = Depends(get_current_user)):
       # Implementation
       pass
   ```

4. **Add tests** in `tests/test_routes.py`:
   ```python
   def test_my_endpoint(client):
       response = client.get("/api/endpoint")
       assert response.status_code == 200
   ```

### Database Migrations (Future: Use Alembic)

```bash
# Current: Manual migration
# Update models in app/models.py
# Restart server - tables created automatically in development
```

### Testing Backend

```bash
# Run all tests
cd backend
pytest

# Run specific test
pytest tests/test_auth.py::test_login

# Run with coverage
pytest --cov=app

# Run with verbose output
pytest -v
```

### Debugging Backend

```bash
# Start with debug logging
export LOG_LEVEL=DEBUG
python run.py --reload

# Use Python debugger
import pdb; pdb.set_trace()

# Check API docs
http://localhost:8000/docs
```

## Frontend Development

### Adding a New Component

1. **Create component file** in `src/components/`:
   ```jsx
   // MyComponent.js
   import React from 'react';

   const MyComponent = ({ prop1, prop2 }) => {
     return <div>{prop1}</div>;
   };

   export default MyComponent;
   ```

2. **Add styling** with Tailwind CSS:
   ```jsx
   <div className="bg-blue-600 text-white p-4 rounded">
     Content
   </div>
   ```

3. **Use in parent component:**
   ```jsx
   import MyComponent from '../components/MyComponent';
   
   function Page() {
     return <MyComponent prop1="value" />;
   }
   ```

### Adding a New Page

1. **Create page file** in `src/pages/`:
   ```jsx
   // MyPage.js
   import React, { useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';

   const MyPage = () => {
     const navigate = useNavigate();

     return <div>Page content</div>;
   };

   export default MyPage;
   ```

2. **Add route** in `src/App.js`:
   ```jsx
   <Route path="/my-page" element={<MyPage />} />
   ```

### State Management with Zustand

1. **Create store** in `src/store/`:
   ```javascript
   import create from 'zustand';

   export const useMyStore = create((set) => ({
     count: 0,
     increment: () => set((state) => ({ count: state.count + 1 })),
   }));
   ```

2. **Use in component:**
   ```jsx
   const { count, increment } = useMyStore();
   return <button onClick={increment}>{count}</button>;
   ```

### API Integration

1. **Add API method** in `src/services/api.js`:
   ```javascript
   export const myAPI = {
     getAll: () => apiClient.get('/endpoints'),
     create: (data) => apiClient.post('/endpoints', data),
   };
   ```

2. **Use in component:**
   ```jsx
   useEffect(() => {
     const fetchData = async () => {
       const response = await myAPI.getAll();
       setData(response.data);
     };
     fetchData();
   }, []);
   ```

### Testing Frontend

```bash
# Run tests
cd frontend
npm test

# Run tests with coverage
npm test -- --coverage

# Test specific file
npm test -- MyComponent.test.js
```

## Git Workflow

### Daily Workflow

```bash
# Start of day - sync with latest changes
git pull origin develop

# Create/switch to feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push changes
git push origin feature/my-feature

# Create PR on GitHub
# After approval, merge and delete branch
```

### Handling Merge Conflicts

```bash
# Pull latest from develop
git pull origin develop

# Resolve conflicts in editor
# Mark as resolved
git add <resolved-files>
git commit -m "chore: resolve merge conflicts"
git push origin feature/my-feature
```

### Reverting Changes

```bash
# Undo uncommitted changes
git checkout -- <file>

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert a specific commit
git revert <commit-hash>
```

## Running the Application

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Run command in container
docker-compose exec backend python -m pytest
```

### Manual Setup

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python run.py --reload

# Terminal 2 - Frontend
cd frontend
npm start

# Terminal 3 - Database (if local)
postgres -D /usr/local/var/postgres
```

## Code Quality

### Linting & Formatting

**Backend:**
```bash
cd backend

# Lint
pylint app/

# Format
black app/

# Type checking (future)
mypy app/
```

**Frontend:**
```bash
cd frontend

# Lint
npm run lint

# Format
npm run format

# Type check (with TypeScript)
npm run type-check
```

### Pre-commit Hooks (Optional)

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
# Add to git hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## Documentation

### Code Documentation

**Python (Backend):**
```python
def my_function(param1: str) -> str:
    """
    Brief description.
    
    Longer description if needed.
    
    Args:
        param1: Description of param1
    
    Returns:
        Description of return value
    
    Raises:
        ValueError: When value is invalid
    """
    pass
```

**JavaScript (Frontend):**
```javascript
/**
 * Brief description.
 * 
 * @param {string} param1 - Description
 * @returns {string} Description of return value
 */
function myFunction(param1) {
  // Implementation
}
```

### README Updates

Update relevant README files when:
- Adding new dependencies
- Changing setup process
- Adding new features
- Updating configuration

## Common Tasks

### Adding a New Python Package

```bash
cd backend
source venv/bin/activate
pip install new-package
pip freeze > requirements.txt
```

### Adding a New npm Package

```bash
cd frontend
npm install new-package
npm install --save-dev dev-package
```

### Database Commands

```bash
# Connect to PostgreSQL
psql -U postgres -d cv_enhancer

# Useful queries
\dt  # List tables
\d table_name  # Describe table
SELECT * FROM users;
```

### Debugging Tips

**Frontend:**
- Use Chrome DevTools (F12)
- React DevTools extension
- Console.log for debugging
- Network tab for API calls

**Backend:**
- Use pdb for debugging
- Check logs in console
- Use FastAPI docs (/docs endpoint)
- Database queries in logs (echo=True)

## Performance Optimization

### Frontend Optimization
- Code splitting with React.lazy()
- Image optimization
- Minification in production
- Service workers for caching

### Backend Optimization
- Database query optimization
- Connection pooling
- Caching with Redis
- Async tasks with Celery

## Security Best Practices

1. Never commit secrets to git
2. Use .env files for sensitive data
3. Validate all user input
4. Use HTTPS in production
5. Keep dependencies updated
6. Use strong passwords (min 12 chars)
7. Implement rate limiting
8. Log security events

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@host:port/database
```

### Node Modules Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Python Virtual Environment Issues

```bash
# Recreate venv
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

**Last Updated**: February 2026
**Maintained by**: Development Team
