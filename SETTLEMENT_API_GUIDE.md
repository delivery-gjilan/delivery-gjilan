# Settlement System API Guide

## Overview

The settlement system manages financial transactions between the platform, businesses, and drivers. It supports:

- **Flexible Rule Engine**: Define custom settlement rules with stacking support
- **Dual Pricing Model**: Business prices + platform markup
- **Dynamic Pricing**: Conditional price adjustments (time-based, demand-based, etc.)
- **Audit Trail**: Full calculation details and rule snapshots stored with each settlement

## Core Concepts

### Settlement Directions
- **RECEIVABLE**: Platform receives money (e.g., commission from business)
- **PAYABLE**: Platform pays money (e.g., payout to driver)

### Settlement Rule Types
- **PERCENTAGE**: Calculate X% of base amount
- **FIXED_PER_ORDER**: Fixed amount per order
- **PRODUCT_MARKUP**: Markup on specific products
- **DRIVER_VEHICLE_BONUS**: Vehicle-based bonuses for drivers
- **CUSTOM**: Custom calculation logic

### Entity Types
- **BUSINESS**: Rules applied to businesses
- **DRIVER**: Rules applied to drivers

---

## GraphQL Operations

### 1. Settlement Rules

#### Create a Settlement Rule

```graphql
mutation CreateBusinessCommissionRule {
  createSettlementRule(input: {
    entityType: BUSINESS
    entityId: "business-uuid-here"
    ruleType: PERCENTAGE
    config: {
      percentage: 15
      description: "15% platform commission on orders"
    }
    canStackWith: []
    priority: 100
    notes: "Standard commission for restaurants"
  }) {
    id
    entityType
    entityId
    ruleType
    config
    isActive
    priority
    createdAt
    updatedAt
  }
}
```

#### Create a Driver Bonus Rule

```graphql
mutation CreateDriverVehicleBonus {
  createSettlementRule(input: {
    entityType: DRIVER
    entityId: "driver-uuid-here"
    ruleType: DRIVER_VEHICLE_BONUS
    config: {
      vehicleType: "MOTORCYCLE"
      bonusPerOrder: 2.50
      description: "€2.50 bonus per order for motorcycle drivers"
    }
    canStackWith: ["base-commission-rule-id"]
    priority: 50
    notes: "Incentive for fuel-efficient vehicles"
  }) {
    id
    isActive
    activatedAt
  }
}
```

#### Query Settlement Rules

```graphql
query GetBusinessRules {
  settlementRules(filter: {
    entityType: BUSINESS
    isActive: true
  }) {
    id
    entityType
    entityId
    ruleType
    config
    isActive
    priority
    activatedAt
  }
}
```

#### Get Active Rules for Specific Entity

```graphql
query GetActiveDriverRules($driverId: ID!) {
  activeRulesForEntity(
    entityType: DRIVER
    entityId: $driverId
  ) {
    id
    ruleType
    config
    priority
    canStackWith
  }
}
```

#### Activate a Rule

```graphql
mutation ActivateRule($ruleId: ID!) {
  activateSettlementRule(id: $ruleId) {
    id
    isActive
    activatedAt
    activatedBy
  }
}
```

#### Deactivate a Rule

```graphql
mutation DeactivateRule($ruleId: ID!) {
  deactivateSettlementRule(id: $ruleId) {
    id
    isActive
    activatedAt
  }
}
```

#### Update a Rule

```graphql
mutation UpdateRule($ruleId: ID!) {
  updateSettlementRule(
    id: $ruleId
    input: {
      config: {
        percentage: 18
        description: "Updated to 18% commission"
      }
      priority: 110
      notes: "Increased commission rate"
    }
  ) {
    id
    config
    priority
    updatedAt
  }
}
```

#### Delete a Rule

```graphql
mutation DeleteRule($ruleId: ID!) {
  deleteSettlementRule(id: $ruleId)
}
```

---

### 2. Product Pricing

#### Query Product Pricing

```graphql
query GetProductPricing($productId: ID!) {
  productPricing(productId: $productId) {
    id
    productId
    businessId
    businessPrice
    platformMarkup
    baseCustomerPrice
    priceHistory {
      changedAt
      businessPrice
      platformMarkup
      baseCustomerPrice
      changedBy
      reason
    }
    createdAt
    updatedAt
  }
}
```

