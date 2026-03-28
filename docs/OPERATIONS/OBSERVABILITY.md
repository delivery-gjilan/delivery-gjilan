# Observability

<!-- MDS:O2 | Domain: Operations | Updated: 2026-03-18 -->
<!-- Depends-On: O1 -->
<!-- Depended-By: PKG6 -->
<!-- Nav: Stack changes → update PKG6 (observability/README). Signal selection → review O1 (Monitoring). -->

## Current Stack

The repo already has a practical local observability setup centered on logs and dashboards.

- Pino-style structured API logs
- Loki for log aggregation
- Promtail for shipping local log files
- Grafana for dashboards and alerts

The detailed setup remains in [../../observability/README.md](../../observability/README.md).

## What Is Operational Today

Phase 1 is the real working baseline:

- API logs are written locally and can be scraped into Loki
- Grafana dashboards can be used for request/error inspection

## Scaling Phases

The repo already sketches later phases:

- Phase 2: Prometheus metrics
- Phase 3: OpenTelemetry tracing
- Phase 4: production hardening

Those phases are directionally useful, but they are not the same thing as production-ready implementation.

## Operationally Important Signals

The most useful areas to watch in this product are:

- request failures and elevated latency in the API
- driver watchdog transitions and mass disconnect patterns
- payment or settlement-related failures
- push notification delivery issues
- mobile runtime crashes or auth/session churn

## Documentation Gap

What is still missing is not another tooling README. The missing part is the runbook layer:

- what logs to query when drivers disappear from the map
- what to inspect when subscriptions look dead
- what dashboard or log fields matter for settlement problems
- how to validate alerts instead of only defining them

## Recommendation

Treat `observability/README.md` as the setup guide and this file as the short architecture summary. If the team adds Prometheus or tracing for real, update both docs together so the roadmap and implementation do not drift.