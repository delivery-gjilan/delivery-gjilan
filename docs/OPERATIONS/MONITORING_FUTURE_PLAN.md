# Monitoring Future Plan

<!-- MDS:O14 | Domain: Operations | Updated: 2026-03-27 -->
<!-- Depends-On: O1, O2, O11, B4 -->
<!-- Depended-By: (none) -->
<!-- Nav: Baseline endpoint/dashboard state lives in O1. Logging and stack ops in O2. KPI framing in O11. Driver heartbeat semantics in B4. -->

## Goal

Prioritize monitoring that catches operational pain early, links technical signals to business outcomes, and stays actionable for on-call operators.

## Prioritized Roadmap

### Phase 1: Launch-Critical Signals

1. Order flow latency by stage
- Measure transition durations: PENDING -> PREPARING, PREPARING -> READY, READY -> OUT_FOR_DELIVERY, OUT_FOR_DELIVERY -> DELIVERED.
- Track p50/p90/p95 per stage and alert on sustained p95 regressions.

2. Dispatch health
- Track assignment lag, reassign count, and count of unassigned orders.
- Alert when unassigned age crosses threshold per zone/time window.

3. Realtime data freshness
- Track event freshness age for critical subscriptions, reconnect storms, and dropped-event indicators.
- Alert on stale-data windows, not just disconnected sockets.

4. Push delivery effectiveness
- Track sent, accepted, failed, opened, and actioned outcomes by app type and event type.
- Alert on provider failure spikes and delivery-rate drops.

### Phase 2: Device and Driver Reliability

5. Business device reliability depth
- Extend ONLINE/STALE/OFFLINE with heartbeat jitter, low-battery cohorts (<20%, <10%), and stale subscription rates.
- Track app-version adoption and old-version concentration.

6. Driver signal quality
- Track GPS staleness distribution, impossible-speed jumps, and poor-accuracy cohorts.
- Track foreground/background behavior while on active delivery.

### Phase 3: Service Objectives and Integrity

7. SLO + error-budget monitoring
- Define SLOs for API availability/error rate, realtime delivery success, and order completion success.
- Use burn-rate alerts (fast + slow) instead of only static thresholds.

8. Data integrity guards
- Track invariant violations: impossible status transitions, missing required timestamps, negative settlement anomalies.
- Surface these as high-severity correctness alerts.

9. Dependency pressure and saturation
- Track Redis latency and saturation, Postgres slow-query rates, connection pool pressure, and resolver hotspots.
- Alert on leading indicators before user-visible degradation.

10. Revenue and trust outcomes
- Track cancellation rate by stage/reason, refund rate, failed payment captures, and delayed-delivery cohorts.
- Use these as business-impact overlays on ops dashboards.

## Admin Map Business Upgrade Pack

These upgrades focus on making the admin map useful not only for dispatch actions, but also for business outcomes (margin, SLA, and escalation quality).

1. Margin-on-map cards
- Add per-order gross margin estimate, promo cost split (platform vs business), and delivery cost estimate directly in order cards and bottom detail panel.
- Show a simple severity color: healthy margin / thin margin / negative margin.

2. SLA heat and risk overlays
- Add map overlays for overdue clusters (pending too long, ready too long, out-for-delivery too long) grouped by zone and business.
- Include p95 stage delay chips for each zone to expose recurring bottlenecks.

3. Exception workflow actions
- Add one-click escalation actions on late/problem orders: reassign, notify business, notify driver, add incident tag, add root-cause note.
- Persist incident tags so operations can review repeated causes by business and time window.

4. Realtime quality guardrails in UI
- Surface data freshness directly in map UI: last event age, stale subscription warning, and fallback mode indicator.
- Keep auto-fallback to polling, but show when the page is no longer receiving fresh stream events.

5. Order economics and reliability summaries per business
- Add compact business chips/cards with: active orders, cancellation rate, average prep overrun, fake-ready rate, and open incident count.
- Prioritize businesses needing intervention without leaving the map screen.

## Suggested Initial Implementation Package

1. Add six first-wave metrics:
- Assignment lag p95
- Unassigned order age
- Stage transition durations
- Push failure rate
- Realtime freshness age
- Cancellation rate

2. Add one Grafana row for launch operations:
- Dispatch lag panel
- Unassigned age panel
- Stage-latency percentile panel
- Push success/failure panel
- Realtime freshness panel
- Cancellation trend panel

3. Add three launch alert rules:
- Assignment lag sustained breach
- Realtime freshness breach
- Push failure spike

## Notes

- Prefer percentile-based and rate-based alerts over averages.
- Keep alert ownership explicit (who responds, during what hours, via which channel).
- Keep metric labels bounded; avoid high-cardinality dimensions in alerting series.
