ALTER TYPE promotion_target ADD VALUE IF NOT EXISTS 'NEW_USERS';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'promotion_schedule_type'
    ) THEN
        CREATE TYPE promotion_schedule_type AS ENUM ('ALWAYS', 'DATE_RANGE', 'RECURRING');
    END IF;
END $$;

ALTER TABLE promotions
    ADD COLUMN IF NOT EXISTS schedule_type promotion_schedule_type NOT NULL DEFAULT 'DATE_RANGE',
    ADD COLUMN IF NOT EXISTS schedule_timezone text,
    ADD COLUMN IF NOT EXISTS daily_start_time text,
    ADD COLUMN IF NOT EXISTS daily_end_time text,
    ADD COLUMN IF NOT EXISTS active_weekdays jsonb,
    ADD COLUMN IF NOT EXISTS new_user_window_days integer;
