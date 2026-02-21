# Observability Stack — Setup & Scaling Guide

## Quick Start

```bash
# 1. Start the observability stack
cd observability
docker compose up -d

# 2. Open Grafana
#    → http://localhost:3100  (admin / admin)
#    Two dashboards are pre-provisioned:
#      • API Overview — latency, error rate, request volume
#      • Delivery & Orders — order flow, payments, drivers, auth

# 3. Start the API (logs flow automatically)
cd ../api
npm run dev
```

## Architecture

```
┌─────────────┐    JSON logs    ┌───────────┐          ┌──────┐
│  Express API │───────────────→│ api/logs/  │←─ read ──│Promtail│
│  (Pino)      │                └───────────┘          └──┬───┘
│              │─── Sentry SDK ──→ sentry.io               │ push
└─────────────┘                                        ┌──▼───┐
                                                       │ Loki  │
┌──────────────┐─── Sentry SDK ──→ sentry.io           └──┬───┘
│ Mobile Apps  │                                       ┌──▼─────┐
└──────────────┘                                       │ Grafana │
                                                       └────────┘
```

## What's Included

| Component | Purpose | Port |
|-----------|---------|------|
| **Pino** | Structured JSON logging (API) | — |
| **Sentry** | Error tracking + performance (API + mobile) | — |
| **Loki** | Log aggregation & querying | 3200 |
| **Promtail** | Log shipping (file → Loki) | 9080 |
| **Grafana** | Dashboards, alerts, exploration | 3100 |

## Environment Variables

### API (`api/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `SENTRY_DSN` | — | Sentry project DSN (get from sentry.io) |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Pino log level |
| `NODE_ENV` | `development` | Controls pretty-print vs JSON output |

### Mobile Apps (`.env`)
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry project DSN for the mobile app |

## Alert Rules (pre-configured)

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | >5% 5xx responses in 5min | Critical |
| Slow API | p95 latency >2s for 5min | Warning |
| Payment Failures | >3 financial errors in 5min | Critical |
| Mass Driver Disconnect | >5 watchdog force-offlines in 5min | Warning |
| Zero Traffic | No requests for 10min | Critical |
| Fatal Error | Any fatal-level log | Critical |

## Scaling Roadmap

### Phase 2 — Prometheus Metrics
```bash
npm install prom-client
```
Uncomment `api/src/lib/metrics.ts`, add Prometheus to docker-compose, and create a Grafana datasource. This gives you:
- Request rate / error rate / duration histograms
- Node.js heap, event loop, active handles
- Custom business metrics (orders/min, revenue/hour)

### Phase 3 — OpenTelemetry Tracing
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```
- Distributed traces across API ↔ DB ↔ external services
- Correlate traces with logs via `traceId`
- Export to Tempo (add to docker-compose) or Sentry

### Phase 4 — Production Hardening
- Move Loki storage to S3 (replace filesystem in loki-config.yml)
- Add authentication to Grafana (OAuth / LDAP)
- Configure Slack/email alert contact points (edit `contactpoints.yml`)
- Set up log rotation for `api/logs/` (logrotate or pino-roll)
- Add Caddy/nginx reverse proxy with TLS for Grafana

## Log Query Examples (Grafana → Explore → Loki)

```logql
# All errors in the last hour
{job="delivery-api"} | json | level="error"

# Slow requests (>1s)
{job="delivery-api"} | json | msg="request:finish" | durationMs > 1000

# Orders from a specific user
{job="delivery-api"} | json | service="OrderService" | userId="abc-123"

# Payment settlement events
{job="delivery-api"} | json | service="FinancialService"

# Driver watchdog activity
{job="delivery-api"} | json | service="DriverWatchdog"

# Correlate by requestId
{job="delivery-api"} | json | requestId="your-uuid-here"
```
