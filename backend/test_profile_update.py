import asyncio
from sqlalchemy.orm import Session
from app.database import engine
from app.models import User
from app.schemas import UserProfileUpdateRequest
from app.routes.auth import update_profile

def test():
    with Session(engine) as db:
        user = db.query(User).first()
        if not user:
            print("No user found")
            return
            
        print("Before:", user.job_preferences)
        
        req = UserProfileUpdateRequest(
            name=user.name,
            job_preferences={
                "preferred_job_position": "Backend Developer",
                "location": "Berlin",
                "preferred_salary": "$120,000",
                "other_elements": "Python, FastAPI"
            }
        )
        
        updated = update_profile(req, db, user)
        print("After Update:", updated.job_preferences)

test()
