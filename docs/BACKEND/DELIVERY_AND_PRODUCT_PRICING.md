# Delivery Pricing & Product Pricing

<!-- MDS:B6 | Domain: Backend | Updated: 2026-03-18 -->
<!-- Depends-On: B2, B3 -->
<!-- Depended-By: BL1, M4 -->
<!-- Nav: Price precedence changes → update B2 (Order Creation), B3 (Validation). Zone/tier admin changes → review BL1 (Settlements). Any change here may affect what mobile sends in checkout — update M4 (Order Creation Audit). -->

## Two Pricing Domains

There are two distinct pricing systems in the API:

1. **Product Pricing** — what a product costs (base, markup, night, sale)
2. **Delivery Pricing** — how much delivery costs based on distance or zone

Both feed into the order creation flow at `OrderService.createOrder()`.

---

## Product Pricing

### Service: `PricingService`

`api/src/services/PricingService.ts`

#### Price Precedence (in order)

```
1. salePrice        — if product.isOnSale === true AND salePrice != null
2. nightMarkedupPrice   — if current time is 23:00-05:59 AND nightMarkedupPrice != null
3. basePrice        — fallback always available
```

`markupPrice` is **informational only** — used by the settlement engine to calculate driver markup remittance. It is NOT used to determine what the customer pays.

#### Product Schema Pricing Fields (`api/database/schema/products.ts`)

| DB Column | Type | Role |
|-----------|------|------|
| `base_price` | numeric | Always-available customer price |
| `markup_price` | numeric | Driver's collected markup (for settlement calc) |
| `night_marked_up_price` | numeric | Price during night hours (23:00–05:59) |
| `is_on_sale` | boolean | Enables/disables sale price |
| `sale_price` | numeric | Active during sale; beats night and base |

Night window: `hour >= 23 || hour < 6` (server local time).

#### `PriceCalculationResult` shape

```typescript
{
  productId: string;
  basePrice: number;
  markupPrice: number | null;
  nightMarkedupPrice: number | null;
  salePrice: number | null;
  isNightHours: boolean;
  finalAppliedPrice: number;   // ← what the customer pays, rounded to 2dp
}
```

---

### Product Pricing Table (`productPricing`)

`api/database/schema/productPricing.ts`

A separate supplementary table that tracks the **business/platform split** and pricing history. Currently schema-defined but not wired into the PricingService runtime (the products table fields are the live source of truth).

| Field | Purpose |
|-------|---------|
| `businessPrice` | What the business earns per unit |
| `platformMarkup` | What the platform adds on top |
| `baseCustomerPrice` | `businessPrice + platformMarkup` |
| `nightMarkup` | Extra amount applied during night hours |
| `priceHistory` | JSONB audit trail of price changes |

---

### Dynamic Pricing Rules (`dynamicPricingRules`)

Schema-defined table for future condition-based price adjustments. **Not actively evaluated by PricingService today.**

| Condition Type | Config Shape |
|----------------|-------------|
| `TIME_OF_DAY` | `{ startHour, endHour, daysOfWeek }` |
| `DAY_OF_WEEK` | `{ days: [0-6] }` |
| `WEATHER` | `{ conditions, minIntensity }` |
| `DEMAND` | `{ algorithm, multiplierRange }` |
| `SPECIAL_EVENT` | `{ eventId, activeFrom, activeTo }` |
| `CUSTOM` | `{ expression, params }` |

Adjustment types: `PERCENTAGE`, `FIXED_AMOUNT`, `MULTIPLIER`. Priority field controls evaluation order when multiple rules apply.

---

## Delivery Pricing

### Two-layer system: Zones → Tiers

```
1. Check delivery zones  (polygon-based)
   → if dropoff falls inside an active zone → use zone.deliveryFee (fixed)
2. Fall back to pricing tiers (distance-based)
   → calculate driving distance (Mapbox API → haversine fallback)
   → find matching [minDistanceKm, maxDistanceKm) tier → use tier.price
```

### Delivery Zones (`delivery_zones`)

`api/database/schema/deliveryZones.ts`

| Field | Type | Notes |
|-------|------|-------|
| `polygon` | JSONB `Array<{lat, lng}>` | Polygon boundary points |
| `delivery_fee` | numeric | Fixed fee for all orders in this zone |
| `sort_order` | integer | Evaluation priority |
| `is_active` | boolean | Inactive zones are skipped |
| `is_service_zone` | boolean | Marks service coverage zone used for in-zone checks |

**Zones take priority** over distance tiers. If no active zone matches, fall through to tiers.

When at least one active zone has `is_service_zone = true`, service-coverage checks use only those zones.

Admin sets this from Delivery Zones UI via the "Delivery Service Zone" toggle in create/edit flow.

### Delivery Pricing Tiers (`delivery_pricing_tiers`)

`api/database/schema/deliveryPricingTiers.ts`

Distance-based fallback. Each row defines a range:

| `min_distance_km` | `max_distance_km` | `price` |
|------------------|-------------------|---------|
| 0 | 3 | €1.00 |
| 3 | 6 | €1.50 |
| 6 | 10 | €2.00 |
| 10 | NULL | €3.00 |

`max_distance_km = NULL` matches everything beyond `min_distance_km`.

### Distance Calculation (`api/src/lib/haversine.ts`)

```
calculateDrivingDistanceKm(lat1, lng1, lat2, lng2)
  → Mapbox Directions API (driving profile)  ← preferred; returns real road distance + durationMin
  → Haversine fallback (straight-line)       ← used if MAPBOX_TOKEN unset or API fails
```

Returns `{ distanceKm, durationMin }`. `durationMin` is 0 when using haversine fallback.

---

## How Delivery Fee Feeds into Order Creation

From `B2` (ORDER_CREATION):

1. Client calculates delivery fee by calling the delivery pricing endpoint before checkout
2. Client sends `input.deliveryPrice` with the create order request
3. Backend recalculates delivery fee server-side
4. `input.deliveryPrice` must match server result within **epsilon 0.01** → rejects otherwise

The client must send exactly what the server told it — see `docs/BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md` (B3).

---

## Known Gaps / Planned

- `dynamicPricingRules` table exists but is not evaluated at runtime — all dynamic pricing currently goes through the hardcoded `isOnSale` / `nightMarkedupPrice` pattern on the products table
- `productPricing` table (business/platform split) is not yet actively used by PricingService
- No admin UI for managing dynamic pricing rules yet
- Mapbox fallback gives 0 for `durationMin` — ETA estimates in that case are unreliable
