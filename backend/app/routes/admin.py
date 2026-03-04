"""
Admin routes — only accessible to users with is_superuser=True.

Endpoints:
  GET    /api/admin/users                         — paginated + searchable user list
  POST   /api/admin/users                         — create user (admin-created)
  GET    /api/admin/users/{user_id}               — detailed user view
  PATCH  /api/admin/users/{user_id}               — toggle flags (is_active, ai_access, is_superuser)
  DELETE /api/admin/users/{user_id}               — delete user
  POST   /api/admin/users/{user_id}/unlock        — clear account lockout
  POST   /api/admin/users/{user_id}/reset-password — generate temp password
  GET    /api/admin/stats                         — enhanced dashboard statistics
  GET    /api/admin/audit-logs                    — paginated audit log viewer
"""
import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, write_audit_log
from app.models import AuditLog, CV, User
from app.schemas import (
    AdminCreateUserRequest,
    AuditLogResponse,
    UserResponse,
)
from app.security import get_password_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ── Guard: require superuser ─────────────────────────────────────────────────

def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superuser access required")
    return current_user


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")


# ── Inline response schemas ──────────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    is_superuser: bool
    ai_access: bool
    cv_count: int
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    ai_access: Optional[bool] = None


class PaginatedUsersResponse(BaseModel):
    users: List[UserAdminResponse]
    total: int
    page: int
    limit: int
    pages: int


class PaginatedAuditLogsResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    limit: int


# ── Helper ───────────────────────────────────────────────────────────────────

def _build_user_admin_response(user: User, cv_count: int) -> UserAdminResponse:
    return UserAdminResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active if user.is_active is not None else True,
        is_superuser=user.is_superuser if user.is_superuser is not None else False,
        ai_access=user.ai_access if user.ai_access is not None else True,
        cv_count=cv_count,
        last_login=user.last_login,
        failed_login_attempts=user.failed_login_attempts or 0,
        locked_until=user.locked_until,
        created_at=user.created_at,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedUsersResponse)
