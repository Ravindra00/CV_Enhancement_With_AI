import asyncio
from sqlalchemy.orm import Session
from app.database import engine
from app.services.job_recommender import fetch_jobs_adzuna
from app.models import AppSettings

async def test():
    with Session(engine) as db:
        app_id = db.query(AppSettings).filter_by(key_name="ADZUNA_APP_ID").first()
        app_key = db.query(AppSettings).filter_by(key_name="ADZUNA_APP_KEY").first()
        print(f"App ID: {app_id.key_value if app_id else None}")
        print(f"App Key: {app_key.key_value if app_key else None}")
        
        jobs = await fetch_jobs_adzuna("developer", "berlin", db)
        print("Jobs length:", len(jobs))
        if len(jobs) == 0:
            print("No jobs returned. Check Adzuna response.")
        else:
            print(jobs[0])

asyncio.run(test())
