# MDS Master Index

> **Machine-readable project documentation index.**
> Every MDS file, its domain, key entities, and cross-references in one place.
> Agents: read this file first to know where to look. Follow `Depends-On` links for related context.

---

## Quick Lookup Table

| ID | File | Domain | Key Entities |
|----|------|--------|-------------|
| A1 | [ARCHITECTURE.md](ARCHITECTURE.md) | System | Monorepo shape, layers, realtime topology |
| B1 | [BACKEND/API.md](BACKEND/API.md) | Backend | Express, Yoga, graphql-ws, Drizzle, auth model |
| B2 | [BACKEND/ORDER_CREATION.md](BACKEND/ORDER_CREATION.md) | Backend | OrderService, payment collection, preflight gate |
| B3 | [BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md](BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md) | Backend | Price integrity, epsilon, promo application |
| B4 | [BACKEND/WATCHDOG_HEARTBEAT.md](BACKEND/WATCHDOG_HEARTBEAT.md) | Backend | DriverHeartbeatHandler, DriverWatchdogService, connection states |
| B5 | [BACKEND/AUTH_AND_USERS.md](BACKEND/AUTH_AND_USERS.md) | Backend | JWT model, signup steps, token rotation, roles, password rules |
| B6 | [BACKEND/DELIVERY_AND_PRODUCT_PRICING.md](BACKEND/DELIVERY_AND_PRODUCT_PRICING.md) | Backend | PricingService, delivery zones, distance tiers, haversine/Mapbox |
| B7 | [BACKEND/DATABASE_SCHEMA.md](BACKEND/DATABASE_SCHEMA.md) | Backend | All 33 tables, domain groupings, naming conventions, relationships |
| B8 | [BACKEND/CACHE_AND_INFRASTRUCTURE.md](BACKEND/CACHE_AND_INFRASTRUCTURE.md) | Backend | Redis cache layer, TTLs, key patterns, invalidation helpers |
| B9 | [BACKEND/UPLOADS_AND_S3.md](BACKEND/UPLOADS_AND_S3.md) | Backend | S3Service, upload/delete REST routes, key generation, auth gaps |
| B10 | [BACKEND/AUDIT_LOGGING.md](BACKEND/AUDIT_LOGGING.md) | Backend | audit_logs table, actor/action/entity enums, AuditLogRepository |
| BL1 | [BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md](BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md) | Business Logic | Settlements, rules, promotions, FinancialService |
| BL2 | [BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md](BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md) | Business Logic | CRUD flows, delete semantics, hook consolidation |
| BL3 | [BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md](BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md) | Business Logic | Cart store, subscription lifecycle, race conditions |
| M1 | [MOBILE/OVERVIEW.md](MOBILE/OVERVIEW.md) | Mobile | Four-app architecture, shared patterns |
| M2 | [MOBILE/PUSH_AND_LIVE_ACTIVITY.md](MOBILE/PUSH_AND_LIVE_ACTIVITY.md) | Mobile | FCM tokens, Live Activity, notification maturity |
| M3 | [MOBILE/LIVE_ACTIVITY_BEHAVIOR.md](MOBILE/LIVE_ACTIVITY_BEHAVIOR.md) | Mobile | iOS widget, progress calculation, APNs pushes |
| M4 | [MOBILE/ORDER_CREATION_AUDIT.md](MOBILE/ORDER_CREATION_AUDIT.md) | Mobile | Checkout gaps, payment collection missing in UI |
| M5 | [MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT.md](MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT.md) | Mobile | CreateOrderInput, variants, offers, options |
| O1 | [OPERATIONS/MONITORING.md](OPERATIONS/MONITORING.md) | Operations | Health endpoints, Prometheus, Grafana phases |
| O2 | [OPERATIONS/OBSERVABILITY.md](OPERATIONS/OBSERVABILITY.md) | Operations | Loki, Promtail, structured logging, runbooks |
| O3 | [OPERATIONS/NOTIFICATIONS.md](OPERATIONS/NOTIFICATIONS.md) | Operations | Query builder, campaigns, payload fields |
| O4 | [OPERATIONS/PUSH_NOTIFICATIONS_AUDIT.md](OPERATIONS/PUSH_NOTIFICATIONS_AUDIT.md) | Operations | Device tokens, multi-device, app type coverage |
| O5 | [OPERATIONS/SECURITY.md](OPERATIONS/SECURITY.md) | Operations | Baseline posture, hardening roadmap |
| O6 | [OPERATIONS/SECURITY_AUDIT_2026-03-13.md](OPERATIONS/SECURITY_AUDIT_2026-03-13.md) | Operations | Finding tracker, action items, verification |
| O7 | [OPERATIONS/ENVIRONMENTS_AND_RELEASES.md](OPERATIONS/ENVIRONMENTS_AND_RELEASES.md) | Operations | Four-env model, CI/CD, secret management |
| O8 | [OPERATIONS/TESTING_PIPELINE.md](OPERATIONS/TESTING_PIPELINE.md) | Operations | CI layers, preflight gate, E2E strategy |
| O9 | [OPERATIONS/DOCKER_AND_STRESS_TESTING.md](OPERATIONS/DOCKER_AND_STRESS_TESTING.md) | Operations | Containerization, k6 load testing |
| O10 | [OPERATIONS/APP_STORE_RELEASE.md](OPERATIONS/APP_STORE_RELEASE.md) | Operations | iOS submission checklist, compliance |
| O11 | [OPERATIONS/ANALYTICS.md](OPERATIONS/ANALYTICS.md) | Operations | KPIs, dashboards, metric calculations |
| UI1 | [ADMIN_MOBILEBUSINESS_UI_CONTEXT.md](ADMIN_MOBILEBUSINESS_UI_CONTEXT.md) | UI | Product types, variant groups, admin/mobile-business UX |
| UI2 | [ADMIN_PANEL_BUSINESS_SETTLEMENTS.md](ADMIN_PANEL_BUSINESS_SETTLEMENTS.md) | UI | Business-facing settlements semantics, filters, lazy order details |

