# Admin Panel

This package is the Next.js admin dashboard for Delivery Gjilan. It is the main browser-based operations surface for:

- order management
- driver visibility and live operations
- finance and settlements
- users, businesses, products, and promotions
- store-level administrative actions

## Run

```bash
npm run dev
```

The app expects the API to be running as well.

## Structure

- `src/app` contains route-level screens and page composition
- `src/components` contains shared admin UI components
- `src/graphql/operations` contains handwritten GraphQL operations grouped by domain
- `src/gql` contains generated GraphQL documents and types
- `src/lib` contains client-side infrastructure such as Apollo hooks and utilities

## Realtime Model

The admin panel mainly uses subscriptions as change signals and then refetches the relevant queries.

Important examples:

- order list invalidation from order update subscriptions
- driver list and live map refresh from `driversUpdated`
- narrower tracking flows from `orderDriverLiveTracking` when the screen needs order-specific movement details

This is intentional. The admin UI does not try to fully mirror backend state in-memory from websocket events alone.

## Development Notes

- prefer the operations in `src/graphql/operations` over inlining large GraphQL strings inside pages
- do not manually edit files in `src/gql`; regenerate them from codegen inputs
- if a subscription or schema change breaks the admin panel, inspect both handwritten operations and generated outputs

## Related Docs

- [../docs/README.md](../docs/README.md)
- [../docs/BACKEND/API.md](../docs/BACKEND/API.md)
- [../docs/BACKEND/WATCHDOG_HEARTBEAT.md](../docs/BACKEND/WATCHDOG_HEARTBEAT.md)
- [../docs/BUSINESS_LOGIC/SETTLEMENT.md](../docs/BUSINESS_LOGIC/SETTLEMENT.md)
