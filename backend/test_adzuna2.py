import asyncio
from sqlalchemy.orm import Session
from app.database import engine
from app.services.job_recommender import fetch_jobs_adzuna

async def test():
    with Session(engine) as db:
        jobs = await fetch_jobs_adzuna("developer python react", "germany", db)
        print("Adzuna:", len(jobs))
        jobs2 = await fetch_jobs_adzuna("developer", "germany", db)
        print("Adzuna developer germany:", len(jobs2))

asyncio.run(test())
