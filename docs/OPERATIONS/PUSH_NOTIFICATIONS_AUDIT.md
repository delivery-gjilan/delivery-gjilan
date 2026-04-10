# Push Notifications Audit

<!-- MDS:O4 | Domain: Operations | Updated: 2026-04-11 -->
<!-- Depends-On: O3, M2, M3 -->
<!-- Depended-By: (none) -->
<!-- Nav: Token lifecycle changes → update M2 (Push), M3 (Live Activity). App type coverage → review O3 (Notifications). -->

Date: 2026-03-13

## Scope

This document audits push notification functionality across:

- api
- admin-panel
- mobile-customer
- mobile-driver
- mobile-business
- mobile-admin

It covers what works today, how messages flow end-to-end, current gaps, and recommendations for an optimized experience.

## Executive Summary

The project has a working push pipeline for customer, driver, business, and admin app types, plus admin-initiated sends and campaigns.

Strong points:

- API sends via Firebase Admin to device tokens stored in Postgres.
- Admin panel supports direct sends, campaigns, audience preview, and promotion-triggered optional push.
- mobile-customer has mature token and runtime handling (including FCM token refresh and interactive categories).
- Order status notifications are rich (time-sensitive, category, relevance score).

Main gaps:

- Background handling and UX depth still differ by app (customer remains the most feature-complete runtime consumer).
- Delivery observability is improving via telemetry, but operational dashboards still need stricter alert thresholds and runbook automation.

## How It Works Today

## 1. Token Registration and Storage

API mutation:

- registerDeviceToken(input)
- unregisterDeviceToken(token)

Storage model:

- Table: device_tokens
- Fields: user_id, token, platform, device_id, app_type
- app_type enum: CUSTOMER | DRIVER | BUSINESS | ADMIN

Important behavior:

- Token persistence supports multi-device operation while preserving one active token per user+device+appType.

## 2. Sending Pipeline

Entry points:

- sendPushNotification (admin direct send)
- sendCampaign (admin campaign send)
- orderNotifications service (order lifecycle pushes)
- promotion assignment flow in admin UI (optional follow-up push)

Core sender:

- NotificationService.sendToUser / sendToUsers
- Uses Firebase Admin Messaging sendEachForMulticast in batches of 500
- Removes stale tokens on known FCM invalid token errors

Payload capabilities:

- title, body, data
- imageUrl
- timeSensitive (iOS interruption level)
- category (interactive actions)
- relevanceScore (iOS notification ordering)

Persistence:

- notifications table logs attempted notification records by user
- campaigns stored in notification_campaigns with status and counts

## 3. Admin Workflows

From admin-panel:

- Direct send to selected users (supports image, category, time-sensitive)
- Campaign create/preview/send/delete
- Promotion assignment to selected users, with optional follow-up push

Audience targeting:

- JSON rule groups with AND/OR nesting
- Query preview returns count and sample users
- Query engine supports fields from users and user_behaviors

## 4. Mobile Runtime Status by App

mobile-customer:

- Uses useNotifications hook in app layout
- Requests permissions, gets FCM token via @react-native-firebase/messaging
- Registers token with appType CUSTOMER
- Handles token refresh and re-registers automatically
- Handles foreground notifications and response taps
- Configures interactive categories (order-on-the-way, order-delivered, order-cancelled)
- Also has Live Activity hook and token registration flow

mobile-driver:

- Uses useNotifications hook in app layout
- Requests permissions and registers token with appType DRIVER via Firebase Messaging
- Uses iOS APNs-to-FCM handshake hardening (`registerDeviceForRemoteMessages` before `getToken`)
- Handles foreground/tap flows and token refresh re-registration

mobile-business:

- Uses useNotifications hook in app runtime
- Registers/unregisters BUSINESS app tokens via GraphQL mutations
- Tracks received/opened/action/token telemetry events
- Uses Firebase foreground listener and background message handler wiring

mobile-admin:

- Includes runtime token registration/unregistration and telemetry wiring with appType ADMIN
- Supports admin send/campaign workflows in parallel with device token lifecycle

## 5. Live Activity

API supports:

- registerLiveActivityToken mutation
- sendLiveActivityUpdate and endLiveActivities in NotificationService

mobile-customer supports:

- useLiveActivity hook with native module bridge
- Registers live activity push token to backend

Operational note:

- Treat Live Activity as partially complete until native iOS extension artifacts and release behavior are validated continuously in CI/release process.

## Current Risks and Limitations

1. App parity differences

- Customer runtime handling remains deeper than business/admin/driver for some UX behaviors (categories/actions, deep-link patterns).

2. iOS token lifecycle fragility if handshake rules regress

- Push reliability depends on keeping APNs-to-FCM handshake hardening in place in all apps.

3. Insufficient delivery analytics

- Campaign counters reflect send attempts/results, not open rate, tap-through, or per-platform delivery quality.

4. Security hardening opportunity

- unregisterDeviceToken currently accepts raw token and removes it without explicit ownership check in resolver path.

5. UX consistency gap

- customer app has richer category/action UX than driver.
- business/admin have no runtime push UX.

## Recommendations for an Optimized Experience

## Priority 1: Reliability and Correctness

1. Support true multi-device tokens per user

- Remove delete-all-on-upsert behavior.
- Keep one row per token and update metadata by conflict target token.
- Optionally enforce unique (user_id, device_id) and keep latest token per device.

2. Unify token acquisition strategy

- mobile-driver should use Firebase messaging token retrieval like mobile-customer.
- Add token refresh listener and backend re-registration.

3. Add ownership check on unregister

- Only allow deleting tokens belonging to authenticated user, unless admin endpoint explicitly intended.

## Priority 2: Product and App Coverage

4. Decide official push support matrix

- If business/admin should receive device pushes, extend DeviceAppType enum and wire runtime hooks.
- If not, document that clearly in operations docs.

5. Standardize notification UX

- Align category/action support across customer and driver where relevant.
- Add explicit deep-link routing contracts for each notification type.

## Priority 3: Observability and Optimization

6. Add push observability dashboard

Track at least:

- campaign target count
- send success/failure by platform and app type
- stale token cleanup counts
- tap/open events (if client events are instrumented)

7. Add event instrumentation

- Log client-side notification received/open/action events back to API analytics endpoint.
- Correlate with campaign id or notification id when available.

8. Add operational runbook checks

- Verify Firebase credentials loaded
- Verify user token exists for expected app type
- Send synthetic push and record latency
- Validate category/action behavior on real devices

## Priority 4: Performance and User Experience

9. Improve personalization and timing

- Use per-user quiet hours and locale in payload composition.
- Segment by behavioral recency/frequency/value for campaigns.

10. Reduce noisy pushes

- Add dedup/throttle policy per user + notification type (for repeated status updates).
- Keep time-sensitive only for truly urgent events.

## Suggested Implementation Plan

Phase 1 (quick wins):

- Fix token storage model for multi-device.
- Migrate mobile-driver to FCM token retrieval and token refresh listener.
- Add unregister ownership guard.

Phase 2:

- Add delivery observability metrics and admin diagnostics panel.
- Align category/action routing and payload contracts across apps.

Phase 3:

- Decide and implement business/admin app push support (or document explicit exclusion).
- Add engagement analytics and campaign optimization loops.

## Verification Checklist

- Customer receives status notifications in foreground/background and tap routes correctly.
- Driver receives assignment notifications on iOS and Android.
- Campaign preview count approximately matches send target count.
- Stale token cleanup occurs on invalid token responses.
- Users with two active devices can receive notifications on both devices (after multi-device fix).
- Time-sensitive and category actions behave correctly on iOS and Android.
