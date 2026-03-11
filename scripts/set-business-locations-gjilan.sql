-- Spread all businesses around Gjilan, Kosovo using deterministic pseudo-random offsets.
-- Review before running in production.

WITH base AS (
  SELECT
    id,
    ((('x' || substr(md5(id::text || ':radius'), 1, 8))::bit(32)::bigint)::numeric / 4294967295.0) AS radius_ratio,
    ((('x' || substr(md5(id::text || ':angle'), 1, 8))::bit(32)::bigint)::numeric / 4294967295.0) AS angle_ratio
  FROM businesses
  WHERE deleted_at IS NULL
), spread AS (
  SELECT
    id,
    250 + radius_ratio * (1800 - 250) AS radius_meters,
    angle_ratio * pi() * 2 AS angle_radians
  FROM base
)
UPDATE businesses AS b
SET
  location_lat = round((42.4635 + ((s.radius_meters * cos(s.angle_radians)) / 111320.0))::numeric, 6),
  location_lng = round((21.4694 + ((s.radius_meters * sin(s.angle_radians)) / (111320.0 * cos(radians(42.4635)))))::numeric, 6),
  location_address = 'Gjilan, Kosovo (approx)',
  updated_at = CURRENT_TIMESTAMP
FROM spread AS s
WHERE b.id = s.id;
