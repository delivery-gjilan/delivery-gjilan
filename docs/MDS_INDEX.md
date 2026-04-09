
## Operations Analytics

- `docs/OPERATIONS/KPI_ANALYTICS.md` - KPI formulas, fake-ready and premature-ready definitions, GraphQL queries, and event emission map.
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
| B2 | [BACKEND/ORDER_CREATION.md](BACKEND/ORDER_CREATION.md) | Backend | OrderService facade + 6 domain modules (`order/`), IOrderService, AWAITING_APPROVAL, locationFlagged, service-zone coverage, payment collection, preflight gate, dispatch notification side-effects (Redis `dispatch:early`) |
| B3 | [BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md](BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md) | Backend | Price integrity, epsilon, promo application, one-directional delivery validation |
| B4 | [BACKEND/WATCHDOG_HEARTBEAT.md](BACKEND/WATCHDOG_HEARTBEAT.md) | Backend | DriverHeartbeatHandler, DriverWatchdogService, connection states |
| B5 | [BACKEND/AUTH_AND_USERS.md](BACKEND/AUTH_AND_USERS.md) | Backend | JWT model, signup steps, token rotation, roles, password rules |
| B6 | [BACKEND/DELIVERY_AND_PRODUCT_PRICING.md](BACKEND/DELIVERY_AND_PRODUCT_PRICING.md) | Backend | PricingService, delivery zones, distance tiers, haversine/Mapbox |
| B7 | [BACKEND/DATABASE_SCHEMA.md](BACKEND/DATABASE_SCHEMA.md) | Backend | All 33 tables, domain groupings, naming conventions, relationships |
| B8 | [BACKEND/CACHE_AND_INFRASTRUCTURE.md](BACKEND/CACHE_AND_INFRASTRUCTURE.md) | Backend | Redis cache layer, TTLs, key patterns, invalidation helpers |
| B9 | [BACKEND/UPLOADS_AND_S3.md](BACKEND/UPLOADS_AND_S3.md) | Backend | S3Service, upload/delete REST routes, key generation, auth gaps |
| B10 | [BACKEND/AUDIT_LOGGING.md](BACKEND/AUDIT_LOGGING.md) | Backend | audit_logs table, actor/action/entity enums, AuditLogRepository |
| B11 | [BACKEND/OUT_OF_ZONE_AND_APPROVAL.md](BACKEND/OUT_OF_ZONE_AND_APPROVAL.md) | Backend | Out-of-coverage handling, locationFlagged, approval-required orders, admin alerts |
| BL1 | [BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md](BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md) | Business Logic | Settlements, rules, promotions, FinancialService, PromotionEngine, mobile-customer progression bar |
| BL2 | [BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md](BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md) | Business Logic | CRUD flows, delete semantics, hook consolidation |
| BL3 | [BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md](BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md) | Business Logic | Cart store, subscription lifecycle, race conditions |
| BL4 | [BUSINESS_LOGIC/PERSONAL_INVENTORY_COVERAGE.md](BUSINESS_LOGIC/PERSONAL_INVENTORY_COVERAGE.md) | Business Logic | ⚠️ **Superseded by FF1** — see FUTURE_FEATURES/PERSONAL_INVENTORY_COVERAGE.md |
| BL5 | [BANNER_MANAGEMENT.md](BANNER_MANAGEMENT.md) | Business Logic | Banner system: multi-media support, business/product/promotion targeting, scheduling, display contexts, admin panel UI |
| FF1 | [FUTURE_FEATURES/PERSONAL_INVENTORY_COVERAGE.md](FUTURE_FEATURES/PERSONAL_INVENTORY_COVERAGE.md) | Future Feature | Personal stock tracking, order coverage split, margin optimisation |
| FF2 | [FUTURE_FEATURES/BUSINESS_DISPATCH.md](FUTURE_FEATURES/BUSINESS_DISPATCH.md) | Future Feature | Business-initiated driver dispatch, internal delivery runs |
| FF3 | [FUTURE_FEATURES/CUSTOM_NAVIGATION.md](FUTURE_FEATURES/CUSTOM_NAVIGATION.md) | Future Feature | Migrating from `@badatgil/expo-mapbox-navigation` SDK to custom `@rnmapbox/maps` navigation — cost driver, unused hook inventory, step-by-step migration plan |
| FF4 | [FUTURE_FEATURES/EMAIL_SERVICE.md](FUTURE_FEATURES/EMAIL_SERVICE.md) | Future Feature | Transactional email via Resend — order receipt on delivery, email verification migration, react-email templates, EmailService architecture |
| FF5 | [FUTURE_FEATURES/MINIMUM_ORDER_AMOUNT.md](FUTURE_FEATURES/MINIMUM_ORDER_AMOUNT.md) | Future Feature | Per-business minimum order subtotal — DB column, API enforcement in createOrder, admin panel edit form, mobile-customer cart bar + disabled checkout |
| FF6 | [FUTURE_FEATURES/BUSINESS_PREP_TIME_UPDATE.md](FUTURE_FEATURES/BUSINESS_PREP_TIME_UPDATE.md) | Future Feature | Business can extend prep time on PREPARING orders — "Add Time" UI in mobile-business, notifies customer/driver/admins (push), amber badge + map marker pulse in admin panel orders & map pages via `usePrepTimeAlerts` hook |
| M1 | [MOBILE/OVERVIEW.md](MOBILE/OVERVIEW.md) | Mobile | Four-app architecture, shared patterns |
| M2 | [MOBILE/PUSH_AND_LIVE_ACTIVITY.md](MOBILE/PUSH_AND_LIVE_ACTIVITY.md) | Mobile | FCM tokens, Live Activity, notification maturity |
| M3 | [MOBILE/LIVE_ACTIVITY_BEHAVIOR.md](MOBILE/LIVE_ACTIVITY_BEHAVIOR.md) | Mobile | iOS widget, progress calculation, APNs pushes |
| M4 | [MOBILE/ORDER_CREATION_AUDIT.md](MOBILE/ORDER_CREATION_AUDIT.md) | Mobile | Checkout gaps, payment collection missing in UI |
| M5 | [MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT.md](MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT.md) | Mobile | CreateOrderInput, variants, offers, options |
| M6 | [MOBILE/ADMIN_PANEL_MOBILE_REFACTOR_TRACKER.md](MOBILE/ADMIN_PANEL_MOBILE_REFACTOR_TRACKER.md) | Mobile | Admin-panel to mobile parity tracker (business/admin flows) |
| M7 | [MOBILE/ORDER_SUBSCRIPTION_SYNC_MB.md](MOBILE/ORDER_SUBSCRIPTION_SYNC_MB.md) | Mobile | Subscription-first order sync, cache/store update contract, fallback refetch rules |
| M8 | [MOBILE/DRIVER_APP.md](MOBILE/DRIVER_APP.md) | Mobile | Driver app deep-dive: heartbeat (exp. backoff), navigation (PickupSlider, DeliverySlider, minimized-nav flow, per-order status exit), OrderPoolSheet, PTT, battery, auth, stores, GraphQL ops, full i18n (EN/AL), error feedback, cancel enum keys, JS-only network state detection, Apollo cache versioning, route cache limits, offline connection banner, authenticated-only global overlays, successful-network-gated cold-start assigned-order routing with retry, persisted recently-unassigned suppression |
| M9 | [MOBILE/MOBILE_ADMIN_DEEP_DIVE.md](MOBILE/MOBILE_ADMIN_DEEP_DIVE.md) | Mobile | Mobile-admin deep-dive: all screens, GraphQL ops, real-time arch, theme, i18n, refactor candidates |
| M10 | [MOBILE/REALTIME_SUBSCRIPTIONS_CUSTOMER.md](MOBILE/REALTIME_SUBSCRIPTIONS_CUSTOMER.md) | Mobile | Subscription topology audit, connection count, payload sizing, duplicate subscriptions, optimization roadmap |
| M11 | [MOBILE/PUSH_AND_LIVE_ACTIVITY_REFACTOR_PLAN.md](MOBILE/PUSH_AND_LIVE_ACTIVITY_REFACTOR_PLAN.md) | Mobile | Full audit of all push notifications and Live Activity; copy refinements; Android notification icon wiring; brand logo in Lock Screen widget; Albanian copy corrections |
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
| O11 | [OPERATIONS/ANALYTICS.md](OPERATIONS/ANALYTICS.md) | Operations | Analytics roadmap, event tracking, dashboard phases |
| O11 | [OPERATIONS/ANALYTICS.md](OPERATIONS/ANALYTICS.md) | Operations | KPIs, dashboards, metric calculations |
| O12 | [OPERATIONS/DRIVER_TRACKING_SMOOTHNESS.md](OPERATIONS/DRIVER_TRACKING_SMOOTHNESS.md) | Operations | End-to-end driver position pipeline, animation tuning, dead-reckoning, route-snap |
| O13 | [OPERATIONS/PAGINATION_AUDIT.md](OPERATIONS/PAGINATION_AUDIT.md) | Operations | Full pagination audit: what is paginated, unbounded queries by risk level, fix order |
| O14 | [OPERATIONS/MONITORING_FUTURE_PLAN.md](OPERATIONS/MONITORING_FUTURE_PLAN.md) | Operations | Forward monitoring roadmap: dispatch, freshness, SLOs, integrity, business-impact signals |
| O15 | [APP_STORE_DEPLOYMENT.md](APP_STORE_DEPLOYMENT.md) | Operations | Workspace-level App Store submission tracker for the four mobile apps, including completed/skipped phases and release blockers |
| O17 | [OPERATIONS/ANDROID_PLAY_STORE_DEPLOYMENT.md](OPERATIONS/ANDROID_PLAY_STORE_DEPLOYMENT.md) | Operations | Android Play Store deployment plan for Zipp Go, Zipp Driver, and Zipp Business — map bug root cause, config gap matrix, build/submit phases, Data Safety form requirements |
| O18 | [OPERATIONS/HA_DEPLOYMENT_PLAN.md](OPERATIONS/HA_DEPLOYMENT_PLAN.md) | Operations | High-availability deployment plan: load balancer (Nginx/Caddy), 2–3 API instances (PM2/Docker), shared Redis + Postgres, WebSocket upgrade config, health check endpoint, risk matrix, 2-VPS launch stack |
| O19 | [OPERATIONS/APP_STORE_CONNECT_CUSTOMER.md](OPERATIONS/APP_STORE_CONNECT_CUSTOMER.md) | Operations | Exact App Store Connect field selections, metadata choices, screenshot guidance, and review-info checklist for the customer iOS app |
| O20 | [OPERATIONS/DEPLOYMENT_GUIDE.md](OPERATIONS/DEPLOYMENT_GUIDE.md) | Operations | Hetzner production deployment runbook: server bootstrap, Docker stack, Caddy TLS on api.zippgo.uk, health verification, and GHCR deploy flow |
| O16 | [DEMO_MODE_PLAN.md](DEMO_MODE_PLAN.md) | Operations | Apple review demo-account flow, auto-progression behavior, reviewer credentials strategy, and admin-panel demo-account operations |
| UI1 | [ADMIN_MOBILEBUSINESS_UI_CONTEXT.md](ADMIN_MOBILEBUSINESS_UI_CONTEXT.md) | UI | Product types, variant groups, admin/mobile-business UX |
| UI2 | [ADMIN_PANEL_BUSINESS_SETTLEMENTS.md](ADMIN_PANEL_BUSINESS_SETTLEMENTS.md) | UI | Business-facing settlements semantics, filters, lazy order details |

