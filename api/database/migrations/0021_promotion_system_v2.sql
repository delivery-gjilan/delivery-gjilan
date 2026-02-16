-- Migration: Complete Promotion System V2 Refactor
-- Description: Wolt-style flexible promotion system with wallet, conditional promos, and analytics

-- ==================== DROP OLD SYSTEM ====================
-- We'll keep the old tables for now and create V2 versions

-- ==================== ENUMS ====================

DO $$ BEGIN
    CREATE TYPE promotion_type_v2 AS ENUM (
        'FIXED_AMOUNT',
        'PERCENTAGE',
        'FREE_DELIVERY',
        'WALLET_CREDIT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE promotion_target AS ENUM (
        'ALL_USERS',
        'SPECIFIC_USERS',
        'FIRST_ORDER',
        'CONDITIONAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE wallet_transaction_type AS ENUM (
        'CREDIT',
        'DEBIT',
        'REFUND',
        'REFERRAL_REWARD',
        'ADMIN_ADJUSTMENT',
        'PROMOTION',
        'EXPIRATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== PROMOTIONS V2 ====================

CREATE TABLE IF NOT EXISTS promotions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Type & Target
    type promotion_type_v2 NOT NULL,
    target promotion_target NOT NULL,
    
    -- Discount Configuration
    discount_value NUMERIC(10, 2),
    max_discount_cap NUMERIC(10, 2),
    
    -- Conditions
    min_order_amount NUMERIC(10, 2),
    
    -- Spend Threshold
    spend_threshold NUMERIC(10, 2),
    threshold_reward JSONB,
    
    -- Usage Limits
    max_global_usage INTEGER,
    max_usage_per_user INTEGER,
    current_global_usage INTEGER DEFAULT 0 NOT NULL,
    
    -- Stacking Rules
    is_stackable BOOLEAN DEFAULT false NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    
    -- Status & Timing
    is_active BOOLEAN DEFAULT true NOT NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    
    -- Analytics
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    total_usage_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promotions_v2_code ON promotions_v2(code);
CREATE INDEX IF NOT EXISTS idx_promotions_v2_active ON promotions_v2(is_active, target);
CREATE INDEX IF NOT EXISTS idx_promotions_v2_target ON promotions_v2(target);

-- ==================== USER PROMOTIONS ====================

CREATE TABLE IF NOT EXISTS user_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promotion_id UUID NOT NULL REFERENCES promotions_v2(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0 NOT NULL,
    last_used_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    UNIQUE(user_id, promotion_id)
);

CREATE INDEX IF NOT EXISTS idx_user_promotions_user ON user_promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promotions_promo ON user_promotions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_user_promotions_active ON user_promotions(user_id, is_active);

-- ==================== PROMOTION USAGE ====================

CREATE TABLE IF NOT EXISTS promotion_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Applied discount details
    discount_amount NUMERIC(10, 2) NOT NULL,
    free_delivery_applied BOOLEAN DEFAULT false NOT NULL,
    
    -- Context
    order_subtotal NUMERIC(10, 2) NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(order_id, promotion_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_usage_promo ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_user ON promotion_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_order ON promotion_usage(order_id);

-- ==================== BUSINESS ELIGIBILITY ====================

CREATE TABLE IF NOT EXISTS promotion_business_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions_v2(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(promotion_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_business ON promotion_business_eligibility(promotion_id, business_id);

-- ==================== USER WALLET ====================

CREATE TABLE IF NOT EXISTS user_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_wallet_user ON user_wallet(user_id);

-- ==================== WALLET TRANSACTIONS ====================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES user_wallet(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type wallet_transaction_type NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    balance_before NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    
    -- References
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    promotion_id UUID REFERENCES promotions_v2(id) ON DELETE SET NULL,
    
    description TEXT,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

-- ==================== USER PROMO METADATA ====================

CREATE TABLE IF NOT EXISTS user_promo_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    has_used_first_order_promo BOOLEAN DEFAULT false NOT NULL,
    first_order_promo_used_at TIMESTAMPTZ,
    
    total_promotions_used INTEGER DEFAULT 0 NOT NULL,
    total_savings NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_promo_metadata_user ON user_promo_metadata(user_id);

-- ==================== SEED FIRST ORDER PROMOTION ====================

-- Create the automatic first order promotion
INSERT INTO promotions_v2 (
    id,
    code,
    name,
    description,
    type,
    target,
    discount_value,
    min_order_amount,
    is_stackable,
    priority,
    is_active,
    threshold_reward
) VALUES (
    gen_random_uuid(),
    'FIRST_ORDER_AUTO',
    'First Order Welcome Offer',
    'Automatically applied: Free delivery + $2 off your first order',
    'FIXED_AMOUNT',
    'FIRST_ORDER',
    2.00,
    0,
    false, -- Cannot stack
    100,   -- Highest priority
    true,
    '{"type": "FREE_DELIVERY"}'::jsonb
) ON CONFLICT DO NOTHING;

-- ==================== FUNCTIONS ====================

-- Function to auto-create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_wallet (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_promo_metadata (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create wallet and metadata for new users
DROP TRIGGER IF EXISTS trigger_create_user_wallet ON users;
CREATE TRIGGER trigger_create_user_wallet
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_wallet();

-- Create wallets for existing users
INSERT INTO user_wallet (user_id, balance)
SELECT id, 0 FROM users
WHERE id NOT IN (SELECT user_id FROM user_wallet)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_promo_metadata (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_promo_metadata)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE promotions_v2 IS 'Flexible promotion system supporting multiple types and conditional logic';
COMMENT ON TABLE user_wallet IS 'User credit balance for platform credits, refunds, and referral rewards';
COMMENT ON TABLE wallet_transactions IS 'Complete transaction history for wallet balance changes';
COMMENT ON TABLE user_promo_metadata IS 'Tracks user-specific promotion usage metadata like first order flag';
