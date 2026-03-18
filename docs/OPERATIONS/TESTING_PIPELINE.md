# Testing Pipeline

<!-- MDS:O8 | Domain: Operations | Updated: 2026-03-18 -->
<!-- Depends-On: O7, B2, BL1 -->
<!-- Depended-By: O9 -->
<!-- Nav: Preflight changes → update B2 (Order Creation), BL1 (Settlements). CI layers → review O7 (Environments). Load testing → review O9 (Docker). -->

## Current State In This Repo

The repo now has a practical API preflight test gate, but still lacks full CI and broader automated suites.

What exists:

- lint scripts across API, admin, and mobile apps
- typecheck scripts across API, admin, and mobile apps
- GraphQL codegen scripts across packages
- API preflight gate:
	- `npm run test:api:preflight` (required gate before `npm run dev` and `npm run start` in `api`)
	- includes deterministic settlement scenario checks and order-creation checks
- detailed pass/fail console report with scenario/check IDs and debugging pointers

What is still missing:

- no dedicated unit-test framework (vitest/jest) wired for API yet
- no frontend browser E2E suite checked in
- no mobile E2E or device-smoke automation
- no CI workflow in `.github/workflows`
- strict API preflight (`npm run test:api:strict`) currently fails because of existing unrelated type errors

## Recommended Test Strategy

You do not need to automate everything at once. Split the plan into layers.

## Layer 1. Fast CI Checks

These should run on every pull request.

- API: `lint`, `typecheck`, `codegen`, `build`
- admin-panel: `lint`, `typecheck`, `codegen`, `build`
- mobile apps: `lint`, `typecheck`, `codegen`

This gives you cheap confidence that a branch is structurally valid.

## Layer 2. API Integration Tests

This is still the most important expansion layer.

Recommended stack:

- `vitest` or `jest`
- `supertest` for HTTP-level API verification
- dedicated test database or disposable Postgres container

Current preflight already covers:

- settlement scenario determinism (expected vs actual)
- order creation validation checks

What to cover next:

- auth flows: login, refresh, logout
- order creation and order status transitions
- promotion validation logic
- settlement-rule authorization checks
- store-status updates
- driver heartbeat mutation behavior

Tests should validate business behavior, not only resolver signatures.

## Layer 3. Admin Frontend E2E

Your friend helping with frontend testing is a good reason to formalize this early.

Recommended stack:

- Playwright for admin-panel browser flows

Why admin-panel first:

- it runs in a browser, so automation is easier than mobile
- it covers operational flows with high business impact
- it is the cleanest place to create repeatable regression coverage quickly

Good first Playwright scenarios:

- login and session persistence
- orders list loads and filters work
- settlement pages load without GraphQL failures
- store status updates submit successfully
- notification campaign screens render and validate basic flows

## Layer 4. Mobile Smoke Testing

Do this after API integration tests and admin Playwright are stable.

Recommended options:

- Maestro for simple mobile smoke flows
- Detox later if you need deeper React Native automation

Good first mobile smoke cases:

- customer app launch and login
- browse businesses and open cart
- driver app launch and auth
- basic business app order queue load

## Manual Testing Plan With Your Tester

Automated tests should not replace human exploratory testing.

Use your tester for:

- UI regressions and layout issues
- odd navigation states
- notification behavior validation
- real-device testing around mobile flows
- acceptance checks before a production release

The best way to use that help is to maintain a release checklist per app and track pass/fail per build.

## Recommended CI Pipeline Shape

### Pull Request Pipeline

Run on every PR:

- install dependencies
- API lint, typecheck, codegen, build
- admin-panel lint, typecheck, codegen, build
- mobile lint, typecheck, codegen
- run API integration tests once they exist

This pipeline should block merges on failure.

### Main Branch Pipeline

Run on merge to `main`:

- rerun all quality checks
- run API integration tests
- run admin Playwright tests against a preview or staging environment
- optionally publish a staging deployment if all checks pass

### Nightly Pipeline

Run daily or nightly:

- heavier integration suite
- load a seeded staging dataset if available
- mobile smoke tests if you add Maestro later

## Suggested Implementation Order

1. create CI workflow for lint, typecheck, codegen, and build
2. add API integration tests
3. add Playwright for admin-panel
4. add release checklists for your tester
5. add mobile smoke automation later

## My Recommendation

If you only add one serious test layer next, make it API integration tests.

If you add two, make them:

- API integration tests
- admin Playwright regression tests

That combination gives you the most value for the least complexity before launch.