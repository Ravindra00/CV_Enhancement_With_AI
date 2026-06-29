from fastapi import APIRouter, Depends
from app.database import get_db
from app.services.settings_service import get_all_settings, set_setting
from app.dependencies import get_current_user   # assuming this exists, we will check

router = APIRouter(prefix="/api/settings", tags=["settings"])

def require_admin(user=Depends(get_current_user)):
    from fastapi import HTTPException
    if not getattr(user, 'is_superuser', False):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

@router.get("/")
async def list_settings(db=Depends(get_db), user=Depends(require_admin)):
    return get_all_settings(db)

@router.patch("/{key_name}")
async def update_setting(
    key_name: str,
    payload:  dict,   # { "value": "new_api_key_here" }
    db=Depends(get_db),
    user=Depends(require_admin)
):
    set_setting(key_name, payload.get("value", ""), db)
    return {"status": "updated", "key_name": key_name}
