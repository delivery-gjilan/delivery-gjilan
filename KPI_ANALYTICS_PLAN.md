# KPI & Analytics Implementation Plan

**Last Updated:** March 2, 2026  
**Status:** Planning Phase

---

## 📊 Overview

This document outlines the KPI metrics and analytics capabilities for the delivery platform. Metrics are organized by **implementation difficulty** based on existing data availability.

---

## ✅ EASY — Ready to Implement (Data Already Exists)

These metrics can be built **today** with simple SQL queries against existing tables.

### 🚚 Delivery Performance

| Metric | Calculation | Source Tables |
|--------|-------------|---------------|
| **Average Delivery Time** | `deliveredAt - orderDate` | `orders` |
| **Prep Time by Restaurant** | `readyAt - preparingAt` | `orders` + `orderItems` + `businesses` |
| **Driver Transit Time** | `deliveredAt - outForDeliveryAt` | `orders` |
| **Pickup Time** | `outForDeliveryAt - readyAt` | `orders` |
| **On-Time Delivery Rate** | `(actual vs estimatedReadyAt) / total * 100` | `orders` |

**SQL Example:**
```sql
-- Average delivery time by day
SELECT 
  DATE_TRUNC('day', order_date) as day,
  AVG(EXTRACT(EPOCH FROM (delivered_at::timestamp - order_date::timestamp))/60) as avg_delivery_min,
  COUNT(*) as total_delivered
FROM orders
WHERE status = 'DELIVERED'
  AND order_date > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

---

### 📦 Order Metrics

| Metric | Description | Implementation |
|--------|-------------|----------------|
| **Daily Order Volume** | Total orders per day | `COUNT(*)` grouped by day |
| **GMV (Gross Merchandise Value)** | Total order value | `SUM(price + delivery_price)` |
| **AOV (Average Order Value)** | Average per order | `AVG(price + delivery_price)` |
| **Order Cancellation Rate** | % cancelled | `COUNT(*) WHERE status='CANCELLED' / total` |
| **Order Distribution by Status** | Funnel breakdown | `GROUP BY status` |
| **Peak Hours Analysis** | Orders by hour | `GROUP BY EXTRACT(HOUR FROM order_date)` |

**SQL Example:**
```sql
-- Daily summary dashboard
SELECT 
  DATE_TRUNC('day', order_date) as day,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
  SUM(price + delivery_price) as gmv,
  AVG(price + delivery_price) as aov,
  COUNT(*) FILTER (WHERE status = 'CANCELLED')::float / COUNT(*) * 100 as cancellation_rate
FROM orders
WHERE order_date > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
```

---

### 👥 Customer Behavior (Using `user_behaviors` Table)

| Metric | Field | Use Case |
|--------|-------|----------|
| **Total Orders per Customer** | `total_orders` | Identify power users |
| **Delivered vs Cancelled** | `delivered_orders` / `cancelled_orders` | Quality score |
| **Total Lifetime Spend** | `total_spend` | CLV ranking |
| **Average Order Value** | `avg_order_value` | Segmentation |
| **First Order Date** | `first_order_at` | Cohort analysis |
| **Last Order Date** | `last_order_at` | Churn detection |
| **Repeat Order Rate** | `users with total_orders > 1` | Retention metric |
| **Time to Second Order** | Second order - first order | Stickiness indicator |

**SQL Examples:**
```sql
-- Repeat customer rate
SELECT 
  COUNT(*) FILTER (WHERE total_orders >= 2) as repeat_customers,
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE total_orders >= 2)::float / COUNT(*) * 100 as repeat_rate
FROM user_behaviors
WHERE total_orders > 0;

-- Churn risk (inactive >30 days)
SELECT 
  u.id,
  u.email,
  u.first_name,
  ub.last_order_at,
  ub.total_orders,
  ub.total_spend,
  NOW() - ub.last_order_at::timestamp as days_inactive
FROM user_behaviors ub
JOIN users u ON u.id = ub.user_id
WHERE ub.last_order_at < NOW() - INTERVAL '30 days'
  AND ub.total_orders > 0
ORDER BY ub.total_spend DESC
LIMIT 100;

-- Time to second order (retention signal)
SELECT 
  AVG(EXTRACT(EPOCH FROM (second_order - first_order_at::timestamp))/86400) as avg_days_to_second