### Non-docs MDS (project-level)

| ID | File | Domain | Purpose |
|----|------|--------|---------|
| R1 | [../README.md](../README.md) | Root | Workspace layout, quick start, schema change guide |
| R2 | [OPERATIONS/TYPECHECK_AGENT_HANDOFF.md](OPERATIONS/TYPECHECK_AGENT_HANDOFF.md) | Operations | Typecheck report, error hotspots, fix order |
| P1 | [../.prompts/mobile-rules.md](../.prompts/mobile-rules.md) | Prompts | mobile-customer/driver coding guidelines |
| PKG1 | [../admin-panel/README.md](../admin-panel/README.md) | Package | Admin panel structure, realtime model |
| PKG2 | [../mobile-business/README.md](../mobile-business/README.md) | Package | Business app features, GraphQL ops, structure |
| PKG3 | [../mobile-customer/README.md](../mobile-customer/README.md) | Package | Mobile customer app module structure |
| PKG4 | [../mobile-driver/README.md](../mobile-driver/README.md) | Package | Mobile driver app module structure |
| PKG5 | [../observability/README.md](../observability/README.md) | Package | Observability stack setup, alerts, scaling |

---

## Dependency Graph

```
ARCHITECTURE (A1)
├── BACKEND/DATABASE_SCHEMA (B7) ◄── all tables
│
├── BACKEND/API (B1)
│   ├── BACKEND/AUTH_AND_USERS (B5)
│   │   └── OPERATIONS/SECURITY (O5)
│   │       └── OPERATIONS/SECURITY_AUDIT_2026-03-13 (O6)
│   ├── BACKEND/CACHE_AND_INFRASTRUCTURE (B8)
│   ├── BACKEND/ORDER_CREATION (B2)
│   │   ├── BACKEND/ORDER_TOTAL_PRICE_VALIDATION (B3)
│   │   ├── BACKEND/DELIVERY_AND_PRODUCT_PRICING (B6)
│   │   │   └── BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS (BL1)
│   │   │       └── OPERATIONS/NOTIFICATIONS (O3)
│   │   └── BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS (BL1)
│   ├── BACKEND/UPLOADS_AND_S3 (B9)
│   ├── BACKEND/AUDIT_LOGGING (B10)
│   └── BACKEND/WATCHDOG_HEARTBEAT (B4)
│       └── MOBILE/LIVE_ACTIVITY_BEHAVIOR (M3)
│
├── MOBILE/OVERVIEW (M1)
│   ├── MOBILE/PUSH_AND_LIVE_ACTIVITY (M2)
│   │   └── MOBILE/LIVE_ACTIVITY_BEHAVIOR (M3)
│   ├── MOBILE/ORDER_CREATION_AUDIT (M4) → B2, B6
│   ├── MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT (M5)
│   └── BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS (BL3)
│       └── BACKEND/ORDER_CREATION (B2)
│
├── BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW (BL2)
│   └── ADMIN_MOBILEBUSINESS_UI_CONTEXT (UI1)
│
└── OPERATIONS
    ├── MONITORING (O1)
    │   └── OBSERVABILITY (O2)
    ├── NOTIFICATIONS (O3)
    │   └── PUSH_NOTIFICATIONS_AUDIT (O4)
    ├── SECURITY (O5) ← B5
    │   └── SECURITY_AUDIT_2026-03-13 (O6) ← B5, B9
    ├── ENVIRONMENTS_AND_RELEASES (O7)
    │   └── TESTING_PIPELINE (O8)
    │       └── DOCKER_AND_STRESS_TESTING (O9)
    ├── APP_STORE_RELEASE (O10)
    └── ANALYTICS (O11)
```

