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
        user_id = user.id
    
    cv_data = {
        "jobTitle": "developer",
        "skills": ["python", "react"],
        "yearsExp": 3,
        "location": "germany"
    }
    print(f"Running generation for user {user_id}")
    try:
        await generate_daily_recommendations(user_id, cv_data)
        print("Generation finished successfully")
    except Exception as e:
        print(f"Error during generation: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