FROM (
  SELECT 
    ub.user_id,
    ub.first_order_at,
    (SELECT order_date 
     FROM orders 
     WHERE user_id = ub.user_id 
     ORDER BY order_date 
     LIMIT 1 OFFSET 1) as second_order
  FROM user_behaviors ub
  WHERE total_orders >= 2
) t
WHERE second_order IS NOT NULL;
```

---

### 🚗 Driver Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| **Orders per Driver** | `orders.driver_id` | Workload distribution |
| **Active Drivers** | `drivers.connection_status = 'CONNECTED'` | Live capacity |
| **Driver Online Time** | `last_heartbeat_at` + heartbeat history | Availability tracking |
| **Driver Connection Health** | `connection_status` enum | System reliability |

**SQL Example:**
```sql
-- Driver leaderboard (last 30 days)
SELECT 
  u.id,
  u.first_name || ' ' || u.last_name as driver_name,
  COUNT(o.id) as total_deliveries,
  AVG(EXTRACT(EPOCH FROM (o.delivered_at::timestamp - o.out_for_delivery_at::timestamp))/60) as avg_transit_min,
  COUNT(*) FILTER (WHERE o.delivered_at::timestamp <= o.estimated_ready_at::timestamp + INTERVAL '10 minutes') as on_time_deliveries
FROM users u
JOIN orders o ON o.driver_id = u.id
WHERE o.status = 'DELIVERED'
  AND o.order_date > NOW() - INTERVAL '30 days'
GROUP BY u.id, driver_name
ORDER BY total_deliveries DESC;
```

---

### 🎁 Promotion & Referral Metrics

| Metric | Tables | Implementation |
|--------|--------|----------------|
| **Promo Redemption Rate** | `order_promotions` + `promotions` | % orders with promo |
| **Discount Impact** | `orders.original_price - price` | Revenue impact |
| **Top Promo Codes** | `GROUP BY promotion_id` | Performance ranking |
| **Referral Conversion** | `user_referrals.status = 'COMPLETED'` | Success rate |
| **Referral ROI** | Compare CLV of referred vs organic | Value analysis |

**SQL Example:**
```sql
-- Promotion performance
SELECT 
  p.code,
  p.name,
  COUNT(DISTINCT op.order_id) as times_used,
  SUM(o.original_price - o.price) as total_discount_given,
  AVG(o.price + o.delivery_price) as avg_order_value_with_promo
FROM promotions p
JOIN order_promotions op ON op.promotion_id = p.id
JOIN orders o ON o.id = op.order_id
WHERE o.status != 'CANCELLED'
  AND o.order_date > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.code, p.name
ORDER BY times_used DESC;

-- Referral funnel
SELECT 
  status,
  COUNT(*) as count,
  SUM(CASE WHEN reward_given THEN reward_amount ELSE 0 END) as total_rewards_paid
FROM user_referrals
GROUP BY status;
```

---

### 📝 Audit Trail Analysis

Using the `audit_logs` table for system insights:

```sql
-- Admin activity summary
SELECT 
  actor_id,
  action_type,
  COUNT(*) as action_count
FROM audit_logs
WHERE actor_type = 'ADMIN'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY actor_id, action_type
ORDER BY action_count DESC;

-- Order status change timeline
SELECT 
  entity_id as order_id,
  action_type,
  metadata->>'from_status' as from_status,
  metadata->>'to_status' as to_status,
  created_at
FROM audit_logs
WHERE entity_type = 'ORDER'
  AND action_type = 'ORDER_STATUS_CHANGED'
  AND entity_id = 'some-order-id'
ORDER BY created_at;
```

---

## 🟡 MODERATE — Requires Aggregation Logic

These need more complex queries but use existing data.

### 📊 Cohort Analysis

Track customer retention by signup month:

```sql
-- Monthly cohort retention
WITH cohorts AS (
  SELECT 
    user_id,
    DATE_TRUNC('month', created_at) as cohort_month
  FROM users
  WHERE role = 'CUSTOMER'
),
orders_by_month AS (
  SELECT 
    user_id,
    DATE_TRUNC('month', order_date) as order_month
  FROM orders
  WHERE status = 'DELIVERED'
)
SELECT 
  c.cohort_month,
  o.order_month,
  EXTRACT(MONTH FROM AGE(o.order_month, c.cohort_month)) as months_since_signup,
  COUNT(DISTINCT o.user_id) as active_users
