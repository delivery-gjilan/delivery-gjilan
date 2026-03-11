# Product Pricing Setup Guide

## Overview

The delivery platform uses a **three-layer pricing model**:

1. **Business Base Price** - What businesses set for their products
2. **Platform Markup** - Additional platform fee on top of business price
3. **Dynamic Pricing** (Optional) - Conditional adjustments based on time, demand, etc.

**Final Customer Price = Business Price + Platform Markup + Dynamic Adjustments**

---

## Setting Up Pricing

### Option 1: Manual Setup via Admin UI (Recommended)

1. **Access Financial Management**
   - Navigate to `/admin/financial/pricing`
   - Select a business from the dropdown
   - View all products and their current pricing

2. **Set Platform Markups**
   - Click "Edit" on any product
   - Set the platform markup (e.g., €2.50)
   - The system automatically calculates the final customer price
   - Add a reason for the change (stored in audit trail)

3. **Create Dynamic Pricing Rules** (Optional)
   - Go to `/admin/financial/dynamic-pricing`
   - Click "Create Rule"
   - Choose condition type (time, day, weather, etc.)
   - Set adjustment (percentage, fixed amount, or multiplier)
   - Define what products it applies to

### Option 2: Programmatic Setup via GraphQL

#### Create Initial Pricing for a Product

```graphql
# This should happen automatically when products are created
# But you can also initialize pricing manually:

mutation InitializeProductPricing {
  updateProductPricing(
    productId: "product-uuid"
    input: {
      businessPrice: "10.00"
      platformMarkup: "2.50"
      reason: "Initial setup"
    }
  ) {
    id
    businessPrice
    platformMarkup
    baseCustomerPrice
  }
}
```

### Option 3: Automatic Setup via Product Creation Hook

Add this to your product creation service:

```typescript
// api/src/services/ProductService.ts (or wherever products are created)

import { PricingService } from '@/services/PricingService';

async createProduct(data: CreateProductInput) {
  // Create the product
  const product = await this.productRepo.create(data);
  
  // Initialize pricing with default platform markup
  const pricingService = new PricingService(this.db);
  await pricingService.createProductPricing(
    product.id,
    data.businessId,
    parseFloat(data.price), // Business sets this
    2.50 // Default platform markup (€2.50)
  );
  
  return product;
}
```

---

## Pricing Flow Examples

### Example 1: Simple Markup

```
Business Price:      €10.00
Platform Markup:     + €2.50
─────────────────────────────
Final Customer Price: €12.50
```

### Example 2: With Night Surcharge

```
Business Price:        €10.00
Platform Markup:       + €2.50
Base Price:            €12.50

Night Surcharge (20%): + €2.50
─────────────────────────────
Final Customer Price:   €15.00
```

### Example 3: Multiple Dynamic Rules

```
Business Price:         €10.00
Platform Markup:        + €2.50
Base Price:             €12.50

Weekend Surcharge (10%): + €1.25
Peak Hour Fee:           + €3.00
─────────────────────────────
Final Customer Price:    €16.75
```

---

## Setting Default Markups

### Global Default Markup

Set a platform-wide default in your configuration:

```typescript
// api/src/config/pricing.ts
export const PRICING_CONFIG = {
  defaultPlatformMarkup: 2.50, // €2.50 default
  markupByCategory: {
    'food': 2.50,
    'groceries': 1.50,
    'pharmacy': 3.00,
    'electronics': 5.00,
  },
};
```

### Category-Based Markups

Apply different markups based on product category:

```typescript
async createProductPricing(productId: string, businessId: string, product: Product) {
  const categoryMarkup = PRICING_CONFIG.markupByCategory[product.categoryId] 
    || PRICING_CONFIG.defaultPlatformMarkup;
  
  await pricingService.createProductPricing(
    productId,
    businessId,
    parseFloat(product.price),
    categoryMarkup
  );
}
```

### Business-Specific Markups

Give certain businesses custom markup rates:

```typescript
async createProductPricing(productId: string, businessId: string, product: Product) {
  const business = await businessRepo.findById(businessId);
  const markup = business.customPlatformMarkup 
    || PRICING_CONFIG.defaultPlatformMarkup;
  
  await pricingService.createProductPricing(
    productId,
    businessId,
    parseFloat(product.price),
    markup
  );
}
```

