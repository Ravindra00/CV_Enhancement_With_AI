"""
Database migration utilities. Runs on startup to add missing columns.
MySQL-compatible version: uses information_schema with DATABASE() scoping,
splits multi-statement blocks, and uses MySQL DDL syntax.
"""
import logging
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger(__name__)


def _add_column_if_missing(conn, table: str, column: str, col_type: str = "JSON") -> bool:
    """Add column if it doesn't exist. Returns True if added, False if already exists.
    Uses DATABASE() to scope the check to the current MySQL database.
    """
    check_sql = text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = :table
          AND column_name = :column
    """)
    result = conn.execute(check_sql, {"table": table, "column": column}).fetchone()
    if result:
        return False
    conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{column}` {col_type} NULL"))
    return True


def _rename_column_if_exists(conn, table: str, old_name: str, new_name: str) -> bool:
    """Rename column if old exists and new doesn't. Returns True if renamed.
    MySQL 8.0+ supports RENAME COLUMN syntax.
    """
    check_sql = text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = :table
          AND column_name = :column
    """)
    old_exists = conn.execute(check_sql, {"table": table, "column": old_name}).fetchone()
    new_exists = conn.execute(check_sql, {"table": table, "column": new_name}).fetchone()

    if old_exists and not new_exists:
        conn.execute(text(f"ALTER TABLE `{table}` RENAME COLUMN `{old_name}` TO `{new_name}`"))
        return True
    return False