FROM cohorts c
LEFT JOIN orders_by_month o ON o.user_id = c.user_id
GROUP BY c.cohort_month, o.order_month, months_since_signup
ORDER BY c.cohort_month DESC, months_since_signup;
```

---

### 🗺️ Geographic Analysis

**Delivery Time Heatmap:**
```sql
-- Average delivery time by geographic grid (0.01 degree = ~1km)
SELECT 
  ROUND(dropoff_lat::numeric, 2) as lat_grid,
  ROUND(dropoff_lng::numeric, 2) as lng_grid,
  COUNT(*) as order_count,
  AVG(EXTRACT(EPOCH FROM (delivered_at::timestamp - order_date::timestamp))/60) as avg_delivery_min
FROM orders
WHERE status = 'DELIVERED'
  AND order_date > NOW() - INTERVAL '30 days'
GROUP BY lat_grid, lng_grid
HAVING COUNT(*) > 5
ORDER BY avg_delivery_min DESC;
```

**Order Density Map:**
```sql
-- High-demand areas
SELECT 
  ROUND(dropoff_lat::numeric, 3) as lat,
  ROUND(dropoff_lng::numeric, 3) as lng,
  COUNT(*) as order_density
FROM orders
WHERE order_date > NOW() - INTERVAL '7 days'
GROUP BY lat, lng
HAVING COUNT(*) > 10
ORDER BY order_density DESC;
```

---

### ⏰ Peak Hour Analysis

**Driver Supply vs Demand:**
```sql
-- Orders per hour vs active drivers
WITH hourly_orders AS (
  SELECT 
    DATE_TRUNC('hour', order_date) as hour,
    COUNT(*) as order_count
  FROM orders
  WHERE order_date > NOW() - INTERVAL '7 days'
  GROUP BY hour
),
hourly_drivers AS (
  SELECT 
    DATE_TRUNC('hour', last_heartbeat_at::timestamp) as hour,
    COUNT(DISTINCT user_id) as active_drivers
  FROM drivers
  WHERE last_heartbeat_at > NOW() - INTERVAL '7 days'
  GROUP BY hour
)
SELECT 
  o.hour,
  o.order_count,
  COALESCE(d.active_drivers, 0) as active_drivers,
  CASE 
    WHEN d.active_drivers > 0 THEN o.order_count::float / d.active_drivers 
    ELSE NULL 
  END as orders_per_driver
FROM hourly_orders o
LEFT JOIN hourly_drivers d ON d.hour = o.hour
ORDER BY o.hour DESC;
```

---

### 🍽️ Restaurant Performance

**By Business:**
```sql
-- Restaurant metrics
SELECT 
  b.id,
  b.name,
  COUNT(DISTINCT o.id) as total_orders,
  AVG(EXTRACT(EPOCH FROM (o.ready_at::timestamp - o.preparing_at::timestamp))/60) as avg_prep_time_min,
  COUNT(*) FILTER (WHERE o.status = 'CANCELLED') as cancelled_orders,
  SUM(o.price) as revenue_to_business,
  AVG(o.price) as avg_order_value
FROM businesses b
JOIN order_items oi ON oi.product_id IN (
  SELECT id FROM products WHERE business_id = b.id
)
JOIN orders o ON o.id = oi.order_id
WHERE o.order_date > NOW() - INTERVAL '30 days'
GROUP BY b.id, b.name
ORDER BY total_orders DESC;
```

**Menu Item Performance:**
```sql
-- Top selling products
SELECT 
  p.id,
  p.name,
  b.name as business_name,
  COUNT(oi.id) as times_ordered,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.price * oi.quantity) as total_revenue
FROM products p
JOIN businesses b ON b.id = p.business_id
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'DELIVERED'
  AND o.order_date > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name, b.name
ORDER BY times_ordered DESC
LIMIT 50;
```

---

### 🚦 Driver Utilization

**Active Delivery Time vs Idle:**
```sql
-- Driver efficiency (requires calculating time between deliveries)
WITH driver_deliveries AS (
  SELECT 
    driver_id,
    out_for_delivery_at,
    delivered_at,
    EXTRACT(EPOCH FROM (delivered_at::timestamp - out_for_delivery_at::timestamp))/60 as delivery_duration_min
  FROM orders
  WHERE status = 'DELIVERED'
    AND driver_id IS NOT NULL
    AND order_date > NOW() - INTERVAL '7 days'
)
SELECT 
  driver_id,
  COUNT(*) as deliveries,
  SUM(delivery_duration_min) as total_active_min,
  AVG(delivery_duration_min) as avg_delivery_min
