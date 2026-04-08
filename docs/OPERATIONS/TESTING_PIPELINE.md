# Testing Pipeline

<!-- MDS:O8 | Domain: Operations | Updated: 2026-04-08 -->
<!-- Depends-On: O7, B2, BL1 -->
<!-- Depended-By: O9 -->
<!-- Nav: Preflight changes → update B2 (Order Creation), BL1 (Settlements). CI layers → review O7 (Environments). Load testing → review O9 (Docker). -->

## Current State In This Repo

The repo has a Vitest unit + integration test suite, an API preflight gate, and lint/typecheck scripts.

### Unit Tests (Vitest — no DB)

Run: `cd api && npx vitest run`  
Config: `api/vitest.config.ts` (includes `src/**/*.test.ts`)

Covered modules:
- `generateDisplayId` format/uniqueness
- Delivery pricing tier matching logic
- Order approval flagging (`locationFlagged`, `deriveApprovalReasons`)
- PromotionEngine — all discount types and stacking rules
- PricingService — markup, night price, sale discount
- SettlementCalculationEngine — every scenario
- SettlingService
- S3Service, NotificationService, DriverWatchdogService, orderNotifications
- haversine, isPointInPolygon, pubsub, cache, dateTime, errors, driverEtaCache

### Integration Tests (Vitest + live PostgreSQL)

Run: `cd api && npx vitest run --config vitest.integration.config.ts`  
Config: `api/vitest.integration.config.ts` (includes `src/**/*.integration.test.ts`)  
Requires: `.env` with a valid `DB_URL` pointing at the dev database.

Covered test files:
- `order-pricing.integration.test.ts` — full `createOrder` pricing pipeline: basic, markup, discount, options, priority, platform FREE_DELIVERY, platform FIXED_AMOUNT, business-created order discount, business-created FREE_DELIVERY.
- `order-settlements.integration.test.ts` — FinancialService settlement rows for every scenario.
- `order-creation.integration.test.ts` — validation, approval, zone routing, payment defaults, min order:
  - User rejects: missing user, incomplete signup
  - Product rejects: not found, unavailable, multi-business
  - Business closed check
  - Item price mismatch
  - Delivery fee too high / correct / one-directional lower
  - Total price too high / too low / correct
  - Option validation: missing required group, wrong group, missing paid-option price, option price mismatch, valid free option, valid paid option
  - Invalid promotionId
  - Approval routing: FIRST_ORDER → AWAITING_APPROVAL, HIGH_VALUE >€20 → AWAITING_APPROVAL, locationFlagged (outside service zone) → AWAITING_APPROVAL, repeat low-value → PENDING
  - Delivery zone vs tier: zone polygon matches → zone fee, wrong delivery price for zone
  - Payment collection defaults (CASH_TO_DRIVER) and explicit variants
  - Minimum order amount rejection and acceptance
  - Priority surcharge mismatch and spurious surcharge
  - Happy path: core DB row fields and order item snapshot

### API Preflight Suite

Run: `npm run test:api:preflight` (from repo root or `api/`)  
Script: `api/scripts/run-settlement-harness.ts`  

Covers:
1. Settlement scenario harness checks (deterministic expected vs actual)
2. Order-creation checks:
   - defaults payment collection to `CASH_TO_DRIVER`
   - honors explicit `PREPAID_TO_PLATFORM`
   - rejects mismatched delivery fee
   - rejects mismatched total
   - rejects invalid promo code

Detailed pass/fail console report with `✓`/`✗` lines and "look here" file pointers.

### Other Scripts

- `npm run lint` — ESLint across all packages
- `npm run typecheck` — `tsc --noEmit` across all packages
- `npm run codegen` — GraphQL codegen across all packages (API + mobile apps)

### What Is Still Missing

- No CI workflow in `.github/workflows`
- No frontend browser E2E suite
- No mobile E2E or device-smoke automation
- `npm run test:api:strict` currently fails because of unrelated existing type errors outside order creation/settlements

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
- settlement-rule authorization checks — including the new `settleDriver` / `settleBusiness` flags on `adminCancelOrder`
- `grantFreeDelivery` — promo creation, `user_promotions` row, `maxUsagePerUser: 1` enforcement
- store-status updates
- driver heartbeat mutation behavior
- cancellation flow with and without settlement opt-in

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

## Where To Start Right Now

The repo has no vitest/jest setup yet and no `.github/workflows`. The fastest useful path is:

### Step 1 — Wire vitest into the API

```bash
cd api
npm install -D vitest @vitest/coverage-v8
```

Add to `api/package.json` scripts:
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:unit:coverage": "vitest run --coverage"
```

Create `api/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
```

### Step 2 — Start with pure-logic unit tests (no DB required)

Good first targets inside the existing service layer:

- `FinancialService` settlement math — input/output assertions on amount calculations
- `PromotionEngine` discount logic — codeless FREE_DELIVERY, maxUsagePerUser
- `PricingService` zone/tier/haversine math
- `OrderService` price validation (`epsilon` checks)

These have zero external dependencies and can be tested by directly importing the service.

### Step 3 — Add integration tests with supertest

```bash
npm install -D supertest @types/supertest
```

Target the HTTP layer for:
- `POST /auth/login` happy and unhappy paths
- `POST /auth/refresh` - expired/missing token
- `GET /health` and `GET /ready` static assertions
- GraphQL mutation smoke tests via `POST /graphql`

Step 3 can come after unit tests are green and committed.

## My Recommendation

If you only add one serious test layer next, make it API integration tests.

If you add two, make them:

- API integration tests
- admin Playwright regression tests

That combination gives you the most value for the least complexity before launch.