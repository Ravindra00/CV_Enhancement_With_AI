from app.database import SessionLocal
from app.models import SystemConfig

def get_config(key: str, default: str = "") -> str:
    """
    Fetch a configuration value from the database synchronously.
    If the key doesn't exist, returns the default.
    Since this is called inside fast endpoints without DB passing, we use a short-lived SessionLocal.
    """
    with SessionLocal() as db:
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if config:
            return config.value
        return default

def set_config(key: str, value: str, description: str = ""):
    """
    Update or create a configuration value in the database.
    """
    with SessionLocal() as db:
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if config:
            config.value = value
            if description:  
                config.description = description
        else:
            config = SystemConfig(key=key, value=value, description=description)
            db.add(config)
        db.commit()
