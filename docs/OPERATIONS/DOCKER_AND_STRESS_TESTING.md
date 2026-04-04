# Docker And Stress Testing

<!-- MDS:O9 | Domain: Operations | Updated: 2026-04-04 -->
<!-- Depends-On: O8 -->
<!-- Depended-By: (none) -->
<!-- Nav: Container changes → review O7 (Environments). Scenario design → review B4 (Watchdog heartbeat). -->

## Current State In This Repo

You now have partial application containerization for the API and a working local stress-test harness.

What exists today:

- local Postgres and Redis docker-compose under `api/database/docker-compose.yml`
- local observability docker-compose under `observability/docker-compose.yml`
- API `Dockerfile` for local resource-constrained simulation
- API compose stack for a single-node constrained runtime via `api/docker-compose.simulate.yml`
- `k6` stress suite covering browse, order-flow, and websocket traffic

What does not exist yet:

- no full compose stack for API + DB + Redis + observability together
- no Docker setup for admin-panel
- no production-grade multi-stage API image build targeting compiled output

Current local simulation findings:

- a single constrained node around 1 vCPU and 2 GB RAM handles isolated browse and order-flow load, but degrades badly under combined browse + order + websocket pressure
- a simulated 2 vCPU and 4 GB node materially improves combined-load behavior for browse and websocket traffic, but order creation latency still crosses thresholds under the current combined profile
- the order creation path remains the first bottleneck to investigate when mixed traffic is applied
- local order smoke verification is environment-sensitive because create-order inputs are strictly validated against server-calculated delivery pricing; the stress fixture generator must write the current expected delivery fee into `tests/k6/fixtures.json` or the run fails before it measures the hot path

Current standalone order benchmark state:

- regenerated stress fixtures now send the current expected delivery fee instead of a hard-coded zero value
- the latest standalone `order-flow.js` run against `localhost:4000` completed with `1764` successful orders, `0%` request failures, `create_order_duration p95 = 76.02 ms`, and `http_req_duration p99 = 265.21 ms`
- this is the first clean standalone order benchmark after the fixture mismatch was removed, so it is the reliable local reference point for future before/after comparisons

## Should You Dockerize Now?

Not fully.

Right now the application is still actively changing, so the best move is to plan containerization and implement it once the main flows settle down.

What you should do now:

- document the target architecture
- keep DB and Redis dockerized locally
- avoid spending time containerizing every app before the release model is stable

## Recommended Dockerization Order

### Phase 1. API Container

Start with the API only.

Why:

- it is the core deployable backend service
- it has the clearest runtime contract
- it benefits most from predictable deployment packaging

Target deliverables:

- multi-stage `Dockerfile` for the API
- production image running compiled `dist/index.js`
- environment variables injected at runtime
- health endpoint for container orchestration checks

### Phase 2. Full Local Compose Stack

Create one compose file that can run:

- API
- Postgres
- Redis
- Loki
- Promtail
- Grafana

This becomes the best reproducible local integration environment.

### Phase 3. Admin Panel Container

Containerize `admin-panel` after the API is stable.

This is useful for:

- preview deployments
- consistent staging environments
- simpler VPS or container-host setups

### Phase 4. Mobile Build Strategy

Do not think of the mobile apps as normal long-running containers.

For mobile, the right model is:

- EAS for builds and updates
- containerized supporting services only if needed for CI or test harnesses

## Stress Testing Plan

Do this after you have:

- a stable staging API
- metrics and monitoring enabled
- seeded non-production data
- health checks in place

Without those, load testing produces noise instead of useful decisions.

## Recommended Load-Test Tooling

Best practical options:

- `k6` for HTTP and scenario-based API load tests
- Artillery if you want simpler JavaScript-based scenarios and websocket coverage quickly

For this repo, `k6` is the better default if you want disciplined API testing.

## What To Stress Test First

### 1. GraphQL HTTP Requests

Test:

- login and refresh flow
- orders query load
- create order mutation throughput
- promotion validation load

Measure:

- p50, p95, p99 latency
- error rate
- DB saturation behavior

### 2. Driver Heartbeat Traffic

This is one of the most important system-specific load cases.

Simulate:

- many drivers sending heartbeat mutations continuously
- spikes in active delivery ETA updates
- watchdog behavior when heartbeats stop

Measure:

- API latency under heartbeat load
- Redis usage if live ETA/pubsub is enabled
- driver state correctness under sustained traffic

### 3. Subscription Pressure

Stress test websocket behavior later, not first.

Focus on:

- concurrent subscription counts
- subscribe/unsubscribe churn
- admin refresh-signal subscriptions
- customer live tracking subscriptions

This matters because the repo now has socket subscription caps and rate protection.

## Recommended Stress-Test Phases

### Phase 1. Baseline

- low concurrency
- validate no major regressions
- establish normal latency

### Phase 2. Target Load

- approximate expected real usage
- include driver heartbeat plus normal customer/admin traffic

### Phase 3. Spike And Failure Tests

- sudden traffic bursts
- Redis unavailable
- DB slowdowns
- reconnect storms on websocket clients

The value here is not only speed. It is learning failure behavior.

## My Recommendation

When you are done with most of the application, do this in order:

1. add health endpoints and Prometheus metrics
2. containerize the API
3. create a full local compose integration stack
4. build a staging environment that resembles production
5. add `k6` load tests for GraphQL and heartbeat traffic
6. only then spend time on deeper websocket and chaos-style testing

That sequence will save you from optimizing a moving target.