---

## Domain-to-MDS Mapping

### Orders Domain
| Concern | MDS Files |
|---------|-----------|
| Order creation flow | B2, B3, BL1 |
| Cart → checkout → order | BL3, M4, M5 |
| Payment collection modes | B2, M4, BL1 |
| Order tracking (realtime) | A1, B4, M3 |
| Order analytics | O11 |

### Driver Domain
| Concern | MDS Files |
|---------|-----------|
| Heartbeat/presence | B4, A1 |
| Watchdog state machine | B4, O1 |
| Live ETA / tracking | B4, M3 |
| Driver settlements | BL1 |
| Driver auth | O5, O6 |

### Product/Business Domain
| Concern | MDS Files |
|---------|-----------|
| Product CRUD | BL2, UI1 |
| Variant groups / offers | UI1, M5 |
| Category cascade | BL2 |
| Business CRUD | BL2 |

### Notifications Domain
| Concern | MDS Files |
|---------|-----------|
| Push notifications | M2, O3, O4 |
| Live Activity | M2, M3 |
| Campaign system | O3, O4 |
| Device token lifecycle | O4 |

### Financial Domain
| Concern | MDS Files |
|---------|-----------|
| Settlement rules | BL1 |
| Promotion engine | BL1, B2, B3 |
| Payment collection | B2, M4, BL1 |
| Financial dashboards | BL1, O11 |

### Auth Domain
| Concern | MDS Files |
|---------|----------|
| JWT token model | B5, B1 |
| Signup flow | B5 |
| Token rotation / refresh | B5 |
| User roles | B5, B7 |
| Password rules | B5 |

### Pricing Domain
| Concern | MDS Files |
|---------|----------|
| Product price logic | B6, B7 |
| Delivery zones | B6, B7 |
| Delivery pricing tiers | B6, B7 |
| Settlement pricing | BL1, B6 |

### Security Domain
| Concern | MDS Files |
|---------|----------|
| Security posture | O5 |
| Audit findings | O6 |
| Token storage | O6, O5, B5 |
| Auth model | B1, B5, O5 |
| S3 upload auth gaps | B9, O6 |

