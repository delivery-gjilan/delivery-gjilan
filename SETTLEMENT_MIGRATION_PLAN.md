# Settlement System Refactor - Migration Plan

## Overview
This migration transforms the settlement system from a simple commission tracker to a flexible, scalable platform that supports:
- Dynamic pricing (time-based, weather-based, etc.)
- Multiple settlement rules per entity (stackable)
- Complete audit trails
- Bidirectional settlements (platform can owe drivers/businesses)

## Migration Steps

### Phase 1: Schema Creation
**Files Created:**
- `api/database/schema/settlementRules.ts` - Flexible rule configuration
- `api/database/schema/productPricing.ts` - Dual pricing + dynamic adjustments
- Updated `api/database/schema/settlements.ts` - Enhanced with direction, snapshots, breakdowns

### Phase 2: Data Migration
**Actions Required:**
1. Create new tables (settlement_rules, product_pricing, dynamic_pricing_rules)
2. Add new enum types (settlement_direction, settlement_rule_type, etc.)
3. Alter settlements table to add new columns
4. Migrate existing data:
   - Convert driver/business commissionPercentage to settlement_rules
   - Create product_pricing records from existing products.price
   - Update settlement records to include direction (all existing = RECEIVABLE)

### Phase 3: Service Layer
**Files to Create/Update:**
- `api/src/services/PricingService.ts` - Calculate final prices with dynamic rules
- `api/src/services/SettlementCalculationEngine.ts` - New calculation logic
- Update `api/src/services/FinancialService.ts` - Use new calculation engine
- `api/src/repositories/SettlementRuleRepository.ts`
- `api/src/repositories/ProductPricingRepository.ts`

### Phase 4: GraphQL Schema
**Updates Needed:**
- Update Settlement type with new fields
- Add SettlementRule type and operations
- Add ProductPricing type and operations
- Add DynamicPricingRule type and operations
- Update mutations for new workflow

### Phase 5: UI Implementation
**Admin Panel:**
- Settlement rules management
- Product pricing editor
- Dynamic pricing rules
- Enhanced settlement dashboard

**Mobile Business:**
- Settlement transparency view
- Pricing history

**Mobile Driver:**
- Enhanced earnings breakdown

## Rollback Plan
1. Keep old commissionPercentage columns (don't drop)
2. Run both systems in parallel initially
3. Compare calculations for validation
4. Switch cutover flag once validated

## Testing Checklist
- [ ] Create settlement rules for drivers
- [ ] Create settlement rules for businesses
- [ ] Test rule stacking
- [ ] Test dynamic pricing evaluation
- [ ] Test free delivery coupon flow
- [ ] Test settlement calculation with product markups
- [ ] Test settlement calculation with percentage
- [ ] Test settlement calculation with fixed fees
- [ ] Test multiple businesses in one order
- [ ] Verify audit trails stored correctly

## Timeline Estimate
- Schema + Migration: 1-2 hours
- Service Layer: 3-4 hours  
- GraphQL: 2-3 hours
- UI: 6-8 hours
- Testing: 2-3 hours

**Total: 14-20 hours**
