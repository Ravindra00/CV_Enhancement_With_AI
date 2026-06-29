from sqlalchemy.orm import Session
from app.database import engine
from app.models import UserJobRecommendation, JobListing
import json

with Session(engine) as db:
    recs = db.query(UserJobRecommendation).all()
    print("Total recommendations:", len(recs))
    jobs = db.query(JobListing).all()
    print("Total job listings:", len(jobs))
