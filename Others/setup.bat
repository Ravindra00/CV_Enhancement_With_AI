@echo off
REM Setup Script for CV Enhancer Project (Windows)
REM This script sets up both frontend and backend environments

echo ==========================================
echo CV Enhancer Project Setup (Windows)
echo ==========================================
echo.

REM Check if .env files exist
echo Checking environment files...

if not exist "backend\.env" (
    echo Creating backend\.env from template...
    copy backend\.env.example backend\.env
    echo [OK] Created backend\.env
) else (
    echo [OK] backend\.env exists
)

if not exist "frontend\.env" (
    echo Creating frontend\.env from template...
    copy frontend\.env.example frontend\.env
    echo [OK] Created frontend\.env
) else (
    echo [OK] frontend\.env exists
)

echo.

REM Setup backend
echo Setting up Backend...

cd backend

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment exists
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
echo [OK] Dependencies installed

if not exist "uploads" (
    mkdir uploads
    echo [OK] Created uploads directory
)

cd ..

echo.

REM Setup frontend
echo Setting up Frontend...

cd frontend

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
    echo [OK] Dependencies installed
) else (
    echo [OK] node_modules exists
)

cd ..

echo.

REM Display next steps
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next Steps:
echo.
echo 1. Update environment variables:
echo    - Edit backend\.env with PostgreSQL credentials
echo    - Edit frontend\.env if needed
echo.
echo 2. Start with Docker Compose (recommended):
echo    docker-compose up --build
echo.
echo 3. OR start manually:
echo.
echo    Backend:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    python run.py --reload
echo.
echo    Frontend (new terminal):
echo    cd frontend
echo    npm start
echo.
echo 4. Access the application:
echo    - Frontend: http://localhost:3000
echo    - Backend API: http://localhost:8000
echo    - API Docs: http://localhost:8000/docs
echo.

pause
