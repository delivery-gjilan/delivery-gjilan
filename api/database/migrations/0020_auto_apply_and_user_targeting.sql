-- Migration: Add auto-apply and user-targeting features to promotions
-- Description: Adds autoApply field and promotion_target_users junction table

-- Add auto_apply column to promotions table
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN NOT NULL DEFAULT false;

-- Create promotion_target_users junction table for user-specific promos
CREATE TABLE IF NOT EXISTS promotion_target_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_promotion_target_users_promotion 
        FOREIGN KEY (promotion_id) 
        REFERENCES promotions(id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_promotion_target_users_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
        
    -- Ensure a user can only be targeted once per promotion
    UNIQUE(promotion_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_promotion_target_users_promotion_id 
    ON promotion_target_users(promotion_id);
    
CREATE INDEX IF NOT EXISTS idx_promotion_target_users_user_id 
    ON promotion_target_users(user_id);

-- Create index for auto-apply promotions for faster lookups
CREATE INDEX IF NOT EXISTS idx_promotions_auto_apply 
    ON promotions(auto_apply) 
    WHERE auto_apply = true AND is_active = true;
