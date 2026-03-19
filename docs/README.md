# Docs Hub

This folder is the curated documentation entrypoint for the monorepo. It sits on top of the older deep-dive markdown files and organizes the important system knowledge by area.

## Start Here

- [ARCHITECTURE.md](ARCHITECTURE.md) for the system map
- [BACKEND/API.md](BACKEND/API.md) for API structure, GraphQL flow, auth, and subscriptions
- [BACKEND/ORDER_CREATION.md](BACKEND/ORDER_CREATION.md) for create-order behavior, pricing/promo validation, and payment collection modes
- [BACKEND/WATCHDOG_HEARTBEAT.md](BACKEND/WATCHDOG_HEARTBEAT.md) for driver realtime behavior
- [BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md](BACKEND/ORDER_TOTAL_PRICE_VALIDATION.md) for total and delivery fee validation rules
- [BACKEND/AUTH_AND_USERS.md](BACKEND/AUTH_AND_USERS.md) for JWT token model, 4-step signup, token rotation, roles, and password rules
- [BACKEND/DELIVERY_AND_PRODUCT_PRICING.md](BACKEND/DELIVERY_AND_PRODUCT_PRICING.md) for product price precedence, delivery zones, distance tiers, and Mapbox/haversine fallback
- [BACKEND/DATABASE_SCHEMA.md](BACKEND/DATABASE_SCHEMA.md) for all 33 database tables grouped by domain, naming conventions, and key relationships
- [BACKEND/CACHE_AND_INFRASTRUCTURE.md](BACKEND/CACHE_AND_INFRASTRUCTURE.md) for the Redis cache layer, TTLs, key patterns, and invalidation helpers
- [BACKEND/UPLOADS_AND_S3.md](BACKEND/UPLOADS_AND_S3.md) for image upload/delete REST routes, S3Service, key generation, and auth gaps
- [BACKEND/AUDIT_LOGGING.md](BACKEND/AUDIT_LOGGING.md) for the audit_logs table, all actor/action/entity enums, and AuditLogRepository
- [MOBILE/OVERVIEW.md](MOBILE/OVERVIEW.md) for the app split and shared mobile patterns
- [MOBILE/ORDER_CREATION_AUDIT.md](MOBILE/ORDER_CREATION_AUDIT.md) for current mobile checkout/create-order integration gaps
- [MOBILE/PUSH_AND_LIVE_ACTIVITY.md](MOBILE/PUSH_AND_LIVE_ACTIVITY.md) for push notification plumbing and the current Live Activity state
- [MOBILE/LIVE_ACTIVITY_BEHAVIOR.md](MOBILE/LIVE_ACTIVITY_BEHAVIOR.md) for Live Activity status/ETA update behavior, compact Dynamic Island UI, and background update guarantees
- [BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md](BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md) for settlement state, promotion linkage, and financial testing harness
- [OPERATIONS/NOTIFICATIONS.md](OPERATIONS/NOTIFICATIONS.md) for notification campaigns, admin send flows, and delivery alerts
- [OPERATIONS/MONITORING.md](OPERATIONS/MONITORING.md) for what is actually monitored today, what is missing, and the recommended production monitoring path
- [OPERATIONS/APP_STORE_RELEASE.md](OPERATIONS/APP_STORE_RELEASE.md) for iOS release and App Store readiness
- [OPERATIONS/ANALYTICS.md](OPERATIONS/ANALYTICS.md) for KPI priorities and implementation direction
- [OPERATIONS/SECURITY.md](OPERATIONS/SECURITY.md) for the security backlog and quick wins
- [OPERATIONS/OBSERVABILITY.md](OPERATIONS/OBSERVABILITY.md) for logs, dashboards, alerts, and scaling phases
- [OPERATIONS/TESTING_PIPELINE.md](OPERATIONS/TESTING_PIPELINE.md) for the recommended automated and manual testing strategy
- [OPERATIONS/ENVIRONMENTS_AND_RELEASES.md](OPERATIONS/ENVIRONMENTS_AND_RELEASES.md) for the go-live environment model, deployment flow, and release pipeline
- [OPERATIONS/DOCKER_AND_STRESS_TESTING.md](OPERATIONS/DOCKER_AND_STRESS_TESTING.md) for future containerization and load-testing planning
- [OPERATIONS/SECURITY_AUDIT_2026-03-13.md](OPERATIONS/SECURITY_AUDIT_2026-03-13.md) for security finding tracker, action items, and verification checklist
- [OPERATIONS/PUSH_NOTIFICATIONS_AUDIT.md](OPERATIONS/PUSH_NOTIFICATIONS_AUDIT.md) for device token lifecycle, multi-device patterns, and app type coverage audit
- [MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT.md](MOBILE/ORDER_INPUT_VARIANT_OFFER_FLOW_SNAPSHOT.md) for cart-to-order GraphQL input mapping for variants and offers
- [BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md](BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md) for cart-to-checkout race conditions and active order flow
- [BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md](BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md) for product/business/category CRUD flows and refactor checklist
- [ADMIN_MOBILEBUSINESS_UI_CONTEXT.md](ADMIN_MOBILEBUSINESS_UI_CONTEXT.md) for product management UX across admin panel and mobile-business
- [MDS_INDEX.md](MDS_INDEX.md) — **Master MDS index** with dependency graph, domain mapping, and consistency tracker
- [MDS_UPDATE_WORKFLOW.md](MDS_UPDATE_WORKFLOW.md) — **How to keep MDS consistent** with project changes, agent optimization, and periodic checks

## Why This Exists

The repository already had valuable markdown files, but they were spread across the root and mixed together with checklists, rollout notes, and one-off investigations. The goal here is:

- give new contributors a predictable place to start
- keep architecture docs separate from migration plans and temporary analysis notes
- document the systems that are easy to misunderstand: subscriptions, heartbeat, watchdog, pricing, promotions, settlement, notifications, security, observability
- document the missing operational plans that matter before launch: monitoring, testing, environments, releases, dockerization, and stress testing
- replace temporary root markdown files with durable category pages under `docs/`