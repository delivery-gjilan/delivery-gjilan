-- Migration: Settlement System Refactor
-- Description: Add settlement rules, product pricing, dynamic pricing, and enhance settlements table
-- Date: 2026-03-10

-- ============================================================================
-- 1. Create new enum types
-- ============================================================================

CREATE TYPE settlement_rule_type AS ENUM (
    'PERCENTAGE',
    'FIXED_PER_ORDER',
    'PRODUCT_MARKUP',
    'DRIVER_VEHICLE_BONUS',
    'CUSTOM'
);

CREATE TYPE settlement_entity_type AS ENUM ('DRIVER', 'BUSINESS');

CREATE TYPE settlement_direction AS ENUM ('RECEIVABLE', 'PAYABLE');

CREATE TYPE pricing_condition_type AS ENUM (
    'TIME_OF_DAY',
    'DAY_OF_WEEK',
    'WEATHER',
    'DEMAND',
    'SPECIAL_EVENT',
    'CUSTOM'
);

-- Update existing settlement_status enum to add new values
ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- ============================================================================
-- 2. Create settlement_rules table
-- ============================================================================

CREATE TABLE settlement_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type settlement_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    rule_type settlement_rule_type NOT NULL,
    config JSONB NOT NULL,
    can_stack_with JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_by UUID,
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settlement_rules_entity ON settlement_rules(entity_type, entity_id);
CREATE INDEX idx_settlement_rules_active ON settlement_rules(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 3. Create product_pricing table
-- ============================================================================

CREATE TABLE product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    business_price NUMERIC(10, 2) NOT NULL,
    platform_markup NUMERIC(10, 2) NOT NULL DEFAULT 0,
    base_customer_price NUMERIC(10, 2) NOT NULL,
    price_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_pricing_product ON product_pricing(product_id);
CREATE INDEX idx_product_pricing_business ON product_pricing(business_id);

-- ============================================================================
-- 4. Create dynamic_pricing_rules table
-- ============================================================================

CREATE TABLE dynamic_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    condition_type pricing_condition_type NOT NULL,
    condition_config JSONB NOT NULL,
    adjustment_config JSONB NOT NULL,
    applies_to JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dynamic_pricing_business ON dynamic_pricing_rules(business_id);
CREATE INDEX idx_dynamic_pricing_active ON dynamic_pricing_rules(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 5. Enhance settlements table
-- ============================================================================

-- Add new columns to settlements table
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS direction settlement_direction;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS rule_snapshot JSONB;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS calculation_details JSONB;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR' NOT NULL;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update existing settlement type enum values (rename for clarity)
-- Note: This requires careful handling in production
-- For now, keep DRIVER_PAYMENT/BUSINESS_PAYMENT and add DRIVER/BUSINESS as new values
ALTER TYPE settlement_type ADD VALUE IF NOT EXISTS 'DRIVER';
ALTER TYPE settlement_type ADD VALUE IF NOT EXISTS 'BUSINESS';

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_settlements_type_direction ON settlements(type, direction);
CREATE INDEX IF NOT EXISTS idx_settlements_paid_by ON settlements(paid_by);

-- ============================================================================
-- 6. Data migration - Convert existing commission percentages to rules
-- ============================================================================

-- Migrate driver commission percentages to settlement_rules
INSERT INTO settlement_rules (entity_type, entity_id, rule_type, config, can_stack_with, priority, notes)
SELECT 
    'DRIVER'::settlement_entity_type,
    id,
    'PERCENTAGE'::settlement_rule_type,
    jsonb_build_object(
        'percentage', commission_percentage::numeric,
        'appliesTo', 'DELIVERY_FEE'
    ),
    '["DRIVER_VEHICLE_BONUS"]'::jsonb,
    0,
    'Migrated from drivers.commission_percentage'
FROM drivers
WHERE commission_percentage > 0;

-- Migrate business commission percentages to settlement_rules
INSERT INTO settlement_rules (entity_type, entity_id, rule_type, config, can_stack_with, priority, notes)
SELECT 
    'BUSINESS'::settlement_entity_type,
    id,
    'PERCENTAGE'::settlement_rule_type,
    jsonb_build_object(
        'percentage', commission_percentage::numeric,
        'appliesTo', 'ORDER_SUBTOTAL'
    ),
    '["FIXED_PER_ORDER", "PRODUCT_MARKUP"]'::jsonb,
    0,
    'Migrated from businesses.commission_percentage'
FROM businesses
WHERE commission_percentage > 0;

-- ============================================================================
-- 7. Migrate product prices to product_pricing table
-- ============================================================================

INSERT INTO product_pricing (product_id, business_id, business_price, platform_markup, base_customer_price, price_history)
SELECT 
    p.id,
    p.business_id,
    CASE 
        WHEN p.is_on_sale AND p.sale_price IS NOT NULL THEN p.sale_price
        ELSE p.price
    END as business_price,
    0 as platform_markup, -- Initially no markup
    CASE 
        WHEN p.is_on_sale AND p.sale_price IS NOT NULL THEN p.sale_price
        ELSE p.price
    END as base_customer_price,
    jsonb_build_array(
        jsonb_build_object(
            'businessPrice', CASE WHEN p.is_on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.price END,
            'platformMarkup', 0,
            'baseCustomerPrice', CASE WHEN p.is_on_sale AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.price END,
            'changedAt', p.created_at,
            'changedBy', null,
            'reason', 'Initial migration from products table'
        )
    ) as price_history
FROM products p
ON CONFLICT (product_id) DO NOTHING;

-- ============================================================================
-- 8. Set direction for existing settlements (all are RECEIVABLE)
-- ============================================================================

UPDATE settlements 
SET direction = 'RECEIVABLE'::settlement_direction
WHERE direction IS NULL;

-- Make direction NOT NULL after setting values
ALTER TABLE settlements ALTER COLUMN direction SET NOT NULL;

-- ============================================================================
-- 9. Update settlement type values for existing records
-- ============================================================================

-- This will need to be done carefully in production
-- For now, keep existing DRIVER_PAYMENT/BUSINESS_PAYMENT values
-- New records will use DRIVER/BUSINESS

-- ============================================================================
-- 10. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE settlement_rules IS 'Flexible commission and fee rules for drivers and businesses';
COMMENT ON TABLE product_pricing IS 'Dual pricing model - business price + platform markup = customer price';
COMMENT ON TABLE dynamic_pricing_rules IS 'Conditional pricing adjustments (time, weather, demand, etc.)';
COMMENT ON COLUMN settlements.direction IS 'RECEIVABLE = they owe us, PAYABLE = we owe them';
COMMENT ON COLUMN settlements.rule_snapshot IS 'Snapshot of rules applied at calculation time for audit trail';
COMMENT ON COLUMN settlements.calculation_details IS 'Detailed breakdown showing how amount was calculated';

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
/*
DROP INDEX IF EXISTS idx_settlements_type_direction;
DROP INDEX IF EXISTS idx_settlements_paid_by;

ALTER TABLE settlements DROP COLUMN IF EXISTS direction;
ALTER TABLE settlements DROP COLUMN IF EXISTS rule_snapshot;
ALTER TABLE settlements DROP COLUMN IF EXISTS calculation_details;
ALTER TABLE settlements DROP COLUMN IF EXISTS currency;
ALTER TABLE settlements DROP COLUMN IF EXISTS paid_by;
ALTER TABLE settlements DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE settlements DROP COLUMN IF EXISTS payment_method;
ALTER TABLE settlements DROP COLUMN IF EXISTS metadata;
ALTER TABLE settlements DROP COLUMN IF EXISTS created_by;

DROP TABLE IF EXISTS dynamic_pricing_rules;
DROP TABLE IF EXISTS product_pricing;
DROP TABLE IF EXISTS settlement_rules;

DROP TYPE IF EXISTS pricing_condition_type;
DROP TYPE IF EXISTS settlement_direction;
DROP TYPE IF EXISTS settlement_entity_type;
DROP TYPE IF EXISTS settlement_rule_type;
*/
