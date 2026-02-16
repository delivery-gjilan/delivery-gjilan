# 🎯 Promotion System V2 - Quick Start Guide

## ✅ COMPLETED (Ready to Use)

### 1. Database (100% Done) ✅
- All 7 tables created and indexed
- First order promotion seeded automatically  
- Wallet auto-creation triggers installed
- Enum types defined
- Foreign keys and constraints in place

### 2. Core Engine (100% Done) ✅
**File:** `api/src/services/PromotionEngineV2.ts`

**Key Methods:**
```typescript
// Find all applicable promotions for a cart
await promotionEngine.getApplicablePromotions(userId, cart, manualCode);

// Apply best combination (respects stacking rules)
const result = await promotionEngine.applyPromotions(userId, cart, manualCode);
// Returns: { promotions, totalDiscount, freeDeliveryApplied, finalTotal }

// After order created - record usage
await promotionEngine.recordUsage(promoIds, userId, orderId, ...);

// Mark first order as used (prevents re-use)
await promotionEngine.markFirstOrderUsed(userId);
```

---

## 🚀 HOW TO USE (Integration Examples)

### Example 1: Validate User's Cart with Promotions

```typescript
import { PromotionEngineV2 } from '@/services/PromotionEngineV2';

const promotionEngine = new PromotionEngineV2(db);

const cart = {
    items: [
        { productId: 'p1', businessId: 'b1', quantity: 2, price: 10 },
        { productId: 'p2', businessId: 'b1', quantity: 1, price: 8 }
    ],
    subtotal: 28.00,
    deliveryPrice: 3.00,
    businessIds: ['b1']
};

// Auto-apply best promotions
const result = await promotionEngine.applyPromotions(userId, cart);

console.log(result);
// {
//    promotions: [{ name: "First Order Welcome", appliedAmount: 2, freeDelivery: true }],
//    totalDiscount: 2.00,
//    freeDeliveryApplied: true,
//    finalSubtotal: 26.00,
//    finalDeliveryPrice: 0,
//    finalTotal: 26.00
// }
```

### Example 2: User Enters Promo Code Manually

```typescript
const manualCode = "SUMMER20"; // User typed this

const result = await promotionEngine.applyPromotions(userId, cart, manualCode);

if (result.promotions.length === 0) {
    throw new Error("Invalid promo code");
}

// Code is valid! Apply the discount
```

### Example 3: After Order is Created

```typescript
// Order successfully created
const orderId = createdOrder.id;

// Record promotion usage for analytics
await promotion Engine.recordUsage(
    result.promotions.map(p => p.id),
    userId,
    orderId,
    result.totalDiscount,
    result.freeDeliveryApplied,
    cart.subtotal,
    cart.businessIds[0] || null
);

// If this was their first order, mark it
const wasFirstOrder = result.promotions.some(p => p.target === 'FIRST_ORDER');
if (wasFirstOrder) {
    await promotionEngine.markFirstOrderUsed(userId);
}
```

---

## 📋 TO-DO: Complete the System

### Priority 1: OrderService Integration (30 min)
**File:** `api/src/services/OrderService.ts`

**Replace the old promotion logic with:**
```typescript
// In createOrder() method:
const promotionEngine = new PromotionEngineV2(this.db);

const cart = {
    items: itemsToCreate,
    subtotal: calculatedItemsTotal,
    deliveryPrice: input.deliveryPrice,
    businessIds: [...new Set(itemsToCreate.map(i => i.businessId))]
};

const promoResult = await promotionEngine.applyPromotions(
    userId,
    cart,
    input.promoCode || undefined
);

const effectiveOrderPrice = promoResult.finalSubtotal;
const effectiveDeliveryPrice = promoResult.finalDeliveryPrice;

// After order created:
if (promoResult.promotions.length > 0) {
    await promotionEngine.recordUsage(...);
    
    const isFirstOrder = promoResult.promotions.some(p => p.target === 'FIRST_ORDER');
    if (isFirstOrder) {
        await promotionEngine.markFirstOrderUsed(userId);
    }
}
```

### Priority 2: Admin Panel - Promotions V2 Page (2-3 hours)
**Create:** `admin-panel/src/app/dashboard/promotions-v2/page.tsx`

**Features Needed:**
- ✅ List all promotions (from `promotions_v2` table)
- ✅ Create new promotion modal
- ✅ Edit existing promotion
- ✅ Delete promotion
- ✅ View analytics (total usage, revenue)
- ✅ Assign to specific users
- ✅ Set business restrictions

**Form Fields:**
```typescript
{
    name: string;
    code?: string; // Optional for auto-applied
    type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'WALLET_CREDIT';
    target: 'ALL_USERS' | 'FIRST_ORDER' | 'SPECIFIC_USERS' | 'CONDITIONAL';
    discountValue?: number;
    maxDiscountCap?: number; // For percentage
    minOrderAmount?: number;
    spendThreshold?: number; // For conditional
    maxGlobalUsage?: number;
    maxUsagePerUser?: number;
    isStackable: boolean;
    priority: number;
    startsAt?: Date;
    endsAt?: Date;
}
```

