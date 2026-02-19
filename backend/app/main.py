from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import CORS_ORIGINS, API_TITLE, API_VERSION, API_DESCRIPTION
from app.database import Base, engine
from app.routes import auth, cvs, cover_letters, job_applications
import os

# Create all DB tables (including new ones)
Base.metadata.create_all(bind=engine)

# Ensure upload dirs exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/photos", exist_ok=True)

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Permissive for development
    allow_credentials=False,    # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files as static assets
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register all routers
app.include_router(auth.router, prefix="/api")
app.include_router(cvs.router, prefix="/api")
app.include_router(cover_letters.router, prefix="/api")
app.include_router(job_applications.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "CV Enhancer API", "version": API_VERSION, "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