#### Get All Pricing for a Business

```graphql
query GetBusinessPricing($businessId: ID!) {
  productPricingByBusiness(businessId: $businessId) {
    id
    productId
    businessPrice
    platformMarkup
    baseCustomerPrice
  }
}
```

#### Update Product Pricing

```graphql
mutation UpdatePricing($productId: ID!) {
  updateProductPricing(
    productId: $productId
    input: {
      businessPrice: "12.99"
      platformMarkup: "2.50"
      reason: "Price adjustment due to ingredient cost increase"
    }
  ) {
    id
    businessPrice
    platformMarkup
    baseCustomerPrice
    priceHistory {
      changedAt
      businessPrice
      reason
    }
  }
}
```

#### Calculate Final Price

```graphql
query CalculatePrice($productId: ID!) {
  calculateProductPrice(productId: $productId)
}
```

---

### 3. Dynamic Pricing Rules

#### Create Time-Based Pricing Rule

```graphql
mutation CreateNightSurge {
  createDynamicPricingRule(input: {
    businessId: "business-uuid-here"
    name: "Night Hours Surge"
    description: "20% markup after midnight"
    conditionType: TIME_OF_DAY
    conditionConfig: {
      startHour: 0
      endHour: 6
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    }
    adjustmentConfig: {
      type: "PERCENTAGE"
      value: 20
    }
    appliesTo: {
      allProducts: true
    }
    priority: 100
  }) {
    id
    name
    conditionType
    isActive
    createdAt
  }
}
```

#### Create Weekend Pricing

```graphql
mutation CreateWeekendPricing {
  createDynamicPricingRule(input: {
    businessId: null  # Applies to all businesses
    name: "Weekend Surge"
    description: "10% increase on weekends"
    conditionType: DAY_OF_WEEK
    conditionConfig: {
      days: [0, 6]  # Sunday and Saturday
      description: "Weekends"
    }
    adjustmentConfig: {
      type: "PERCENTAGE"
      value: 10
    }
    appliesTo: {
      categoryIds: ["food-category-id"]
    }
    priority: 50
  }) {
    id
    name
    isActive
  }
}
```

#### Create Special Event Pricing

```graphql
mutation CreateEventPricing {
  createDynamicPricingRule(input: {
    name: "New Year Surge"
    description: "1.5x multiplier during New Year celebration"
    conditionType: SPECIAL_EVENT
    conditionConfig: {
      eventId: "new-year-2026"
      activeFrom: "2026-12-31T20:00:00Z"
      activeTo: "2027-01-01T06:00:00Z"
    }
    adjustmentConfig: {
      type: "MULTIPLIER"
      value: 1.5
    }
    appliesTo: {
      allProducts: true
    }
    priority: 200
    validFrom: "2026-12-31T20:00:00Z"
    validUntil: "2027-01-01T06:00:00Z"
  }) {
    id
    name
    validFrom
    validUntil
  }
}
```

#### Query Dynamic Pricing Rules

```graphql
query GetBusinessDynamicRules($businessId: ID!) {
  dynamicPricingRules(businessId: $businessId) {
    id
    name
    description
    conditionType
    conditionConfig
    adjustmentConfig
    appliesTo {
      categoryIds
      productIds
      allProducts
    }
    priority
    isActive
    validFrom
    validUntil
  }
}
```

#### Update Dynamic Pricing Rule

```graphql
mutation UpdateDynamicRule($ruleId: ID!) {
  updateDynamicPricingRule(
    id: $ruleId
    input: {
      adjustmentConfig: {
        type: "PERCENTAGE"
        value: 25
      }
      isActive: true
      priority: 150
    }
  ) {
    id
    adjustmentConfig
    priority
    isActive
  }
}
```

#### Delete Dynamic Pricing Rule

```graphql
mutation DeleteDynamicRule($ruleId: ID!) {
  deleteDynamicPricingRule(id: $ruleId)
}
```

---

### 4. Enhanced Settlements

#### Query Settlements with Details

```graphql
query GetOrderSettlements($orderId: ID!) {
  settlements(filter: { orderId: $orderId }) {
    id
    type
    direction
    amount
    status
    ruleSnapshot
    calculationDetails
    metadata
    currency
    paidAt
    paidBy
    paymentReference
    paymentMethod
    createdBy
    createdAt
    updatedAt
  }
}
```

