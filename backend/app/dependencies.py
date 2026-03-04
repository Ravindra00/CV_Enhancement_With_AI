from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.database import get_db
from app.models import User, AuditLog
from app.security import decode_token

logger = logging.getLogger(__name__)
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user.
    Validates JWT token from Authorization header.
    Also checks that the account is active (H4 fix from production report).
    """
    token = credentials.credentials

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # H4 fix: deactivated users must be blocked even with a valid, non-expired token
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user


def require_ai_access(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: blocks users whose ai_access flag is False from AI endpoints (M2 fix)."""
    if not current_user.ai_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features are not enabled for your account. Contact an administrator."
        )
    return current_user


def write_audit_log(
    db: Session,
    *,
    admin: User,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
    notes: Optional[str] = None,
    log_status: str = "success",
) -> None:
    """
    Helper to persist an audit log entry.
    Call inside admin route handlers BEFORE db.commit().
    Does not commit — the caller's transaction boundary handles it.
    """
    try:
        log = AuditLog(
            admin_id=admin.id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            status=log_status,
            notes=notes,
        )
        db.add(log)
    except Exception as exc:
        logger.warning("Failed to write audit log: %s", exc)
