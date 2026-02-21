# Database Migration Guide - CV Model Update

## Overview
This guide walks through migrating from the old CV schema (with integer IDs) to the new schema (with UUID primary keys and restructured fields).

## Pre-Migration Checklist

- [ ] Backup your PostgreSQL database
- [ ] Stop the application
- [ ] Create a migration script in `backend/alembic/versions/` if using Alembic
- [ ] Test migration on a development database first

## Migration Steps

### Step 1: Enable pgcrypto Extension

PostgreSQL needs the `pgcrypto` extension to generate UUIDs:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Step 2: Backup Current Data (Optional)

If you have existing CVs and need to preserve them:

```sql
-- Create backup tables
CREATE TABLE cvs_backup AS SELECT * FROM cvs;
CREATE TABLE cv_customizations_backup AS SELECT * FROM cv_customizations;
CREATE TABLE suggestions_backup AS SELECT * FROM suggestions;
CREATE TABLE cover_letters_backup AS SELECT * FROM cover_letters;
CREATE TABLE job_applications_backup AS SELECT * FROM job_applications;
```

### Step 3a: Development Environment (Fresh Start)

If you're in development and can recreate the database:

```sql
-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS cover_letters CASCADE;
DROP TABLE IF EXISTS suggestions CASCADE;
DROP TABLE IF EXISTS cv_customizations CASCADE;
DROP TABLE IF EXISTS cvs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Now create the new schema using SQLAlchemy
-- Run: alembic upgrade head (or the equivalent for your migration tool)
```

Then restart your application, which will automatically create the new tables.

### Step 3b: Production Environment (Data Preservation)

If you have data that needs to be migrated:

```sql
-- 1. Create new UUID column
ALTER TABLE cvs ADD COLUMN new_id int DEFAULT  

-- 2. Create new tables with UUID schema
-- (Dump the table definitions from SQLAlchemy and run them)

-- 3. Data migration with mapping
INSERT INTO cvs_new (
    id, user_id, full_name, title, email, phone, location, 
    linkedin_url, profile_summary, education, experience, 
    projects, skills, languages, certifications, interests, 
    current_version, created_at, updated_at
)
SELECT 
    new_id, user_id,
    -- Mapping old fields to new structure
    (personal_info->>'name')::VARCHAR(150),
    title,
    (personal_info->>'email')::VARCHAR(150),
    (personal_info->>'phone')::VARCHAR(50),
    (personal_info->>'location')::VARCHAR(150),
    (personal_info->>'linkedin')::TEXT,
    (personal_info->>'summary')::TEXT,
    educations,
    experiences,
    projects,
    skills,
    languages,
    certifications,
    CAST(interests AS JSONB),
    1,
    created_at,
    updated_at
FROM cvs_old;

-- 4. Create mapping table for old_id -> new_id
CREATE TABLE cv_id_mapping AS
SELECT old.id as old_id, new.id as new_id
FROM cvs_old old
JOIN cvs_new new ON old.user_id = new.user_id AND old.created_at = new.created_at;

-- 5. Update related tables
UPDATE cv_customizations_new SET cv_id = (
    SELECT new_id FROM cv_id_mapping WHERE old_id = cv_id
);

UPDATE suggestions_new SET cv_id = (
    SELECT new_id FROM cv_id_mapping WHERE old_id = cv_id
);

UPDATE cover_letters_new SET cv_id = (
    SELECT new_id FROM cv_id_mapping WHERE old_id = cv_id
)
WHERE cv_id IS NOT NULL;

UPDATE job_applications_new SET cv_id = (
    SELECT new_id FROM cv_id_mapping WHERE old_id = cv_id
)
WHERE cv_id IS NOT NULL;

-- 6. Rename tables
ALTER TABLE cvs RENAME TO cvs_old;
ALTER TABLE cvs_new RENAME TO cvs;

ALTER TABLE cv_customizations RENAME TO cv_customizations_old;
ALTER TABLE cv_customizations_new RENAME TO cv_customizations;

ALTER TABLE suggestions RENAME TO suggestions_old;
ALTER TABLE suggestions_new RENAME TO suggestions;

ALTER TABLE cover_letters RENAME TO cover_letters_old;
ALTER TABLE cover_letters_new RENAME TO cover_letters;

ALTER TABLE job_applications RENAME TO job_applications_old;
ALTER TABLE job_applications_new RENAME TO job_applications;

-- 7. Clean up
DROP TABLE cvs_old;
DROP TABLE cv_customizations_old;
DROP TABLE suggestions_old;
DROP TABLE cover_letters_old;
DROP TABLE job_applications_old;
DROP TABLE cv_id_mapping;
```

