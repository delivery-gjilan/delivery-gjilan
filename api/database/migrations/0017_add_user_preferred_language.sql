ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

-- Add constraint only if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_preferred_language_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_preferred_language_check
    CHECK (preferred_language IN ('en', 'al'));
  END IF;
END $$;
