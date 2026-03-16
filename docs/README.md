# Docs Hub

This folder is the curated documentation entrypoint for the monorepo. It sits on top of the older deep-dive markdown files and organizes the important system knowledge by area.

## Start Here

- [ARCHITECTURE.md](ARCHITECTURE.md) for the system map
- [BACKEND/API.md](BACKEND/API.md) for API structure, GraphQL flow, auth, and subscriptions
- [BACKEND/WATCHDOG_HEARTBEAT.md](BACKEND/WATCHDOG_HEARTBEAT.md) for driver realtime behavior
- [BUSINESS_LOGIC/PRICING_PROMOTIONS.md](BUSINESS_LOGIC/PRICING_PROMOTIONS.md) for customer pricing, markups, dynamic pricing, and promotions
- [MOBILE/OVERVIEW.md](MOBILE/OVERVIEW.md) for the app split and shared mobile patterns
- [MOBILE/PUSH_AND_LIVE_ACTIVITY.md](MOBILE/PUSH_AND_LIVE_ACTIVITY.md) for push notification plumbing and the current Live Activity state
- [MOBILE/LIVE_ACTIVITY_BEHAVIOR.md](MOBILE/LIVE_ACTIVITY_BEHAVIOR.md) for Live Activity status/ETA update behavior, compact Dynamic Island UI, and background update guarantees
- [BUSINESS_LOGIC/SETTLEMENT.md](BUSINESS_LOGIC/SETTLEMENT.md) for settlement state and refactor status
- [OPERATIONS/NOTIFICATIONS.md](OPERATIONS/NOTIFICATIONS.md) for notification campaigns, admin send flows, and delivery alerts
- [OPERATIONS/MONITORING.md](OPERATIONS/MONITORING.md) for what is actually monitored today, what is missing, and the recommended production monitoring path
- [OPERATIONS/APP_STORE_RELEASE.md](OPERATIONS/APP_STORE_RELEASE.md) for iOS release and App Store readiness
- [OPERATIONS/ANALYTICS.md](OPERATIONS/ANALYTICS.md) for KPI priorities and implementation direction
- [OPERATIONS/SECURITY.md](OPERATIONS/SECURITY.md) for the security backlog and quick wins
- [OPERATIONS/OBSERVABILITY.md](OPERATIONS/OBSERVABILITY.md) for logs, dashboards, alerts, and scaling phases
- [OPERATIONS/TESTING_PIPELINE.md](OPERATIONS/TESTING_PIPELINE.md) for the recommended automated and manual testing strategy
- [OPERATIONS/ENVIRONMENTS_AND_RELEASES.md](OPERATIONS/ENVIRONMENTS_AND_RELEASES.md) for the go-live environment model, deployment flow, and release pipeline
- [OPERATIONS/DOCKER_AND_STRESS_TESTING.md](OPERATIONS/DOCKER_AND_STRESS_TESTING.md) for future containerization and load-testing planning

## Why This Exists

The repository already had valuable markdown files, but they were spread across the root and mixed together with checklists, rollout notes, and one-off investigations. The goal here is:

- give new contributors a predictable place to start
- keep architecture docs separate from migration plans and temporary analysis notes
- document the systems that are easy to misunderstand: subscriptions, heartbeat, watchdog, pricing, promotions, settlement, notifications, security, observability
- document the missing operational plans that matter before launch: monitoring, testing, environments, releases, dockerization, and stress testing
- replace temporary root markdown files with durable category pages under `docs/`