import logging
import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, OTP
from app.schemas import LoginRequest, LoginResponse, SignupRequest, SignupResponse, UserResponse, VerifyPinRequest, ChangePasswordRequest, UserProfileUpdateRequest
from app.security import get_password_hash, verify_password, create_access_token

logger = logging.getLogger(__name__)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 30

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")


@router.post("/login", response_model=LoginResponse)
def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    User login. Tracks failed attempts and locks account after 5 failures.
    On success updates last_login and resets failure counter.
    """
    user = db.query(User).filter(User.email == credentials.email).first()

    # Generic error — don't reveal whether email exists
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Account lockout check
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=423,
            detail=f"Account locked after too many failed attempts. Try again in {remaining} minute(s)."
        )

    # Wrong password
    if not verify_password(credentials.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
            logger.warning("Account locked: user_id=%s ip=%s", user.id, _get_client_ip(request))
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Deactivated account
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
        
    # Unverified email
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email address before logging in.")

    # ── Successful login ──────────────────────────────────────────────────────
    user.last_login = datetime.utcnow()
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return LoginResponse(user=UserResponse.from_orm(user), access_token=access_token)


@router.post("/signup", response_model=SignupResponse)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account and generate a PIN for email verification."""
    import random
    from datetime import datetime, timedelta
    
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        is_verified=False
    )
    db.add(new_user)
    
    # Generate 6-digit PIN
    pin = f"{random.randint(0, 999999):06d}"
    otp = OTP(
        email=data.email,
        pin=pin,
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    db.add(otp)
    
    db.commit()
    db.refresh(new_user)

    # Simulate sending an email for local development
    print(f"\n{'='*50}")
    print(f"📧 PIN VERIFICATION FOR {new_user.email}")
    print(f"👉 Your 6-digit PIN is: {pin}")
    print(f"{'='*50}\n")

    return SignupResponse(user=UserResponse.from_orm(new_user), access_token="")

@router.post("/verify-pin", response_model=LoginResponse)
def verify_pin(data: VerifyPinRequest, db: Session = Depends(get_db)):
    """Verify the 6-digit PIN and log the user in."""
    from datetime import datetime, timedelta
    
    # Find active OTP for this email
    otp = db.query(OTP).filter(
        OTP.email == data.email,
        OTP.pin == data.pin,
        OTP.expires_at > datetime.utcnow()
    ).first()
    
    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired PIN")
        
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
        
    # Mark verified
    user.is_verified = True
    
    # Delete OTP
    db.delete(otp)
    db.commit()
    db.refresh(user)
    
    # Generate login token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return LoginResponse(user=UserResponse.from_orm(user), access_token=access_token)

@router.post("/logout")
def logout():
    """JWT is stateless — this endpoint exists for client-side cleanup."""
    return {"message": "Logged out successfully"}


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change user password."""
    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Hash new password and update user
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.put("/update-profile", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile information."""
    current_user.name = data.name
    if data.job_preferences is not None:
        current_user.job_preferences = data.job_preferences
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)


