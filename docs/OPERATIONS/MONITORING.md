# Monitoring

## Current State In This Repo

The repository already has the start of a real monitoring story, but it is still mostly local-development grade.

What exists today:

- API structured logging through Pino and the request logger middleware
- local Grafana, Loki, and Promtail under `observability/`
- local Prometheus under `observability/`
- pre-provisioned Grafana dashboards and alert rules in the local observability stack
- API `/health`, `/ready`, and `/metrics` endpoints with Prometheus-compatible metrics via `prom-client`
- API `/health/realtime` endpoint with a human-readable websocket and pubsub summary
- websocket lifecycle instrumentation for connect, subscribe, reject, complete, error, and disconnect events
- realtime Prometheus metrics for websocket connections, subscription activity, and pubsub publishes/failures
- periodic `realtime:summary` structured logs for fast operator-friendly status checks
- Redis and Postgres local containers for development support
- websocket subscription safeguards and HTTP rate limiting inside the API

What does not exist yet as a production monitoring baseline:

- no uptime checks from an external service
- no production alert routing configured to Slack, email, PagerDuty, or similar
- no deployment-linked dashboards for staging versus production
- no explicit SLOs for API latency, error rate, or delivery-critical flows

## What The Current Stack Is Good For

The existing stack is already useful for:

- debugging API request failures
- investigating driver watchdog and heartbeat incidents
- tracking fatal errors and runtime crashes through structured logs and app-level error boundaries
- local dashboard exploration while developing and stabilizing features

It is not yet enough for confident go-live operations.

## Immediate Gaps To Close Before Launch

### 1. Add Health Endpoints

The API now exposes:

- `/health` for a simple process-alive check
- `/ready` for dependency-aware readiness checks against Postgres and Redis

`/ready` currently treats Redis as optional unless `REDIS_REQUIRED=true`, which is the right behavior for the current repo because Redis can be disabled in some environments.

That gives your deploy platform a clean signal for restart and rollout decisions.

### 2. Realtime Metrics And Subscription Visibility

The repo now has a working metrics module at `api/src/lib/metrics.ts`.

The current baseline includes:

- request duration histogram
- request count by route and status
- default Node.js runtime metrics
- active websocket connections
- total websocket connects and disconnects
- subscription attempts, rejects, completions, and runtime errors
- active subscriptions by operation name
- pubsub publish totals and pubsub publish failures by topic family

The API also now exposes `/health/realtime`, which is designed for human monitoring rather than scraping. It gives you:

- a plain-language overview of connection count and subscription load
- the busiest subscription operations right now
- pubsub topic activity and failure counts
- recent realtime events so you can see whether sockets are being rejected, failing, or disconnecting

The next step is to add more delivery-specific counters for:

- heartbeat freshness and reconnect churn
- push send failures
- settlement failures
- auth lockouts

### 3. Configure Real Alert Destinations

The alert rules in `observability/` are useful, but until contact points are real they are only documentation.

At minimum, set up:

- Slack channel for warnings and critical alerts
- email fallback for critical alerts
- clear ownership for who responds

### 4. Separate Staging And Production Monitoring

When you go live, do not point staging and production into the same undifferentiated dashboards.

Use labels or separate datasources so you can answer:

- is the issue only in staging
- did the new deployment cause the spike
- are production drivers/customers impacted right now

## Recommended Monitoring Plan

### Phase 1. Launch-Minimum Monitoring

Do this before public launch:

- enable `/health` and `/ready`
- enable Prometheus metrics from the existing stub
- run Grafana and Loki in a durable environment, not only locally
- configure alert delivery to Slack or email
- add external uptime checks for API GraphQL and a simple health route

### Phase 2. Delivery-Critical Monitoring

Once the product is stable enough for live operations, add dashboards for:

- request latency and error rate
- websocket connection count and disconnect spikes
- subscription reject and error spikes by operation
- pubsub failure spikes by topic family
- auth failures and rate-limit spikes
- driver heartbeat freshness
- watchdog transitions to `STALE` and `LOST`
- push notification success and failure rate
- settlement mutation errors

This matters more than building many generic dashboards.

### Phase 3. Product And Business Monitoring

After runtime stability is covered, add:

- order creation success rate
- checkout failure rate
- order status progression timings
- driver assignment lag
- business prep delay trends

That is the bridge between infrastructure monitoring and operations monitoring.

## Recommended Tooling Direction

If you want the smallest pragmatic setup:

- keep Grafana + Loki + Promtail
- keep Prometheus
- optionally add Uptime Kuma or a hosted uptime service for external checks

If you later want deeper traces:

- add OpenTelemetry and Tempo after the API surface is more stable

## My Recommendation

Do not try to build a full enterprise monitoring stack now.

The correct order is:

1. dashboards and alerts on top of the new health/readiness/metrics/realtime baseline
2. production log aggregation and alert routing
3. delivery-specific dashboards
4. tracing later if needed

That gets you from "we have local observability" to "we can safely operate production."