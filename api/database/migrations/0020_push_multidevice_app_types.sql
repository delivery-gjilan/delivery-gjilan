DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'device_app_type'
          AND e.enumlabel = 'BUSINESS'
    ) THEN
        ALTER TYPE "public"."device_app_type" ADD VALUE 'BUSINESS';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'device_app_type'
          AND e.enumlabel = 'ADMIN'
    ) THEN
        ALTER TYPE "public"."device_app_type" ADD VALUE 'ADMIN';
    END IF;
END $$;

WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY user_id, device_id, app_type
            ORDER BY updated_at DESC, created_at DESC, id DESC
        ) AS rn
    FROM device_tokens
)
DELETE FROM device_tokens
WHERE id IN (
    SELECT id
    FROM ranked
    WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_user_device_app_type_idx
    ON device_tokens (user_id, device_id, app_type);
