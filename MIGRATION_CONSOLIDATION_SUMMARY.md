# ✅ Migration Files Consolidated

**Date**: February 16, 2026

## What Was Done

### ✅ Created Single Consolidated Migration
**New File**: `0019_promotion_system_v2.sql`

This single file replaces 4 separate migrations:
- ❌ `0019_promotions.sql` (created V1 system) - DELETED
- ❌ `0020_auto_apply_and_user_targeting.sql` (added V1 fields) - DELETED  
- ❌ `0021_promotion_system_v2.sql` (created V2 system) - DELETED
- ❌ `0022_drop_old_promotions.sql` (dropped V1 tables) - DELETED

### What the Consolidated Migration Contains

The new `0019_promotion_system_v2.sql` creates the complete V2 promotion system in one go:

**Enums (3)**:
- `promotion_type_v2` - FIXED_AMOUNT, PERCENTAGE, FREE_DELIVERY, WALLET_CREDIT
- `promotion_target` - ALL_USERS, SPECIFIC_USERS, FIRST_ORDER, CONDITIONAL
- `wallet_transaction_type` - CREDIT, DEBIT, REFUND, etc.

**Tables (7)**:
- `promotions_v2` - Main promotion configurations
- `user_promotions` - User-specific promo assignments
- `promotion_usage` - Redemption history & analytics
- `promotion_business_eligibility` - Business restrictions
- `user_wallet` - User credit balance
- `wallet_transactions` - Complete transaction ledger
- `user_promo_metadata` - First order flag, savings tracking

**Indexes (11)** - For query optimization

**Functions & Triggers**:
- `create_user_wallet()` - Auto-creates wallet for new users
- Trigger on `users` table

**Seed Data**:
- First order promotion (`FIRST_ORDER_AUTO`)
- Wallets for existing users
- Metadata for existing users

## Database Status

### ✅ All V2 Tables Present
```sql
-- Verified tables in database:
promotion_business_eligibility
promotion_usage
promotions_v2
user_promo_metadata
user_promotions
user_wallet (also created)
wallet_transactions (also created)
```

### Migration File Count
**Before**: 4 migration files (0019, 0020, 0021, 0022)  
**After**: 1 migration file (0019_promotion_system_v2.sql)

## Benefits

1. **Cleaner Migration History** - Single file for entire promotion system
2. **Easier Fresh Setup** - New databases get V2 directly, no V1 → V2 migration dance
3. **Less Confusion** - No intermediate V1 steps
4. **Repository Cleanliness** - 3 fewer files to maintain

## Important Notes

### ⚠️ Current Database Already Has V2
Your current database already has all the V2 tables applied (from the previous migrations 0021-0022). This consolidation:
- **Does NOT affect your current database** - All data is intact
- **Only affects fresh database setups** - New databases will use the consolidated migration
- **Simplifies migration tracking** - Fewer files to manage

### For Fresh Database Setup
If you need to set up a fresh database:
1. Run migrations 0000-0018 (existing migrations)
2. Run `0019_promotion_system_v2.sql` - Creates complete V2 system
3. Done! No need for V1 at all.

### Migration Tracking
If you're using a migration tracking system, you may need to:
- Mark 0019, 0020, 0021, 0022 as "applied" in your tracking
- OR just use 0019_promotion_system_v2 going forward

## Files Remaining

```
api/database/migrations/
├── 0000-0018_*.sql (unchanged)
└── 0019_promotion_system_v2.sql ✅ (NEW - consolidated)
```

---

**Status**: Migration consolidation complete ✅

**Your Database**: All V2 tables intact and working perfectly! 🚀