### Priority 3: Mobile App - Cart Integration (1-2 hours)
**Update:** `mobile-customer/modules/cart/components/CartScreen.tsx`

**Features:**
1. Call `getAutoApplyPromotions` query on cart change
2. Show applied promotions in cart summary
3. Display progress bar for conditional promos:
   ```tsx
   {conditionalPromo && cart.total < conditionalPromo.threshold && (
       <View>
           <Text>Add ${threshold - total} more to get free delivery!</Text>
           <ProgressBar progress={total / threshold} />
       </View>
   )}
   ```
4. Show wallet balance
5. Display total savings

---

## 🎯 CRITICAL FEATURES STATUS

| Feature | Status | Notes |
|---------|--------|-------|
| **Database Schema** | ✅ 100% | All tables created |
| **First Order Auto-Promo** | ✅ 90% | Seeded, needs OrderService integration |
| **User-Specific Discounts** | ✅ 80% | Schema ready, needs UI |
| **General Promo Codes** | ✅ 90% | Engine ready, needs UI |
| **Conditional Promos** | ✅ 70% | Backend ready, needs frontend progress bar |
| **Stacking Rules** | ✅ 100% | Fully implemented in engine |
| **Wallet System** | ⚠️ 60% | Schema ready, needs WalletService |
| **Analytics** | ✅ 80% | Counters auto-update, needs dashboard UI |

---

## 🔥 QUICK WINS (Do These First)

### 1. Test First Order Promo (5 minutes)
```sql
-- Check if first order promo was created
SELECT * FROM promotions_v2 WHERE code = 'FIRST_ORDER_AUTO';

-- Test on a fresh user
SELECT user_id, has_used_first_order_promo 
FROM user_promo_metadata 
WHERE user_id = 'your-test-user-id';

-- Should return false for new users
```

### 2. Create a Simple Promo Code (SQL - 2 minutes)
```sql
INSERT INTO promotions_v2 (name, code, type, target, discount_value, is_active, priority)
VALUES (
    '20% Off Summer Sale',
    'SUMMER20',
    'PERCENTAGE',
    'ALL_USERS',
    20,
    true,
    50
);
```

### 3. Test the Engine (Code - 5 minutes)
```typescript
// In any resolver or service:
const engine = new PromotionEngineV2(db);

const testCart = {
    items: [],
    subtotal: 25.00,
    deliveryPrice: 3.00,
    businessIds: ['test-business-id']
};

const result = await engine.applyPromotions('test-user-id', testCart, 'SUMMER20');
console.log('Applied discount:', result.totalDiscount); // Should be 5.00 (20% of 25)
```

---

## 📐 Architecture Summary

```
USER CART
    ↓
PromotionEngineV2.applyPromotions()
    ↓
1. Get applicable promotions (filters by target, dates, limits)
2. Calculate discounts for each
3. Apply stacking rules
4. Return best combination
    ↓
OrderService creates order with final prices
    ↓
PromotionEngine.recordUsage()
    ↓
Analytics updated automatically
```

---

## 🚨 IMPORTANT NOTES

1. **Server-Side Only**: All promotion logic runs on backend. Frontend only displays.
2. **First Order Cannot Stack**: The seeded first order promo has `is_stackable = false`
3. **Priority Matters**: Higher priority (100) = applied first
4. **Wallet Auto-Created**: Every new user gets a wallet automatically (via trigger)
5. **Usage Counters**: Auto-increment on every redemption
6. **No Deletes**: Promotions should be deactivated, not deleted (preserves analytics)

---

## 📊 Sample Queries

### Get user's available promotions:
```typescript
const engine = new PromotionEngineV2(db);
const promos = await engine.getApplicablePromotions(userId, cart);
```

### Check if user used first order promo:
```sql
SELECT has_used_first_order_promo 
FROM user_promo_metadata 
WHERE user_id = $1;
```

### Get wallet balance:
```sql
SELECT balance FROM user_wallet WHERE user_id = $1;
```

### Analytics - Most used promo:
```sql
SELECT name, total_usage_count, total_revenue
FROM promotions_v2
ORDER BY total_usage_count DESC
LIMIT 10;
```

---

## ✅ Next Session TODO

1. [ ] Integrate PromotionEngineV2 into OrderService
2. [ ] Create admin UI for promotions management
3. [ ] Add wallet management to admin panel
4. [ ] Update mobile cart to show auto-applied promos
5. [ ] Add conditional promo progress bars
6. [ ] Create analytics dashboard

**Estimated Time:** 6-8 hours total

**Current Progress:** ~60% complete (database + core engine done!)

---

**The foundation is rock-solid. Now just need to connect the UI! 🚀**
