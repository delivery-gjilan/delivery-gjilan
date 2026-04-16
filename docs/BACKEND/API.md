# Backend API

<!-- MDS:B1 | Domain: Backend | Updated: 2026-03-22 -->
<!-- Depends-On: A1 -->
<!-- Depended-By: B2, B4, B5, B6, B7, B8, B9, B10, O5 -->
<!-- Nav: Schema/resolver changes → update B2 (Order Creation), B4 (Watchdog). Auth changes → update O5 (Security), O6 (Audit). -->

## Stack

The API is a Node.js service built with:

- Express for HTTP bootstrapping and middleware
- GraphQL Yoga for GraphQL execution
- `graphql-ws` for websocket subscriptions
- Drizzle for database access
- optional Redis-backed pubsub for multi-instance fan-out
- structured logging and monitoring instrumentation

The entrypoint is `api/src/index.ts`.

## Code Organization

The backend follows a practical layered layout rather than strict clean architecture.

- `api/src/models` contains GraphQL schema modules and resolver entrypoints
- `api/src/services` contains orchestration and domain logic
- `api/src/repositories` contains database-facing logic. **Repository-first rule:** all tables with `isDeleted` columns must be queried through their repository to ensure soft-delete filtering. See `api/SOFT_DELETE_CONVENTION.md`.
- `api/src/graphql` contains schema assembly and context wiring
- `api/src/generated` contains codegen output derived from schema and resolver definitions

## Request Model

For normal GraphQL operations:

1. Express boots the HTTP server and middleware.
2. Yoga builds the GraphQL execution layer.
3. The request context is created in `api/src/graphql/createContext`.
4. Resolvers delegate into services and repositories.

For subscriptions:

1. The client connects through `graphql-ws`.
2. Authentication is established at websocket connection time.
3. Individual subscriptions now rely on connection context, not token arguments passed in each subscription.
4. Pubsub topics fan events to matching subscribers.

This matters because it removes duplicate auth parsing from subscription resolvers and keeps auth policy aligned with the websocket session.

## GraphQL Module Pattern

A domain module usually has:

- a `.graphql` schema file under `api/src/models/<Domain>`
- resolver files under `api/src/models/<Domain>/resolvers`
- service and repository dependencies under `api/src/services` and `api/src/repositories`

When adding a new field or operation:

1. update the relevant `.graphql` file
2. implement the resolver entrypoint
3. delegate business logic into a service when the behavior is non-trivial
4. run codegen so generated types and schema stay aligned

## Auth Model

The repo currently uses a mix of HTTP bearer auth and websocket connection auth.

- queries and mutations use request context auth
- subscriptions authenticate once on connection and then reuse that identity
- role checks still happen inside resolvers or services where domain access matters

This is especially important for order-tracking subscriptions where access depends on whether the user is the customer, the assigned driver, the admin, or a business participant on that order.

## Subscriptions

Important subscription families:

- order-level updates
- user-specific order list updates
- drivers list updates
- per-order live driver tracking
- store status updates
- **admin message broadcasts** — `adminAnyMessageReceived` (all driver messages) and `adminAnyBusinessMessageReceived` (all business messages) provide global notification feeds to admins without polling or per-driver/per-business filtering. Published alongside targeted subscriptions when messages are created.
- per-user message subscriptions (driver, business, admin)

The current design is mostly invalidation plus refetch, not full event-sourced client state.

That means:

- admin and business clients often refetch on subscription signals
- customer tracking uses a more targeted live payload for per-order movement/ETA data
- backend topic naming is centralized in `api/src/lib/pubsub.ts`

## Operational Notes

- websocket subscriptions now include rate-limiting controls in `api/src/index.ts` to reduce per-socket abuse
- HTTP/upload/auth rate limiting in `api/src/index.ts` uses `express-rate-limit` v8-compatible keys and `ipKeyGenerator` fallback for IPv6-safe client keying
- store open/closed state is now broadcast through `storeStatusUpdated`
- `npm run db:seed` loads idempotent demo fixtures from `api/database/seed.ts`, including multiple restaurants with curated menu categories/products, a market catalog, demo customer/driver accounts, promotions, and a small sample order set.
- **Directions proxy** — `GET /api/directions?points=lon,lat;lon,lat[&steps=true&language=en]` (`api/src/routes/directionsRoutes.ts`). Requires `Authorization: Bearer <jwt>`. Sanitises coordinates (re-serialised from parsed floats, earth-range validated) to prevent SSRF. Fetches from Mapbox server-side using env `MAPBOX_TOKEN`, caches result in Redis at 65 s TTL, returns `{ distanceKm, durationMin, geometry: [[lon,lat],...], steps? }`. Rate-limited to 200 req / 15 min per user key. The Mapbox token is **never** sent to any client.
- **Active-delivery publish bypass** — `DriverHeartbeatHandler` now publishes `driverUpdate` on every heartbeat (every 2 s) for drivers with an `activeOrderId`, even when the DB location throttle has not tripped. This keeps admin map animations smooth. See B4 for details.
- Drizzle migration resilience: `api/database/migrations/0002_concerned_liz_osborn.sql` now uses `ADD COLUMN IF NOT EXISTS` for `store_settings.dispatch_mode_enabled` to avoid duplicate-column failures when older/manual schema states already contain that field.
- generated schema and type files are large and should not be manually edited

## Recommended Next Cleanup

- extract a short subscription runbook from implementation details in `api/src/index.ts` and `api/src/lib/pubsub.ts`
- centralise repeated `requireAuth` middleware (currently duplicated in `uploadRoutes.ts` and `directionsRoutes.ts`) into a shared helper
- finish authorization hardening for pricing and settlement rule mutations