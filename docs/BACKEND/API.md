# Backend API

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
- `api/src/repositories` contains database-facing logic
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

The current design is mostly invalidation plus refetch, not full event-sourced client state.

That means:

- admin and business clients often refetch on subscription signals
- customer tracking uses a more targeted live payload for per-order movement/ETA data
- backend topic naming is centralized in `api/src/lib/pubsub.ts`

## Operational Notes

- websocket subscriptions now include rate-limiting controls in `api/src/index.ts` to reduce per-socket abuse
- store open/closed state is now broadcast through `storeStatusUpdated`
- generated schema and type files are large and should not be manually edited

## Recommended Next Cleanup

- extract a short subscription runbook from implementation details in `api/src/index.ts` and `api/src/lib/pubsub.ts`
- centralize repeated route-level auth middleware in shared utilities
- finish authorization hardening for pricing and settlement rule mutations