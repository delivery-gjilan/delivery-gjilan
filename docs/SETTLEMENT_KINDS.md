# Settlement Kinds

This document describes every kind of settlement the platform creates when an order is delivered. Settlements track who owes what between the platform, businesses, and drivers.

> **Important:** Settlements are tracked as ledger entries regardless of payment method. Actual money collection only applies once online payments are integrated. Until then, all orders use `CASH_TO_DRIVER` and settlements serve as a financial mirror for future reconciliation.

---

## Core Concepts

| Term | Meaning |
|------|---------|
| **RECEIVABLE** | The entity (driver/business) owes the platform |
| **PAYABLE** | The platform owes the entity |
| **DRIVER settlement** | Between platform ↔ driver |
| **BUSINESS settlement** | Between platform ↔ business |

---

## Settlement Categories

### 1. AUTO_REMITTANCE — Markup & Surcharge

- **Type:** DRIVER
- **Direction:** RECEIVABLE (driver owes platform)
- **Trigger:** Order paid via `CASH_TO_DRIVER` that includes platform markup or priority surcharge
- **Logic:** The driver collected cash that includes the platform's markup and/or priority surcharge. The driver owes that portion back.
- **Reason format:** `"Markup remittance (cash-to-driver) for order {displayId}"` or `"Priority surcharge remittance (cash-to-driver) for order {displayId}"`

### 2. STOCK_REMITTANCE — Stock Item Remittance

- **Type:** DRIVER
- **Direction:** RECEIVABLE (driver owes platform)
- **Trigger:** Order contains stock items (platform inventory) paid via `CASH_TO_DRIVER`
- **Logic:** The driver collected cash for items the platform owns. The full item revenue (price × quantity) is owed back.
- **Reason format:** `"Stock item remittance: {productName} ×{qty} for order {displayId}"`

### 3. CATALOG_REVENUE — Catalog Product Revenue

- **Type:** DRIVER
- **Direction:** RECEIVABLE (driver owes platform)
- **Trigger:** Order contains catalog products (non-stock, non-business products) paid via `CASH_TO_DRIVER`
- **Logic:** Similar to stock remittance but for catalog products that don't have inventory tracking.
- **Reason format:** `"Catalog product remittance: {productName} ×{qty} for order {displayId}"`

### 4. DRIVER_TIP — Driver Tip Passthrough

- **Type:** DRIVER
- **Direction:** PAYABLE (platform owes driver)
- **Trigger:** Order paid via `PREPAID_TO_PLATFORM` includes a driver tip
- **Logic:** Customer paid the tip to the platform online; the platform must forward it to the driver.
- **Reason format:** `"Driver tip passthrough for order {displayId}"`
- **Note:** Only created for `PREPAID_TO_PLATFORM` orders. Currently no payment gateway is integrated, so this settlement kind will only activate once online payments go live.

### 5. PLATFORM_COMMISSION — Rule-Based (ORDER_PRICE)

- **Type:** DRIVER or BUSINESS
- **Direction:** RECEIVABLE or PAYABLE (depends on rule config)
- **Trigger:** A settlement rule of type `ORDER_PRICE` matches the order
- **Logic:** Rules are scoped (global → business → promotion → combo) and all matching rules are **additive** — each produces its own settlement entry. Amount is calculated as a percentage or fixed fee on the order's total price.
- **Reason format:** `"Settlement rule '{ruleName}': {percent}% of order price EUR {orderPrice} for order {displayId}"`

### 6. DELIVERY_COMMISSION — Rule-Based (DELIVERY_PRICE)

- **Type:** DRIVER or BUSINESS
- **Direction:** RECEIVABLE or PAYABLE (depends on rule config)
- **Trigger:** A settlement rule of type `DELIVERY_PRICE` matches the order
- **Logic:** Uses **most-specific-wins** strategy: if a combo rule exists, only that applies; else promotion rule; else business rule; else global rule. Amount is calculated on the delivery price.
- **Reason format:** `"Settlement rule '{ruleName}': {percent}% of delivery price EUR {deliveryPrice} for order {displayId}"`

### 7. PROMOTION_COST — Promotion-Linked Adjustments

- **Type:** DRIVER or BUSINESS
- **Direction:** RECEIVABLE or PAYABLE
- **Trigger:** Settlement rules linked to a specific promotion
- **Logic:** These are standard ORDER_PRICE or DELIVERY_PRICE rules that have a `promotionId` associated. They appear in the breakdown as a separate category from regular commission.
- **Note:** The breakdown resolver categorizes any rule with a `promotionId` as `PROMOTION_COST`.

### 8. Driver Commission Fallback

- **Type:** DRIVER
- **Direction:** RECEIVABLE (driver owes platform)
- **Trigger:** No `DELIVERY_PRICE` rule matched and the driver has a `commissionPercentage` set on their record
- **Logic:** Fallback: if no delivery-price rule applies, the driver's own commission percentage from their profile is used on the delivery price. This ensures there's always a delivery commission even without explicit rules.
- **Reason format:** `"Driver commission ({percent}%) on delivery price EUR {deliveryPrice} for order {displayId}"`
- **Note:** In the breakdown, this appears under `DELIVERY_COMMISSION` (null ruleId, categorized by the resolver as `AUTO_REMITTANCE` with RECEIVABLE direction unless a specific rule label is present).

---

## Rule Scoping & Priority

Settlement rules can be scoped at different levels:

| Scope | Description | Priority (ORDER_PRICE) | Priority (DELIVERY_PRICE) |
|-------|-------------|----------------------|-------------------------|
| **Global** | No business, no promotion | Additive (stacks) | Lowest |
| **Business** | Tied to a specific business | Additive (stacks) | Medium |
| **Promotion** | Tied to a promotion | Additive (stacks) | High |
| **Combo** | Tied to both business + promotion | Additive (stacks) | Highest (wins) |

- **ORDER_PRICE rules:** All matching scopes are applied additively (each creates a settlement).
- **DELIVERY_PRICE rules:** Most-specific-wins — only one scope level applies.

---

## When Settlements Are Created

Settlements are created by `FinancialService.createSettlementsOnDelivery()` which is called when an order status transitions to `DELIVERED`. The `SettlementCalculationEngine` computes all entries, and they are batch-inserted into the `settlements` table.

---

## Payment Method Impact

| Payment Method | Settlement Behavior |
|----------------|-------------------|
| `CASH_TO_DRIVER` | Markup/surcharge/stock/catalog → DRIVER/RECEIVABLE. Driver collected cash, owes platform. |
| `PREPAID_TO_PLATFORM` | Driver tip → DRIVER/PAYABLE. Platform collected payment, owes driver the tip. Commission rules still apply. |

> **Future:** When online payments are integrated, `PREPAID_TO_PLATFORM` will be the primary flow and all settlement kinds will be fully active with real money movement.
