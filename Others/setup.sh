#!/bin/bash

# Setup Script for CV Enhancer Project
# This script sets up both frontend and backend environments

set -e  # Exit on error

echo "=========================================="
echo "CV Enhancer Project Setup"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env files exist
check_env() {
    echo -e "${BLUE}Checking environment files...${NC}"
    
    if [ ! -f "backend/.env" ]; then
        echo "Creating backend/.env from template..."
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓ Created backend/.env${NC}"
    else
        echo -e "${GREEN}✓ backend/.env exists${NC}"
    fi
    
    if [ ! -f "frontend/.env" ]; then
        echo "Creating frontend/.env from template..."
        cp frontend/.env.example frontend/.env
        echo -e "${GREEN}✓ Created frontend/.env${NC}"
    else
        echo -e "${GREEN}✓ frontend/.env exists${NC}"
    fi
    
    echo ""
}

# Setup backend
setup_backend() {
    echo -e "${BLUE}Setting up Backend...${NC}"
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        echo -e "${GREEN}✓ Virtual environment created${NC}"
    else
        echo -e "${GREEN}✓ Virtual environment exists${NC}"
    fi
    
    # Activate virtual environment
    source venv/bin/activate || . venv/Scripts/activate
    
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    
    # Create uploads directory
    mkdir -p uploads
    echo -e "${GREEN}✓ Created uploads directory${NC}"
    
    cd ..
    echo ""
}

# Setup frontend
setup_frontend() {
    echo -e "${BLUE}Setting up Frontend...${NC}"
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm install
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ node_modules exists${NC}"
    fi
    
    cd ..
    echo ""
}

# Initialize database (placeholder for future)
init_database() {
    echo -e "${BLUE}Database Setup (Manual Required)${NC}"
    echo ""
    echo "Before running the application:"
    echo "1. Ensure PostgreSQL is running"
    echo "2. Update DATABASE_URL in backend/.env"
    echo "3. Run: cd backend && python -c \"from app.database import Base, engine; Base.metadata.create_all(bind=engine)\""
    echo ""
}

# Display next steps
show_next_steps() {
    echo -e "${GREEN}=========================================="
    echo "Setup Complete!"
    echo "==========================================${NC}"
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Update environment variables:"
    echo "   - Edit backend/.env with PostgreSQL credentials"
    echo "   - Edit frontend/.env if needed"
    echo ""
    echo "2. Start with Docker Compose (recommended):"
    echo "   docker-compose up --build"
    echo ""
    echo "3. OR start manually:"
    echo ""
    echo "   Backend:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python run.py --reload"
    echo ""
    echo "   Frontend (new terminal):"
    echo "   cd frontend"
    echo "   npm start"
    echo ""
    echo "4. Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:8000"
    echo "   - API Docs: http://localhost:8000/docs"
    echo ""
}

# Main setup flow
main() {
    check_env
    setup_backend
    setup_frontend
    init_database
    show_next_steps
}

# Run main function
main