## SQL to Create New Schema From Scratch

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (unchanged)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CVs table (updated)
CREATE TABLE cvs (
    id int PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Basic Info
    full_name VARCHAR(150),
    title VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    location VARCHAR(150),
    linkedin_url TEXT,
    profile_summary TEXT,
    
    -- JSON Sections
    education JSONB,
    experience JSONB,
    projects JSONB,
    skills JSONB,
    languages JSONB,
    certifications JSONB,
    interests JSONB,
    
    -- Versioning
    current_version INTEGER DEFAULT 1 NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cvs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- CV Customizations table (updated)
CREATE TABLE cv_customizations (
    id SERIAL PRIMARY KEY,
    cv_id int NOT NULL REFERENCES cvs(id),
    job_description TEXT NOT NULL,
    matched_keywords JSONB,
    customized_data JSONB,
    score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suggestions table (updated)
CREATE TABLE suggestions (
    id SERIAL PRIMARY KEY,
    cv_id int NOT NULL REFERENCES cvs(id),
    customization_id INTEGER REFERENCES cv_customizations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    section VARCHAR(50),
    is_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cover Letters table (updated)
CREATE TABLE cover_letters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    cv_id int REFERENCES cvs(id),
    title VARCHAR(255) NOT NULL DEFAULT 'My Cover Letter',
    content JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Applications table (updated)
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    cv_id int REFERENCES cvs(id),
    cover_letter_id INTEGER REFERENCES cover_letters(id),
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    job_url VARCHAR(1000),
    location VARCHAR(255),
    salary_range VARCHAR(100),
    status VARCHAR(50) DEFAULT 'saved',
    applied_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_cvs_user_id ON cvs(user_id);
CREATE INDEX idx_cv_customizations_cv_id ON cv_customizations(cv_id);
CREATE INDEX idx_suggestions_cv_id ON suggestions(cv_id);
CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX idx_cover_letters_cv_id ON cover_letters(cv_id);
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_cv_id ON job_applications(cv_id);
```

## Verification Steps

After migration, verify the data:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check UUID generation works
SELECT id FROM cvs LIMIT 1;

-- Verify foreign key relationships
SELECT COUNT(*) FROM cvs WHERE user_id NOT IN (SELECT id FROM users);

-- Check data types
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'cvs';
```

## Testing the Application

After migration, test the following:

1. **Create a new CV**
   ```bash
   curl -X POST http://localhost:8000/api/cvs \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "full_name": "John Doe",
       "title": "Software Engineer",
       "email": "john@example.com",
       "phone": "+1234567890",
       "location": "New York",
       "linkedin_url": "https://linkedin.com/in/johndoe",
       "profile_summary": "Experienced software engineer",
       "education": [...],
       "experience": [...],
       "skills": {...},
       "languages": [...],
       "certifications": [...],
       "projects": [...],
       "interests": ["AI", "Cloud"]
     }'
   ```

2. **Get all CVs** - Should return UUIDs as IDs
3. **Update a CV** - Test all new fields
4. **Upload a CV file** - Should populate new schema
5. **Create customizations** - Should reference UUID
6. **Check suggestions** - Should work with UUID references

## Rollback Plan

If you need to rollback:

```sql
-- Rename tables back
ALTER TABLE cvs RENAME TO cvs_new;
ALTER TABLE cvs_old RENAME TO cvs;

-- ... (repeat for other tables)

-- Drop new tables if needed
DROP TABLE cvs_new;
DROP TABLE cv_customizations_new;
DROP TABLE suggestions_new;
DROP TABLE cover_letters_new;
DROP TABLE job_applications_new;
```

## Notes

1. **UUID vs Integer**: UUID provides better distributed system support and privacy (no sequential ID enumeration)
2. **JSONB**: PostgreSQL's JSONB type provides better performance and query capabilities than plain JSON
3. **Data Loss**: Be careful with the migration - test on a backup first
4. **Down Time**: Plan for minimal downtime during migration
5. **Foreign Keys**: Make sure all foreign key constraints are updated

## Troubleshooting

### Issue: "UUID type not found"
**Solution**: Make sure you've run `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

### Issue: "column does not exist" errors
**Solution**: Check that all column names match exactly (case-sensitive)

### Issue: Foreign key constraint violations
**Solution**: Ensure all related tables are migrated in the correct order

### Issue: Data migration takes too long
**Solution**: Do the migration in batches or during low-traffic periods