### Non-docs MDS (project-level)

| ID | File | Domain | Purpose |
|----|------|--------|---------|
| R1 | [../README.md](../README.md) | Root | Workspace layout, quick start, schema change guide |
| R2 | [OPERATIONS/TYPECHECK_AGENT_HANDOFF.md](OPERATIONS/TYPECHECK_AGENT_HANDOFF.md) | Operations | Typecheck report, error hotspots, fix order |
| R3 | [../api/SOFT_DELETE_CONVENTION.md](../api/SOFT_DELETE_CONVENTION.md) | Backend | Soft-delete rules, affected tables, repository pattern enforcement |
| P1 | [../.prompts/mobile-rules.md](../.prompts/mobile-rules.md) | Prompts | mobile-customer/driver coding guidelines |
| P2 | [../.github/copilot-instructions.md](../.github/copilot-instructions.md) | Prompts | API repository-first rule, soft-delete enforcement for AI agents |
| PKG1 | [../admin-panel/README.md](../admin-panel/README.md) | Package | Admin panel structure, realtime model |
| PKG2 | [../mobile-business/README.md](../mobile-business/README.md) | Package | Business app features, GraphQL ops, structure |
| PKG3 | [../mobile-customer/README.md](../mobile-customer/README.md) | Package | Mobile customer app module structure |
| PKG4 | [../mobile-driver/README.md](../mobile-driver/README.md) | Package | Mobile driver app module structure (see M8 for deep-dive) |
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
│   ├── MOBILE/ORDER_SUBSCRIPTION_SYNC_MB (M7) → A1, BL3
│   ├── MOBILE/REALTIME_SUBSCRIPTIONS_CUSTOMER (M10) → A1, B1, B4, M7, BL3
│   ├── MOBILE/DRIVER_APP (M8) → A1, B1, B4, B5, B7, BL1
│   └── BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS (BL3)
│       └── BACKEND/ORDER_CREATION (B2)
│
├── BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW (BL2)
│   └── ADMIN_MOBILEBUSINESS_UI_CONTEXT (UI1)
│
└── OPERATIONS
    ├── MONITORING (O1)
    │   ├── OBSERVABILITY (O2)
    │   └── MONITORING_FUTURE_PLAN (O14) ← O1, O2, O11, B4
    ├── NOTIFICATIONS (O3)
    │   └── PUSH_NOTIFICATIONS_AUDIT (O4)
    ├── SECURITY (O5) ← B5
    │   └── SECURITY_AUDIT_2026-03-13 (O6) ← B5, B9
    ├── ENVIRONMENTS_AND_RELEASES (O7)
    │   └── TESTING_PIPELINE (O8)
    │       └── DOCKER_AND_STRESS_TESTING (O9)
    ├── APP_STORE_RELEASE (O10)
    │   ├── APP_STORE_DEPLOYMENT (O15)
    │   └── APP_STORE_CONNECT_CUSTOMER (O19)
    ├── DEPLOYMENT_GUIDE (O20) ← O7
    ├── ANALYTICS (O11)
    └── DRIVER_TRACKING_SMOOTHNESS (O12) ← B4, M8