def _table_exists(conn, table: str) -> bool:
    """Check if a table exists in the current database."""
    result = conn.execute(text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = :table
    """), {"table": table}).fetchone()
    return result is not None


def _index_exists(conn, table: str, index_name: str) -> bool:
    """Check if an index exists on a table in the current database."""
    result = conn.execute(text("""
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = :table
          AND index_name = :index_name
    """), {"table": table, "index_name": index_name}).fetchone()
    return result is not None


def run_migrations() -> None:
    """Add missing columns and rename old columns. Safe to run multiple times."""
    try:
        with engine.begin() as conn:  # begin() handles commit/rollback automatically

            # CV table migrations
            for col_name in ["personal_info", "interests", "embedding", "custom_sections", "theme"]:
                try:
                    added = _add_column_if_missing(conn, "cvs", col_name)
                    if added:
                        logger.info(f"Migration: added column cvs.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for cvs.{col_name} failed: {e}")

            # Users table: superuser + AI access control
            for col_name, col_type, default in [
                ("is_superuser", "TINYINT(1)", "0"),
                ("ai_access",    "TINYINT(1)", "1"),
            ]:
                try:
                    check_sql = text("""
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'users'
                          AND column_name = :col
                    """)
                    if not conn.execute(check_sql, {"col": col_name}).fetchone():
                        conn.execute(text(
                            f"ALTER TABLE `users` ADD COLUMN `{col_name}` TINYINT(1) NOT NULL DEFAULT {default}"
                        ))
                        logger.info(f"Migration: added users.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for users.{col_name} failed: {e}")

            # CVCustomization table migrations
            try:
                added = _add_column_if_missing(conn, "cv_customizations", "missing_keywords")
                if added:
                    logger.info("Migration: added column cv_customizations.missing_keywords")
            except Exception as e:
                logger.warning(f"Migration for cv_customizations.missing_keywords failed: {e}")

            # Rename old columns in cv_customizations
            try:
                if _rename_column_if_exists(conn, "cv_customizations", "score", "ats_score"):
                    logger.info("Migration: renamed cv_customizations.score → ats_score")
                if _rename_column_if_exists(conn, "cv_customizations", "customized_data", "customized_snapshot"):
                    logger.info("Migration: renamed cv_customizations.customized_data → customized_snapshot")
            except Exception as e:
                logger.warning(f"Column rename failed: {e}")

            # Add missing columns in cv_customizations
            for col_name, col_type in [
                ("ats_score", "INT"),
                ("similarity_score", "INT"),
                ("customized_snapshot", "JSON"),
            ]:
                try:
                    added = _add_column_if_missing(conn, "cv_customizations", col_name, col_type)
                    if added:
                        logger.info(f"Migration: added column cv_customizations.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for cv_customizations.{col_name} failed: {e}")

            # Suggestions table migrations
            try:
                if _rename_column_if_exists(conn, "suggestions", "suggestion", "suggestion_text"):
                    logger.info("Migration: renamed suggestions.suggestion → suggestion_text")
                else:
                    added = _add_column_if_missing(conn, "suggestions", "suggestion_text", "TEXT")
                    if added:
                        logger.info("Migration: added column suggestions.suggestion_text")
                        # Copy data from old column if it exists
                        check_old = text("""
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = DATABASE()
                              AND table_name = 'suggestions'
                              AND column_name = 'suggestion'
                        """)
                        if conn.execute(check_old).fetchone():
                            conn.execute(text(
                                "UPDATE suggestions SET suggestion_text = suggestion WHERE suggestion_text IS NULL"
                            ))
                            logger.info("Migration: copied data from suggestions.suggestion to suggestion_text")
            except Exception as e:
                logger.warning(f"Migration for suggestions.suggestion_text failed: {e}")

            # Users table: lockout + last-login tracking
            for col_name, col_type in [
                ("last_login",            "DATETIME"),
                ("locked_until",          "DATETIME"),
                ("failed_login_attempts", "INT NOT NULL DEFAULT 0"),
            ]:
                try:
                    check_sql = text("""
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'users'
                          AND column_name = :col
                    """)
                    if not conn.execute(check_sql, {"col": col_name}).fetchone():
                        conn.execute(text(f"ALTER TABLE `users` ADD COLUMN `{col_name}` {col_type}"))
                        logger.info(f"Migration: added users.{col_name}")
                except Exception as e:
                    logger.warning(f"Migration for users.{col_name} failed: {e}")

            # Audit log table (create if missing)
            # MySQL: CREATE TABLE IF NOT EXISTS is supported natively.
            # Indexes are created separately to avoid multi-statement issues.
            try:
                if not _table_exists(conn, "audit_logs"):
                    conn.execute(text("""
                        CREATE TABLE audit_logs (
                            id           INT AUTO_INCREMENT PRIMARY KEY,
                            admin_id     INT NOT NULL,
                            action       VARCHAR(100) NOT NULL,
                            entity_type  VARCHAR(50)  NOT NULL,
                            entity_id    VARCHAR(50),
                            old_values   JSON,
                            new_values   JSON,
                            ip_address   VARCHAR(50),
                            status       VARCHAR(20) DEFAULT 'success',
                            notes        TEXT,
                            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT fk_audit_admin
                                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """))
                    logger.info("Migration: audit_logs table created")

                # Create indexes separately — one execute per statement for MySQL
                if not _index_exists(conn, "audit_logs", "idx_audit_admin_time"):
                    conn.execute(text(
                        "CREATE INDEX idx_audit_admin_time ON audit_logs (admin_id, created_at)"
                    ))
                    logger.info("Migration: created index idx_audit_admin_time")

                if not _index_exists(conn, "audit_logs", "idx_audit_entity"):
                    conn.execute(text(
                        "CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id)"
                    ))
                    logger.info("Migration: created index idx_audit_entity")

                logger.info("Migration: audit_logs table ensured")
            except Exception as e:
                logger.warning(f"Migration for audit_logs table failed: {e}")

            # Suggestions table: suggestion_data column
            try:
                added = _add_column_if_missing(conn, "suggestions", "suggestion_data", "JSON")
                if added:
                    logger.info("Migration: added suggestions.suggestion_data")
            except Exception as e:
                logger.warning(f"Migration for suggestions.suggestion_data failed: {e}")

    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        raise
