# Analytics

<!-- MDS:O11 | Domain: Operations | Updated: 2026-03-18 -->
<!-- Depends-On: BL1, B2 -->
<!-- Depended-By: (none) -->
<!-- Nav: KPI definition changes → review BL1 (Settlements financials), B2 (Order data model). Dashboard phases → review O1 (Monitoring). -->

## Current State

Most of the KPI backlog is not blocked by missing product ideas. It is blocked by prioritization and packaging.

The repo already appears to have enough data for a useful first analytics layer around orders, delivery performance, and customer behavior.

## Lowest-Effort Metrics

These are the best starting points because the underlying timestamps and order records already exist.

- average delivery time
- prep time by business
- driver transit time
- pickup delay
- daily order volume
- gross merchandise value
- average order value
- cancellation rate
- peak-hour analysis

## Customer And Retention Signals

The existing user-behavior model supports a practical first pass at:

- total orders per customer
- delivered versus cancelled ratio
- lifetime spend
- first and last order recency

That is enough for segmentation and basic retention work without inventing a full analytics warehouse first.

## What Should Happen Next

- build a small number of trustworthy KPIs instead of a broad dashboard with weak definitions
- keep calculations close to existing data semantics so product and finance do not read different truths
- document the canonical definitions for GMV, AOV, cancellation rate, and delivery time before surfacing them broadly

## Recommended First Deliverables

- one daily operational dashboard
- one business-performance view
- one customer-behavior summary for segmentation and promotions