# Frontend Setup & Running Guide

## ✅ Frontend Installation Complete

The frontend dependencies have been successfully installed using `npm install --legacy-peer-deps`.

### System Requirements
- Node.js 16+ (you have it installed)
- npm 7+
- Backend API running on http://localhost:8000

### Environment Configuration

The `.env` file has been created with the following settings:
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_API_TIMEOUT=30000
```

### Available npm Scripts

```bash
# Start the development server (port 3000)
npm start

# Build for production
npm build

# Run tests
npm test

# Eject configuration (⚠️ not reversible)
npm run eject
```

## 🚀 Starting the Frontend

### Option 1: Direct npm command (Recommended)

```bash
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer/frontend
BROWSER=none npm start
```

This will:
- Start the React development server on port 3000
- Enable auto-reload on file changes
- Not automatically open a browser

### Option 2: Using bash script

```bash
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer
bash start-frontend.sh
```

### Option 3: Specify custom port

```bash
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer/frontend
PORT=3001 BROWSER=none npm start
```

## 📍 Access the Application

Once both backend and frontend are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Swagger API Docs**: http://localhost:8000/docs
- **ReDoc API Docs**: http://localhost:8000/redoc

## 🔧 Troubleshooting

### Port Already in Use (Port 3000)

```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 BROWSER=none npm start
```

### Module Not Found Errors

```bash
# Clear npm cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Backend Connection Issues

Make sure the backend is running:
```bash
# Check if backend is responding
curl http://localhost:8000/health

# If not running, start it from backend directory:
cd backend
python3 run.py --reload
```

## 📦 Dependencies

The frontend uses:
- **React 18.2.0** - UI framework
- **React Router 6.20.0** - Client-side routing
- **Zustand 4.4.1** - State management
- **Tailwind CSS 3.4.1** - Styling
- **Axios 1.6.2** - HTTP client
- **React PDF** - CV PDF viewing
- **React Dropzone** - File upload handling

## ✨ Features Ready to Use

1. **User Authentication**
   - Signup
   - Login
   - Logout
   - Protected routes

2. **CV Management**
   - Upload CV files
   - View all CVs
   - Edit CV content
   - Delete CVs

3. **CV Customization**
   - Input job description
   - View AI suggestions
   - Apply suggestions

## 🎯 Next Steps

1. Start the backend: `cd backend && python3 run.py --reload`
2. Start the frontend: `cd frontend && npm start`
3. Open http://localhost:3000 in your browser
4. Create a test account or login
5. Test the CV upload and customization workflow

## 📝 Notes

- The frontend automatically reloads when you modify source files
- All API calls go through the Axios instance in `src/services/api.js`
- State is managed with Zustand stores in `src/store/`
- Styling uses Tailwind CSS utility classes
- Environment variables are loaded from `.env` file

