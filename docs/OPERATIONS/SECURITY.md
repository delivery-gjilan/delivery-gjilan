# Security

<!-- MDS:O5 | Domain: Operations | Updated: 2026-03-18 -->
<!-- Depends-On: B1 -->
<!-- Depended-By: O6, B5 -->
<!-- Nav: Posture changes → update O6 (Audit). Auth changes → review B1 (API). -->

## Current Security Posture

The repo already has a reasonable baseline for an actively developed delivery product.

- helmet and CORS controls
- GraphQL Armor
- auth-related rate limiting
- shorter access token lifetimes with refresh separation
- stronger password and OTP handling
- secure mobile token storage
- **Mapbox token server-side only** — all client apps (mobile-customer, mobile-driver, admin-panel) route directions calls through backend/Next.js proxies; `NEXT_PUBLIC_MAPBOX_TOKEN` is no longer needed in browser or native bundles; coordinate inputs are sanitised (re-serialised from parsed floats, earth-range validated) before being forwarded to Mapbox

That is a decent baseline, but it is not the same thing as a hardened production posture.

## Highest-Value Next Steps

The strongest next improvements are the ones that reduce real operational risk quickly.

- edge DDoS protection through Cloudflare or similar
- Redis-backed distributed rate limiting
- account lockout and OTP attempt limits
- production introspection restrictions and persisted query strategy
- incident runbook for abuse and credential attacks

## Why These Matter First

- this product is geographically narrow, so basic abuse controls have outsized value
- auth endpoints are predictable attack surfaces
- GraphQL introspection and ad hoc query abuse matter more once the schema grows
- operational response speed matters as much as static controls

## Mobile-Specific Security Work

Mobile hardening is still a later-stage area.

- attestation and integrity checks
- certificate pinning
- jailbreak or root detection

These are worth doing, but they should not distract from fixing account-abuse and availability gaps first.

## Practical Recommendation

Treat security as an operations backlog with explicit owners and sequencing. Quick wins should stay in the docs hub until they are converted into implementation tickets.