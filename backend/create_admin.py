import sys
sys.path.insert(0, '/opt/backend')

from app.database import SessionLocal
from app.models import User
from app.security import get_password_hash

def main():
    db = SessionLocal()
    email = "ravindrapandey2073@gmail.com"
    name = "Rabindra Pandey"
    password = "AdminPassword123!" 

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        existing_user.is_superuser = True
        existing_user.is_verified = True
        existing_user.name = name
        print("User already exists. Promoted to superuser.")
    else:
        new_user = User(
            name=name,
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_superuser=True,
            is_verified=True,
            ai_access=True
        )
        db.add(new_user)
        print("User created and promoted to superuser.")

    db.commit()
    db.close()
    print(f"Done. User: {email}, Password: {password}")

if __name__ == "__main__":
    main()