#### Query Settlement Summary

```graphql
query GetSettlementSummary {
  settlementRuleSummary {
    totalActiveRules
    rulesByType {
      ruleType
      count
    }
    rulesByEntity {
      entityType
      count
    }
  }
}
```

---

## Rule Configuration Examples

### Percentage Commission

```json
{
  "percentage": 15,
  "description": "15% platform commission",
  "appliesTo": "orderTotal"
}
```

### Fixed Per Order

```json
{
  "fixedAmount": 5.00,
  "description": "€5 platform fee per order",
  "currency": "EUR"
}
```

### Product Markup

```json
{
  "markupPercentage": 20,
  "description": "20% markup on premium products",
  "categoryIds": ["premium-food-id"],
  "minOrderValue": 10.00
}
```

### Driver Vehicle Bonus

```json
{
  "vehicleType": "BICYCLE",
  "bonusPerOrder": 3.00,
  "bonusPerKm": 0.50,
  "description": "Eco-friendly delivery bonus",
  "maxBonusPerOrder": 10.00
}
```

### Custom Rule

```json
{
  "formula": "baseAmount * (1 + (distance / 10) * 0.05)",
  "description": "Distance-based commission",
  "variables": {
    "maxDistance": 50,
    "minCommission": 2.00
  }
}
```

---

## Pricing Adjustment Examples

### Time-Based

```json
{
  "type": "PERCENTAGE",
  "value": 20,
  "description": "20% surcharge for night orders"
}
```

### Fixed Amount

```json
{
  "type": "FIXED_AMOUNT",
  "value": 3.50,
  "description": "€3.50 peak hour fee"
}
```

### Multiplier

```json
{
  "type": "MULTIPLIER",
  "value": 1.5,
  "description": "1.5x surge pricing"
}
```

---

## Best Practices

### 1. Rule Priority
- Higher priority = executed first
- Use priority to control rule application order
- Standard commissions: 100
- Bonuses/incentives: 50-99
- Special rates: 101-200

### 2. Rule Stacking
- Use `canStackWith` to allow multiple rules
- Empty array = cannot stack with any other rule
- List specific rule IDs to allow stacking

### 3. Testing Rules
- Always test rules with `isActive: false` first
- Use `activeRulesForEntity` to verify rule resolution
- Check `calculationDetails` in settlements for debugging

### 4. Audit Trail
- All settlements store `ruleSnapshot` and `calculationDetails`
- Use these for dispute resolution
- Price history tracks all changes with reasons

### 5. Dynamic Pricing
- Set `validFrom` and `validUntil` for time-limited rules
- Use high priority for urgent price adjustments
- Monitor `appliesTo` scope carefully

---

## Error Handling

Common errors and solutions:

### Rule Conflicts
- **Error**: Multiple rules with same priority
- **Solution**: Adjust priorities to establish clear order

### Invalid Configuration
- **Error**: Missing required config fields
- **Solution**: Validate config JSON against rule type schema

### Entity Not Found
- **Error**: Settlement rule references non-existent entity
- **Solution**: Verify entity IDs before creating rules

### Calculation Failures
- **Error**: Rule calculation returns negative or invalid amount
- **Solution**: Check rule config, add validation logic

---

## Migration Path

### From Old to New System

1. **Create equivalent rules** for existing commission percentages
2. **Test calculations** in parallel with old system
3. **Verify settlements** match expected amounts
4. **Switch over** once validated
5. **Deactivate old** manual calculation code

### Example Migration

```graphql
# Old: Business has 15% commission in DB
# New: Create settlement rule

mutation MigrateBusinessCommission {
  createSettlementRule(input: {
    entityType: BUSINESS
    entityId: "business-id"
    ruleType: PERCENTAGE
    config: {
      percentage: 15
      description: "Migrated from business.commissionPercentage"
    }
    priority: 100
  }) {
    id
  }
  
  # Then activate it
  activateSettlementRule(id: "new-rule-id") {
    isActive
  }
}
```

---

## Support

For questions or issues with the settlement system:
1. Check calculation details in settlement records
2. Review active rules for the entity
3. Verify rule priorities and stacking configuration
4. Check logs for settlement calculation errors
