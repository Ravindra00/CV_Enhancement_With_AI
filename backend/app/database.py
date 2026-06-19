from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=True,
    # MySQL drops idle connections after 8 hours by default.
    # pool_recycle recycles connections every hour to prevent stale connection errors.
    pool_recycle=3600,
    # pool_pre_ping tests the connection before using it from the pool.
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