FROM driver_deliveries
GROUP BY driver_id
ORDER BY deliveries DESC;
```

---

## ❌ HARD — Requires New Data Collection

These metrics need schema changes or new tracking systems.

### 🌟 Customer Satisfaction

**What's needed:**
- Add `rating` (1-5 stars) field to `orders` table
- Add `feedback` text field for comments
- Add `rated_at` timestamp

**New table suggestion:**
```sql
CREATE TABLE order_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  category VARCHAR(50), -- food_quality, delivery_speed, driver_service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_ratings_order ON order_ratings(order_id);
CREATE INDEX idx_order_ratings_rating ON order_ratings(rating);
```

**KPIs once implemented:**
- NPS Score: `(promoters - detractors) / total * 100`
- CSAT Average: `AVG(rating)`
- Low Rating Alert: orders with rating < 3

---

### 💳 Payment Failures

**What's needed:**
- Log payment attempts (success + failures)
- Track failure reasons (insufficient funds, card declined, etc.)
- Store payment gateway response codes

**New table suggestion:**
```sql
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50), -- card, wallet, cash
  status VARCHAR(20) NOT NULL, -- success, failed, pending
  failure_reason VARCHAR(200),
  gateway_response JSONB,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**KPIs once implemented:**
- Failed Payment Rate by method
- Most common failure reasons
- Payment retry success rate

---

### 📞 Support Tickets

**What's needed:**
- Support ticket system
- Track issue categories (late delivery, wrong order, missing items)
- Resolution time tracking

**New table suggestion:**
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- late_delivery, wrong_order, missing_items, driver_issue, refund_request
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**KPIs once implemented:**
- Support Ticket Rate: tickets per 100 orders
- Average Resolution Time
- Top Issue Categories
- Reopened Ticket Rate

---

### 🚫 Delivery Failure Tracking

**What's needed:**
- Add `delivery_attempt_count` field
- Add `delivery_failure_reason` enum (customer_unavailable, wrong_address, access_denied)
- Track location when failed delivery occurred

**Schema changes:**
```sql
ALTER TABLE orders ADD COLUMN delivery_attempts INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN delivery_failure_reason VARCHAR(100);
ALTER TABLE orders ADD COLUMN delivery_failed_at TIMESTAMP WITH TIME ZONE;
```

---

### 📱 App Performance

**What's needed:**
- Integrate Sentry for crash tracking
- Track API response times
- Monitor app startup time
- Screen load performance

**Implementation:**
- Already have Sentry in `api/src/lib/sentry.ts`
- Need to add to mobile apps
- Set up custom performance spans

---

### 🔔 Notification Engagement

**What's needed:**
- Track notification deliveries
- Log open/click rates
- A/B test notification copy

