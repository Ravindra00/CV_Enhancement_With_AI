import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test():
    # Because endpoints require user, we might mock it or just check the database.
    from sqlalchemy.orm import Session
    from app.database import engine
    from app.models import UserJobRecommendation
    with Session(engine) as db:
        recs = db.query(UserJobRecommendation).all()
        print("Total recs:", len(recs))

test()
