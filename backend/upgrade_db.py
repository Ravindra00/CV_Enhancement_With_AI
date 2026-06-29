from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN job_preferences JSON NULL"))
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        print(f"Error (may already exist): {e}")