**New table:**
```sql
CREATE TABLE notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(20), -- delivered, opened, clicked, dismissed
  device_token_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 Implementation Roadmap

### Phase 1: Foundation (Week 1-2) — **PRIORITY**

**Backend:**
1. Create analytics queries service (`AnalyticsService.ts`)
2. Add GraphQL queries for dashboard metrics
3. Build SQL views for common aggregations

**Admin Panel:**
1. Create `/analytics` page
2. Dashboard with 6 core metrics:
   - Daily orders + GMV + AOV
   - Delivery time average
   - Cancellation rate
   - Repeat customer rate
3. Add date range selector (7d, 30d, 90d, custom)
4. Export to CSV functionality

**Estimated Time:** 2-3 days

---

### Phase 2: Deep Dive (Week 3-4)

1. **Cohort Analysis Page** — retention curves by signup month
2. **Geographic Heatmap** — delivery times + order density map
3. **Driver Dashboard** — leaderboard, utilization, connection status
4. **Restaurant Performance** — prep times, order volume, revenue
5. **Peak Hours Analysis** — supply vs demand charts

**Estimated Time:** 4-5 days

---

### Phase 3: Customer Insights (Week 5-6)

1. **Customer Segmentation:**
   - VIP customers (high CLV)
   - At-risk customers (churn prediction)
   - New customers (onboarding funnel)
2. **Promo Performance Dashboard**
3. **Referral Funnel Analytics**

**Estimated Time:** 3-4 days

---

### Phase 4: New Data Collection (Month 2+)

1. **Add Order Ratings** — 5-star + feedback system
2. **Payment Failure Tracking** — log all attempts
3. **Support Ticket System** — basic help desk
4. **Delivery Failure Reasons** — track failed attempts
5. **Notification Analytics** — engagement tracking

**Estimated Time:** 2-3 weeks (includes mobile app updates)

---

## 📐 Sample Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  Analytics Dashboard                    [7d ▼] [⬇️] │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Orders │ │   GMV   │ │   AOV   │ │  Repeat │  │
│  │   847   │ │ €42,380 │ │ €50.04  │ │  42.3%  │  │
│  │  +12%   │ │  +8%    │ │  -3%    │ │  +5%    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                      │
│  ┌─────────┐ ┌─────────┐                           │
│  │ Avg Del │ │ Cancel  │                           │
│  │ 28 min  │ │  4.2%   │                           │
│  │  -2min  │ │  +0.3%  │                           │
│  └─────────┘ └─────────┘                           │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  Orders Over Time          [Area Chart]     │   │
│  │                                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌───────────────────┐ ┌───────────────────────┐   │
│  │ Top Restaurants   │ │ Churn Risk Customers  │   │
│  │                   │ │                       │   │
│  └───────────────────┘ └───────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 Integration Points

### Existing Code Locations:

- **Database Schema:** `api/database/schema/`
- **Services Layer:** `api/src/services/`
- **GraphQL Resolvers:** `api/src/models/`
- **Admin Panel:** `admin-panel/src/`

### Files to Create:

```
api/src/services/AnalyticsService.ts
api/src/repositories/AnalyticsRepository.ts
api/src/models/Analytics/Analytics.graphql
api/src/models/Analytics/resolvers/Query/getDashboardMetrics.ts
api/src/models/Analytics/resolvers/Query/getCohortAnalysis.ts
api/src/models/Analytics/resolvers/Query/getGeographicHeatmap.ts
admin-panel/src/app/analytics/page.tsx
admin-panel/src/components/analytics/MetricCard.tsx
admin-panel/src/components/analytics/OrdersChart.tsx
```

---

## 📊 Data Visualization Libraries

**For Admin Panel (Next.js/React):**
- **recharts** — Simple, customizable charts (recommended)
- **tremor** — Beautiful analytics UI components
- **nivo** — Advanced, interactive charts
- **react-map-gl** — For geographic heatmaps

**Installation:**
```bash
cd admin-panel
npm install recharts date-fns
```

---

## 🧪 Testing Strategy

1. **SQL Query Performance:**
   - Add `EXPLAIN ANALYZE` to all queries
   - Target: <500ms for dashboard queries
   - Add indexes where needed

2. **Data Accuracy:**
   - Cross-reference with manual counts
   - Validate formulas (especially percentages)
   - Test edge cases (no data, single order)

3. **Date Range Handling:**
   - Test timezone edge cases
   - Verify DST transitions
   - Handle empty periods gracefully

---

## 🚀 Quick Start Commands

```bash
# Backend: Add analytics queries
cd api
npm run dev

# Admin Panel: Create analytics page
cd admin-panel
npm run dev

# Test queries in psql
psql -U your_user -d delivery_db -f analytics_queries.sql
```

---

## 📝 Notes

- All timestamps use `timestamp with time zone` for accurate time tracking
- Soft deletes (`deleted_at`) are respected in analytics (use `WHERE deleted_at IS NULL`)
- Privacy: Aggregate metrics only, no PII in exports
- Caching: Consider Redis for expensive queries (>1s execution)
- Real-time: Use subscriptions for live dashboard updates (optional)

---

## 🎓 Resources

- [Drizzle ORM Aggregations](https://orm.drizzle.team/docs/select#aggregations)
- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [Cohort Analysis Tutorial](https://mode.com/sql-tutorial/sql-cohort-analysis/)
- [Recharts Documentation](https://recharts.org/en-US/)

---

**Next Steps:**
1. Review this plan
2. Prioritize Phase 1 metrics
3. Create AnalyticsService in backend
4. Build dashboard UI in admin panel
5. Add missing indexes for performance
6. Deploy and monitor query performance

---

*This document is a living plan. Update it as you implement features and discover new insights.*