### Infrastructure Domain
| Concern | MDS Files |
|---------|-----------|
| Monitoring | O1, O2 |
| Observability stack | O2, PKG5 |
| Environments | O7 |
| CI/CD | O7, O8 |
| Docker / load testing | O9 |
| App Store release | O10 |
| Redis cache | B8 |
| S3 uploads | B9 |
| Audit logging | B10 |
| Database schema | B7 |

---

## Known Issues & Inconsistencies

> ✅ All previously tracked broken links and content issues have been resolved (2026-03-18).

### Resolved Items (2026-03-18)
- Fixed broken links in README.md (root) and admin-panel/README.md → SETTLEMENTS_AND_PROMOTIONS.md
- Fixed titles in mobile-customer/README.md and mobile-driver/README.md
- Deleted mobile-business/SETUP.md (overlapped PKG2)
- Deleted .prompts/api-rules-not-finished.md and .prompts/konfigurimipergithub.md (both stale/incomplete)
- Moved TYPECHECK_AGENT_HANDOFF.md from root → docs/OPERATIONS/
- Fixed stale useCartProductDetails.ts reference in BL3
- Added all missing docs/README.md index entries (B5–B10 and previously missing files)

### Open Items
| File | Issue |
|------|-------|
| admin-panel/src/app/dashboard/orders/page_old.tsx | Stale "_old" backup — confirm deletion with team before removing |

---

## File Source Code References

> Key backend and frontend files referenced across MDS. Use this when a code change might require MDS updates.

### Backend (api/)
| File | Referenced By |
|------|--------------|
| `src/index.ts` | A1, B1, O6 |
| `src/graphql/createContext.ts` | B1 |
| `src/lib/pubsub.ts` | B1, A1 |
| `src/lib/metrics.ts` | O1 |
| `src/services/DriverService.ts` | A1, B4 |
| `src/services/DriverHeartbeatHandler.ts` | A1, B4, M3 |
| `src/services/DriverWatchdogService.ts` | A1, B4 |
| `src/services/driverServices.init.ts` | A1, B4 |
| `src/services/DriverAuthService.ts` | O6 |
| `src/repositories/DriverRepository.ts` | A1, B4 |
| `src/services/OrderService.ts` (createOrder) | B2, B3 |
| `src/services/FinancialService.ts` | BL1 |
| `src/services/SettlementCalculationEngine.ts` | BL1 |
| `src/services/PromotionEngine.ts` | BL1, B2, B3 |
| `src/services/NotificationService.ts` | M2, M3, O3, O4 |
| `src/repositories/SettlementRepository.ts` | BL1 |
| `src/repositories/SettlementRuleRepository.ts` | BL1 |
| `src/routes/uploadRoutes.ts` | B9, O6 |
| `src/services/AuthService.ts` | B5 |
| `src/lib/utils/permissions.ts` | B5, O5 |
| `src/services/PricingService.ts` | B6 |
| `src/services/S3Service.ts` | B9 |
| `src/repositories/AuthRepository.ts` | B5 |
| `src/models/User/resolvers/Mutation/createUser.ts` | B5 |
| `src/models/User/resolvers/utils/toUserParent.ts` | B5 |
| `src/models/User/resolvers/Mutation/updateUser.ts` | B5 |
| `src/models/User/resolvers/Mutation/deleteUser.ts` | B5 |
| `src/models/User/resolvers/Mutation/updateUserNote.ts` | B5 |
| `src/models/User/resolvers/Mutation/setUserPermissions.ts` | B5 |
| `src/models/User/resolvers/Query/users.ts` | B5 |
| `src/models/User/resolvers/Query/drivers.ts` | B5 |
| `src/models/Business/resolvers/Mutation/createBusiness.ts` | B5, BL2 |
| `src/models/Business/resolvers/Mutation/createBusinessWithOwner.ts` | B5, BL2 |
| `src/models/Business/resolvers/Mutation/updateBusiness.ts` | B5, BL2 |
| `src/models/Business/resolvers/Mutation/setBusinessSchedule.ts` | B5, BL2 |
| `src/models/Business/resolvers/Mutation/deleteBusiness.ts` | B5, BL2 |
| `src/models/Product/resolvers/Mutation/createProduct.ts` | B5, BL2 |
| `src/models/Product/resolvers/Mutation/updateProduct.ts` | B5, BL2 |
| `src/models/Product/resolvers/Mutation/deleteProduct.ts` | B5, BL2 |
| `src/models/Product/resolvers/Mutation/updateProductsOrder.ts` | B5, BL2 |
| `src/repositories/AuditLogRepository.ts` | B10 |
| `src/lib/cache.ts` | B8 |
| `src/lib/haversine.ts` | B6 |
| `scripts/run-settlement-harness.ts` | B2, BL1, O8 |
| `database/schema/settlements.ts` | BL1 |
| `database/schema/settlementRules.ts` | BL1 |
| `database/schema/promotions.ts` | BL1 |
| `database/schema/auditLogs.ts` | B10 |
| `database/schema/deliveryZones.ts` | B6, B7 |
| `database/schema/deliveryPricingTiers.ts` | B6, B7 |
| `database/schema/productPricing.ts` | B6, B7 |
| `database/schema/users.ts` | B5, B7 |
| `database/schema/refreshTokenSessions.ts` | B5, B7 |

