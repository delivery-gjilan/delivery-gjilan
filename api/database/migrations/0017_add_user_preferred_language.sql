ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

ALTER TABLE users
ADD CONSTRAINT users_preferred_language_check
CHECK (preferred_language IN ('en', 'al'));
