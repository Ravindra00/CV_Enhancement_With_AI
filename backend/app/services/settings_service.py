from app.database import get_db
from app.models import AppSettings
from functools import lru_cache

def get_setting(key_name: str, db) -> str:
    """Read a setting value from DB. Returns empty string if not set."""
    row = db.query(AppSettings).filter_by(key_name=key_name).first()
    return row.key_value if row and row.key_value else ""

def set_setting(key_name: str, value: str, db) -> None:
    """Upsert a setting value."""
    row = db.query(AppSettings).filter_by(key_name=key_name).first()
    if row:
        row.key_value = value
    else:
        db.add(AppSettings(key_name=key_name, key_value=value))
    db.commit()

def get_all_settings(db) -> list:
    """Return all settings. Mask secret values for display."""
    rows = db.query(AppSettings).all()
    return [
        {
            "key_name":    r.key_name,
            "key_value":   "••••••••" if r.is_secret and r.key_value else r.key_value,
            "description": r.description,
            "is_secret":   r.is_secret,
            "is_set":      bool(r.key_value),
            "updated_at":  r.updated_at,
        }
        for r in rows
    ]