```

---

## Domain-to-MDS Mapping

### Orders Domain
| Concern | MDS Files |
|---------|-----------|
| Order creation flow | B2, B3, BL1 |
| Cart → checkout → order | BL3, M4, M5 |
| Payment collection modes | B2, M4, BL1 |
| Order tracking (realtime) | A1, B4, M3, M7, O12 |
| Order analytics | O11 |

### Driver Domain
| Concern | MDS Files |
|---------|-----------|
| Heartbeat/presence | B4, A1 |
| Watchdog state machine | B4, O1 |
| Live ETA / tracking | B4, M3, O12 |
| Driver settlements | BL1 |
| Driver auth | O5, O6 |

### Product/Business Domain
| Concern | MDS Files |
|---------|-----------|
| Product CRUD | BL2, UI1 |
| Variant groups / offers | UI1, M5 |
| Category cascade | BL2 |
| Market tab (mobile-customer) | BL2 |
| Business CRUD | BL2 |
| Order status state machine | B2 |
| Market order flow (PENDING→READY skip) | B2 |
| Personal inventory & order coverage | FF1 (future) |
| Business-initiated driver dispatch | FF2 (future) |
| Custom navigation (replace SDK) | FF3 (future) |

### Marketing/Promotions Domain
| Concern | MDS Files |
|---------|-----------|
| Banner management | BL5 |
| Banner scheduling | BL5 |
| Business/product targeting | BL5 |
| Promotion system | BL1, B2, B3 |
| Multi-media banners (image/GIF/video) | BL5 |

### Notifications Domain
| Concern | MDS Files |
|---------|-----------|
| Push notifications | M2, O3, O4 |
| Live Activity | M2, M3 |
| Campaign system | O3, O4 |
| Device token lifecycle | O4 |
| Transactional email (receipts, verification) | FF4 (future) |

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
| Monitoring roadmap | O14, O1, O2, O11 |
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
| `src/services/DriverHeartbeatHandler.ts` | A1, B4, M3, O12 |
| `src/services/DriverWatchdogService.ts` | A1, B4 |
| `src/services/driverServices.init.ts` | A1, B4 |
| `src/services/DriverAuthService.ts` | O6 |
| `src/repositories/DriverRepository.ts` | A1, B4 |
| `src/services/OrderService.ts` (createOrder) | B2, B3 |
| `src/services/FinancialService.ts` | BL1 |
| `src/services/SettlementCalculationEngine.ts` | BL1 |
| `src/services/PromotionEngine.ts` | BL1, B2, B3 |
| `src/services/NotificationService.ts` | M2, M3, O3, O4 |
| `src/models/Order/resolvers/Mutation/cancelOrder.ts` | M3 |
| `src/repositories/SettlementRepository.ts` | BL1 |
| `src/repositories/SettlementRuleRepository.ts` | BL1 |
| `src/routes/uploadRoutes.ts` | B9, O6 |
| `src/routes/directionsRoutes.ts` | B1, B8, O5 |
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
| `database/schema/orders.ts` | B2, B3, BL1 |
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
| `src/app/dashboard/notifications/devices/page.tsx` | O4 — 1 row/business; deduped by latest heartbeat; joined with business name via GET_BUSINESSES |
| `src/app/dashboard/categories/page.tsx` | UI1, B5 |
| `src/app/dashboard/businesses/page.tsx` | B5, BL2, UI1 |
| `src/app/dashboard/layout.tsx` | B5, UI1 |
| `src/app/admin/layout.tsx` | B5, UI1 |
| `src/app/admin/messages/page.tsx` | O3 — tabbed Driver + Business messages merged page |
| `src/components/businesses/ProductsBlock.tsx` | UI1 |
| `src/lib/auth-context.tsx` | B5 |
| `src/lib/route-access.ts` | B5 |
| `src/lib/utils/mapbox.ts` | B1, O5 |
| `src/app/dashboard/map/page.tsx` | O12 — includes BIZ tab, freshness badge (bottom-left), chat bubbles |
| `src/app/api/directions/route.ts` | B1, B8, O5 |
| `src/components/dashboard/sidebar.tsx` | UI1, B5 — collapsible sections, auto-open on active route |
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
| `components/SuccessModalContainer.tsx` | BL3 |
| `hooks/useLiveActivity.ts` | M3 |
| `hooks/useCreateOrder.ts` | M4, BL3 |
| `hooks/useActiveOrdersTracking.ts` | BL3 |
| `hooks/useOrders.ts` | BL3 |
| `hooks/useOrdersSubscription.ts` | BL3 |
| `plugins/with-live-activity-extension.js` | M3 |
| `modules/orders/components/OrderDetails.tsx` | O12 |
| `utils/secureTokenStore.ts` | O6 |
| `app/(tabs)/market.tsx` | BL2 |
| `modules/product/hooks/useProducts.ts` | BL2 |

### Mobile Driver (mobile-driver/)
| File | Referenced By |
|------|--------------|
| `app/(tabs)/messages.tsx` | M8 — driver↔admin chat; extraMessages persisted to AsyncStorage (key: driver_chat_extra_messages) |
| `utils/secureTokenStore.ts` | O6 |
| `utils/mapbox.ts` | B1, O5 |
| `utils/route.ts` | B1, O5 |
| File | Referenced By |
|------|--------------|
| `graphql/products.ts` | UI1 |
| `app/(tabs)/products.tsx` | UI1 |
| `app/(tabs)/dashboard.tsx` | UI1 |

---

## Versioning

| Field | Value |
|-------|-------|
| Last full scan | 2026-03-28 (admin map BIZ tab + freshness fixes; merged messages page; sidebar collapsible; driver chat persistence; business devices page refactor) |
| Total MDS files | 50 |
| Total docs/ files | 35 |
| Broken links found | 0 |
| Missing index entries | 0 |
| Cross-ref gaps | 0 |
