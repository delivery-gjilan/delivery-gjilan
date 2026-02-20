-- Check existing conditional promotions
SELECT 
    id, 
    name, 
    code, 
    type, 
    target, 
    spend_threshold,
    threshold_reward,
    is_active,
    priority
FROM promotions 
WHERE target = 'CONDITIONAL' 
AND is_active = true;

-- If none exist, create a test conditional promotion:
-- Spend €15, get free delivery
INSERT INTO promotions (
    name,
    code,
    type,
    target,
    discount_value,
    spend_threshold,
    threshold_reward,
    is_stackable,
    priority,
    is_active
) VALUES (
    'Free Delivery on €15+',
    'FREEDEL15',
    'FREE_DELIVERY',
    'CONDITIONAL',
    0,
    15.00,
    '{"type": "FREE_DELIVERY"}',
    false,
    75,
    true
) ON CONFLICT DO NOTHING;

-- Verify it was created
SELECT 
    id, 
    name, 
    code, 
    type, 
    target, 
    spend_threshold,
    threshold_reward,
    is_active,
    priority
FROM promotions 
WHERE target = 'CONDITIONAL' 
AND is_active = true;
