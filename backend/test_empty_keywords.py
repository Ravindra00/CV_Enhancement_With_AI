import asyncio
from sqlalchemy.orm import Session
from app.database import engine
from app.services.job_recommender import fetch_jobs_adzuna

async def test():
    with Session(engine) as db:
        jobs = await fetch_jobs_adzuna("", "germany", db)
        print("Jobs length:", len(jobs))

asyncio.run(test())
