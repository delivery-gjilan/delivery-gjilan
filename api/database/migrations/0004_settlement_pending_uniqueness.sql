-- Remove existing duplicate pending settlements, keeping the earliest row per fingerprint.
WITH ranked_pending AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY
                order_id,
                type,
                direction,
                COALESCE(driver_id, '00000000-0000-0000-0000-000000000000'::uuid),
                COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
                COALESCE(rule_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM settlements
    WHERE status = 'PENDING'
)
DELETE FROM settlements s
USING ranked_pending r
WHERE s.id = r.id
  AND r.rn > 1;--> statement-breakpoint

-- Enforce one pending settlement per logical fingerprint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_settlements_pending_fingerprint
ON settlements (
    order_id,
    type,
    direction,
    COALESCE(driver_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(rule_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE status = 'PENDING';
