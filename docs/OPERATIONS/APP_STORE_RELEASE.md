# App Store Release

<!-- MDS:O10 | Domain: Operations | Updated: 2026-03-18 -->
<!-- Depends-On: O7 -->
<!-- Depended-By: (none) -->
<!-- Nav: Compliance changes → review O5 (Security). Production validation → review O7 (Environments). -->

## Current Readiness Theme

The biggest iOS release risks are not deep technical blockers. They are compliance, completeness, and production-readiness details.

## Hard Requirements

Before shipping the customer app to the App Store, the team should treat these as mandatory:

- privacy policy URL and in-app access
- account deletion flow that actually removes or anonymizes data on the backend
- no dead-end settings or placeholder actions in the UI
- real bundle identifiers and production branding
- production API endpoints over HTTPS

## Product Hygiene Checks

- every tappable control should either work or be hidden
- payment and delivery expectations should be explicit in checkout
- if social login is added later, Sign in with Apple becomes part of the compliance surface
- if any alcohol-related commerce exists, age-gating and rating need to be reviewed early

## Release Assets

- final app name
- final icon and screenshots
- support and privacy URLs
- App Store privacy answers
- reviewer credentials if login is required

## Technical Validation

Before submission, validate against production infrastructure rather than development tunnels.

- login and session lifecycle
- browse, cart, checkout, and order tracking
- push notification behavior
- store closed and banner behavior
- account deletion and support/contact pathways

## Recommendation

Keep App Store submission as an operations checklist under `docs/`, not as a root scratch file. The release gate should be explicit and boring.