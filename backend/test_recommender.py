import asyncio
from sqlalchemy.orm import Session
from app.database import engine
from app.models import User
from app.services.job_recommender import generate_daily_recommendations

async def test():
    with Session(engine) as db:
        user = db.query(User).first()
        if not user:
            print("No user found")
            return
            
        print("Testing recommender for user:", user.id)
        print("User preferences:", user.job_preferences)
        
        # We can temporarily mock fetch_jobs_adzuna to see what gets passed in.
        import app.services.job_recommender as jr
        original_fetch = jr.fetch_jobs_adzuna
        
        async def mock_fetch(keywords, location, db_session):
            print(f"Mock called with keywords='{keywords}', location='{location}'")
            return []
            
        jr.fetch_jobs_adzuna = mock_fetch
        jr.fetch_jobs_jsearch = mock_fetch
        
        try:
            # We set user.id and an empty cv_data to prove it pulls from preferences
            await jr.generate_daily_recommendations(user.id, {})
        finally:
            jr.fetch_jobs_adzuna = original_fetch

asyncio.run(test())