### Admin Panel (admin-panel/)
| File | Referenced By |
|------|--------------|
| `src/app/dashboard/market/page.tsx` | UI1 |
| `src/app/dashboard/finances/page.tsx` | BL1 |
| `src/app/dashboard/notifications/page.tsx` | O3 |
| `src/app/dashboard/categories/page.tsx` | UI1, B5 |
| `src/app/dashboard/businesses/page.tsx` | B5, BL2, UI1 |
| `src/app/dashboard/layout.tsx` | B5, UI1 |
| `src/app/admin/layout.tsx` | B5, UI1 |
| `src/components/businesses/ProductsBlock.tsx` | UI1 |
| `src/lib/auth-context.tsx` | B5 |
| `src/lib/route-access.ts` | B5 |
| `src/components/dashboard/sidebar.tsx` | UI1, B5 |
| `src/lib/hooks/useProducts.ts` | UI1 |
| `src/graphql/operations/products/` | UI1 |
| `src/graphql/operations/businesses/mutations.ts` | B5, UI1 |
| `src/graphql/operations/users/mutations.ts` | B5, UI1 |
| `admin/financial/rules/page.tsx` | BL1 |
| `admin/financial/testing/page.tsx` | BL1 |

### Mobile Customer (mobile-customer/)
| File | Referenced By |
|------|--------------|
| `app/(tabs)/restaurants.tsx` | BL2 |
| `app/business/[businessId].tsx` | BL2 |
| `modules/business/BusinessScreen.tsx` | BL2 |
| `modules/cart/components/CartScreen.tsx` | BL3 |
| `hooks/useLiveActivity.ts` | M3 |
| `hooks/useCreateOrder.ts` | M4, BL3 |
| `hooks/useActiveOrdersTracking.ts` | BL3 |
| `hooks/useOrders.ts` | BL3 |
| `hooks/useOrdersSubscription.ts` | BL3 |
| `plugins/with-live-activity-extension.js` | M3 |
| `utils/secureTokenStore.ts` | O6 |

### Mobile Driver (mobile-driver/)
| File | Referenced By |
|------|--------------|
| `utils/secureTokenStore.ts` | O6 |

### Mobile Business (mobile-business/)
| File | Referenced By |
|------|--------------|
| `graphql/products.ts` | UI1 |
| `app/(tabs)/products.tsx` | UI1 |
| `app/(tabs)/dashboard.tsx` | UI1 |

---

## Versioning

| Field | Value |
|-------|-------|
| Last full scan | 2026-03-18 |
| Total MDS files | 46 |
| Total docs/ files | 32 |
| Broken links found | 0 |
| Missing index entries | 0 |
| Cross-ref gaps | 0 |
