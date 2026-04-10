# Push And Live Activity

<!-- MDS:M2 | Domain: Mobile | Updated: 2026-04-11 -->
<!-- Depends-On: M1, O3, O4 -->
<!-- Depended-By: M3 -->
<!-- Nav: Push infra changes → update O3 (Notifications), O4 (Push Audit). Live Activity changes → update M3 (Live Activity Behavior). -->

## What Exists Today

The repo has production-shaped push implementations across customer, driver, and business.

- `mobile-customer` has the most complete runtime flow (token registration, refresh handling, foreground/background listeners, interactive categories)
- `mobile-driver` uses Firebase Messaging token registration with iOS APNs-to-FCM handshake hardening (`registerDeviceForRemoteMessages` before `getToken`)
- `mobile-business` registers BUSINESS app tokens at runtime and tracks telemetry; on iOS it follows the same APNs-to-FCM handshake guardrails as customer/driver
- `mobile-admin` has runtime token registration and telemetry wiring but a lighter notification UX surface than customer

APNs environment variables on the API side are tied to the Live Activity APNs provider-token path, not standard driver/customer FCM push delivery.

## Customer Push Flow

The customer app currently does the important parts correctly.

- requests permission
- gets an FCM token
- registers that token with the API
- handles token refresh
- listens for foreground notifications
- routes notification taps into the app

That means standard push is not aspirational in `mobile-customer`. It is an active part of the product architecture.

## Admin And Backend Notification Surface

The notification surface now supports more than a plain text alert.

- image URL support for richer notifications
- time-sensitive behavior for urgent delivery states
- notification category values for actions and grouping
- relevance scoring for iOS ordering behavior
- campaign-style sends from the admin side

The backend and admin panel both expose these capabilities, so documentation should treat notifications as an operational system, not just a mobile detail.

## Live Activity State

Live Activity behavior is now implemented as a server-updated single-activity flow for customer delivery tracking.

- one active activity per order is reused (no status-based duplication)
- status transitions update the active activity
- out-for-delivery ETA is refreshed from driver heartbeat updates
- compact Dynamic Island UI is optimized for default island presentation
- progress is phase-based and updates as ETA reduces
- widget tap deep link targets `zipp://orders/{orderId}` (direct order-details route)
- end event (`event: end`) sent on `DELIVERED` / `CANCELLED` via `updateOrderStatus`; `cancelOrder` mutation currently lacks this (see M3 Known Gap)

Detailed behavior and payload contract are documented in:

- `docs/MOBILE/LIVE_ACTIVITY_BEHAVIOR.md`

## Operational Guidance

- treat FCM token registration as required infrastructure, not optional glue code
- on iOS, call `messaging().registerDeviceForRemoteMessages()` before requesting `messaging().getToken()`
- reject APNs-like 64-hex token values in Firebase token flows and retry before backend registration
- keep notification categories aligned between client behavior and backend payloads
- validate Live Activity changes on a real iOS build, not only by reading config files
- treat Live Activity widget URL changes as native extension changes that require a new iOS binary build
- when changing order-notification behavior, verify customer delivery alerts and admin send flows together

## Recommended Next Cleanup

- document which apps officially support which notification features
- keep APNs topic and extension bundle ID aligned across envs
- keep the Live Activity behavior runbook (`MOBILE/LIVE_ACTIVITY_BEHAVIOR.md`) updated when payload fields or widget layout change