def list_all_users(
    request: Request,
    search: Optional[str] = Query(None, description="Filter by name or email (case-insensitive)"),
    status_filter: Optional[str] = Query(None, alias="status", description="active | inactive | locked"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Paginated, searchable list of all users. Fixes N+1 by joining CV count in one query."""
    # Build base query
    q = db.query(User)

    if search:
        like = f"%{search.lower()}%"
        q = q.filter(
            (func.lower(User.name).like(like)) | (func.lower(User.email).like(like))
        )

    now = datetime.utcnow()
    if status_filter == "active":
        q = q.filter(User.is_active == True)
    elif status_filter == "inactive":
        q = q.filter(User.is_active == False)
    elif status_filter == "locked":
        q = q.filter(User.locked_until > now)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Single aggregated query for CV counts — fixes N+1
    user_ids = [u.id for u in users]
    cv_counts: dict = {}
    if user_ids:
        rows = (
            db.query(CV.user_id, func.count(CV.id))
            .filter(CV.user_id.in_(user_ids))
            .group_by(CV.user_id)
            .all()
        )
        cv_counts = {row[0]: row[1] for row in rows}

    result = [_build_user_admin_response(u, cv_counts.get(u.id, 0)) for u in users]
    pages = max(1, (total + limit - 1) // limit)
    return PaginatedUsersResponse(users=result, total=total, page=page, limit=limit, pages=pages)


@router.post("/users", response_model=UserAdminResponse, status_code=201)
def create_user(
    request: Request,
    body: AdminCreateUserRequest,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Admin creates a new user account directly (no signup flow needed)."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    new_user = User(
        name=body.name,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        is_superuser=body.is_superuser,
        ai_access=body.ai_access,
        is_active=True,
    )
    db.add(new_user)
    db.flush()  # get new_user.id

    write_audit_log(
        db,
        admin=admin,
        action="user_created",
        entity_type="User",
        entity_id=str(new_user.id),
        new_values={"name": body.name, "email": body.email, "is_superuser": body.is_superuser, "ai_access": body.ai_access},
        ip_address=_get_client_ip(request),
    )
    db.commit()
    db.refresh(new_user)
    return _build_user_admin_response(new_user, 0)


@router.get("/users/{user_id}", response_model=UserAdminResponse)
def get_user_detail(
    user_id: int,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Detailed view of a single user including CV count."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    cv_count = db.query(func.count(CV.id)).filter(CV.user_id == user_id).scalar() or 0
    return _build_user_admin_response(user, cv_count)


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    request: Request,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Toggle flags on a user (is_active, is_superuser, ai_access). Writes audit log."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and body.is_superuser is False:
        raise HTTPException(status_code=400, detail="Cannot remove your own superuser access")

    old_vals: dict = {
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "ai_access": user.ai_access,
    }
    new_vals: dict = {}

    if body.is_active is not None:
        user.is_active = body.is_active
        new_vals["is_active"] = body.is_active
    if body.is_superuser is not None:
        user.is_superuser = body.is_superuser
        new_vals["is_superuser"] = body.is_superuser
    if body.ai_access is not None:
        user.ai_access = body.ai_access
        new_vals["ai_access"] = body.ai_access

    user.updated_at = datetime.utcnow()

    if new_vals:
        write_audit_log(
            db,
            admin=admin,
            action="user_updated",
            entity_type="User",
            entity_id=str(user_id),
            old_values={k: old_vals[k] for k in new_vals},
            new_values=new_vals,
            ip_address=_get_client_ip(request),
        )

    db.commit()
    db.refresh(user)
    cv_count = db.query(func.count(CV.id)).filter(CV.user_id == user.id).scalar() or 0
    return _build_user_admin_response(user, cv_count)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Permanently delete a user and all their data. Writes audit log."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account via admin panel")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    write_audit_log(
        db,
        admin=admin,
        action="user_deleted",
        entity_type="User",
        entity_id=str(user_id),
        old_values={"name": user.name, "email": user.email},
        ip_address=_get_client_ip(request),
    )
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted"}


@router.post("/users/{user_id}/unlock")
def unlock_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Clear account lockout so the user can log in again."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.locked_until = None
    user.failed_login_attempts = 0
    write_audit_log(
        db,
        admin=admin,
        action="user_unlocked",
        entity_type="User",
        entity_id=str(user_id),
        ip_address=_get_client_ip(request),
    )
    db.commit()
    return {"message": "Account unlocked successfully"}


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    request: Request,
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """
    Generate a temporary password for the user.
    Returns the temp password in the response — admin should share it securely.
    Also clears any lockout.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate a 16-char random password with strong character set
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    temp_password = "".join(secrets.choice(alphabet) for _ in range(16))

    user.hashed_password = get_password_hash(temp_password)
    user.locked_until = None
    user.failed_login_attempts = 0
    write_audit_log(
        db,
        admin=admin,
        action="password_reset",
        entity_type="User",
        entity_id=str(user_id),
        ip_address=_get_client_ip(request),
        notes="Admin-initiated password reset",
    )
    db.commit()
    return {
        "message": "Password reset successfully. Share the temporary password securely.",
        "temporary_password": temp_password,
        "user_email": user.email,
    }


@router.get("/stats")
def get_stats(
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Enhanced dashboard statistics."""
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    ai_restricted = db.query(func.count(User.id)).filter(User.ai_access == False).scalar() or 0
    locked_out = db.query(func.count(User.id)).filter(User.locked_until > now).scalar() or 0
    new_this_month = db.query(func.count(User.id)).filter(User.created_at >= month_ago).scalar() or 0
    total_cvs = db.query(func.count(CV.id)).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "ai_restricted_users": ai_restricted,
        "locked_out_users": locked_out,
        "new_users_this_month": new_this_month,
        "total_cvs": total_cvs,
    }


@router.get("/audit-logs", response_model=PaginatedAuditLogsResponse)
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action_filter: Optional[str] = Query(None, alias="action"),
    entity_type_filter: Optional[str] = Query(None, alias="entity_type"),
    admin_id_filter: Optional[int] = Query(None, alias="admin_id"),
    admin: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Paginated audit log. Filterable by action, entity_type, and admin_id."""
    q = db.query(AuditLog)

    if action_filter:
        q = q.filter(AuditLog.action == action_filter)
    if entity_type_filter:
        q = q.filter(AuditLog.entity_type == entity_type_filter)
    if admin_id_filter:
        q = q.filter(AuditLog.admin_id == admin_id_filter)

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Build responses with admin name
    admin_ids = list({log.admin_id for log in logs})
    admin_map: dict = {}
    if admin_ids:
        admins = db.query(User.id, User.name).filter(User.id.in_(admin_ids)).all()
        admin_map = {a.id: a.name for a in admins}

    log_responses = [
        AuditLogResponse(
            id=log.id,
            admin_id=log.admin_id,
            admin_name=admin_map.get(log.admin_id),
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            status=log.status or "success",
            notes=log.notes,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return PaginatedAuditLogsResponse(logs=log_responses, total=total, page=page, limit=limit)