---

## Migration: Adding Pricing to Existing Products

If you have existing products without pricing records, run a migration:

```typescript
// api/scripts/migrate-product-pricing.ts

import { getDB } from '@/database';
import { PricingService } from '@/services/PricingService';
import { products } from '@/database/schema';

async function migratePricing() {
  const db = getDB();
  const pricingService = new PricingService(db);
  
  // Get all products
  const allProducts = await db.select().from(products);
  
  console.log(`Migrating pricing for ${allProducts.length} products...`);
  
  for (const product of allProducts) {
    try {
      // Check if pricing exists
      await pricingService.ensureProductPricing(
        product.id,
        product.businessId,
        parseFloat(product.price),
        2.50 // Default markup
      );
      console.log(`✓ Migrated ${product.name}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${product.name}:`, error);
    }
  }
  
  console.log('Migration complete!');
}

migratePricing();
```

Run it:
```bash
cd api
npx tsx scripts/migrate-product-pricing.ts
```

---

## Commission vs Markup: What's the Difference?

### Settlement Rules (Commissions)
- **What they do**: Determine how much platform earns from order total
- **Applied to**: Business subtotal or delivery fee
- **Who pays**: Deducted from business/driver earnings
- **Example**: "15% commission on all orders"
- **Configured in**: `/admin/financial/rules`

### Platform Markup
- **What it does**: Adds to product price directly
- **Applied to**: Individual product prices
- **Who pays**: Customer pays this extra amount
- **Example**: "€2.50 added to burger price"
- **Configured in**: `/admin/financial/pricing`

### Both Work Together

```
Customer Orders:
  Burger = €12.50 (€10 business + €2.50 markup)
  Fries = €5.00 (€4 business + €1 markup)
  Total: €17.50

Platform Revenue:
  Markup Revenue: €2.50 + €1 = €3.50
  Commission (15%): €17.50 × 0.15 = €2.63
  Total Platform Revenue: €6.13

Business Receives:
  Order Subtotal: €14.00 (€10 + €4)
  Less Commission: -€2.63
  Net to Business: €11.37
```

---

## Best Practices

### 1. Set Markups During Product Creation
Always initialize pricing when products are added:
```typescript
await createProduct(data);
await initializePricing(product);
```

### 2. Use Reasonable Markup Ranges
- **Food/Restaurant**: €1.50 - €3.00
- **Groceries**: €0.50 - €2.00  
- **Pharmacy**: €2.00 - €4.00
- **Electronics**: €5.00 - €10.00

### 3. Document Pricing Changes
Always provide a reason when updating pricing:
```graphql
input: {
  platformMarkup: "3.00"
  reason: "Increased due to higher operational costs"
}
```

### 4. Test Dynamic Rules Before Activating
Create rules with `isActive: false`, test calculations, then activate.

### 5. Monitor Total Customer Prices
Use the UI to ensure final prices (after markup + dynamic rules) remain competitive.

---

## Troubleshooting

### "No pricing found for product"
**Problem**: Product exists but has no pricing record  
**Solution**: Run `ensureProductPricing()` or create via admin UI

### "Customer prices too high"
**Problem**: Markup + dynamic rules make prices uncompetitive  
**Solution**: Review and adjust markups, check active dynamic rules

### "Negative margins"
**Problem**: Commission + markup total less than costs  
**Solution**: Increase either commission rate or platform markup

### "Pricing history not updating"
**Problem**: Changes not tracked  
**Solution**: Always provide `reason` parameter when updating

---

## Quick Start Checklist

- [ ] Set default platform markup in config
- [ ] Initialize pricing for existing products (run migration)
- [ ] Configure category-based markup rules (optional)
- [ ] Set up product creation hook to auto-create pricing
- [ ] Create settlement rules for commissions
- [ ] Test end-to-end: product → cart → checkout → settlement
- [ ] Add dynamic pricing rules (optional)
- [ ] Train staff on using pricing admin UI

---

## Support & Resources

- **API Documentation**: See `SETTLEMENT_API_GUIDE.md`
- **Admin UI**: `/admin/financial/*`
- **GraphQL Playground**: Test queries at `/graphql`
- **Code Examples**: `api/src/services/PricingService.ts`
