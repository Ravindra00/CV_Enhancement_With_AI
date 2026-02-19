# 🚀 CV Enhancer - 2-Minute Startup

## Copy & Paste Commands

### Open Terminal 1 (Backend)
```bash
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer/backend && python3 run.py --reload
```

### Open Terminal 2 (Frontend)
```bash
cd /Users/Ravindra/Desktop/Antigravity/CV_Enhancer/frontend && BROWSER=none npm start
```

### Open Browser
```
http://localhost:3000
```

---

## ✅ What's Working

```
✅ Backend API (port 8000)
✅ Frontend (port 3000)
✅ PostgreSQL Database
✅ All Authentication Routes
✅ CV Management
✅ CV Customization
✅ API Documentation
```

---

## 🎯 Test the App

1. **Create Account**
   - Email: test@example.com
   - Password: Test123!

2. **Login**
   - Use created credentials

3. **Upload CV**
   - Click "Upload CV"
   - Select a text file
   - View in dashboard

4. **Customize**
   - Select CV from dashboard
   - Click "Customize"
   - Enter job description
   - View suggestions

---

## 📊 URLs

| What | URL |
|------|-----|
| App | http://localhost:3000 |
| API | http://localhost:8000 |
| Docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

---

## 🆘 Problems?

```bash
# Port in use?
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Module missing?
cd backend && pip3 install -r requirements.txt
cd frontend && npm install --legacy-peer-deps

# DB issues?
psql -h 172.16.48.134 -U cv_editor_user -d cv_enhancer
```

---

**That's it! You're ready to go.** 🎉
