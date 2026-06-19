-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add missing JSON columns to cvs table
-- MySQL-compatible version
--
-- Run manually:
--   mysql -u <user> -p <database> < add_personal_info_column.sql
--
-- Note: Python db_migrate.py runs these automatically on app startup.
--       This file is provided for manual/DBA-managed deployments.
-- ─────────────────────────────────────────────────────────────────────────────

-- MySQL: Use a stored procedure to conditionally add columns.
-- This is the MySQL equivalent of PostgreSQL's DO $$ BEGIN ... END $$ block.

DROP PROCEDURE IF EXISTS add_cv_columns;

DELIMITER $$

CREATE PROCEDURE add_cv_columns()
BEGIN
    -- personal_info: editor format {name, title, email, phone, location, linkedin, website, summary, photo}
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'cvs'
          AND column_name = 'personal_info'
    ) THEN
        ALTER TABLE cvs ADD COLUMN personal_info JSON NULL;
    END IF;

    -- interests: optional list
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'cvs'
          AND column_name = 'interests'
    ) THEN
        ALTER TABLE cvs ADD COLUMN interests JSON NULL;
    END IF;

    -- custom_sections: [{title, content}]
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'cvs'
          AND column_name = 'custom_sections'
    ) THEN
        ALTER TABLE cvs ADD COLUMN custom_sections JSON NULL;
    END IF;

    -- theme: {primaryColor, fontFamily, layout, accentStyle}
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'cvs'
          AND column_name = 'theme'
    ) THEN
        ALTER TABLE cvs ADD COLUMN theme JSON NULL;
    END IF;

    -- embedding: AI vector field for future ML integration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'cvs'
          AND column_name = 'embedding'
    ) THEN
        ALTER TABLE cvs ADD COLUMN embedding JSON NULL;
    END IF;
END$$

DELIMITER ;

CALL add_cv_columns();
DROP PROCEDURE IF EXISTS add_cv_columns;
