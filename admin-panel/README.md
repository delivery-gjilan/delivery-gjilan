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

## Navigation Structure

Active routes and their purposes:

| Route | Page | Access |
|-------|------|--------|
| `/dashboard/map` | Live operations map — driver tracking, order cards, BIZ tab, chat overlay | ADMIN+ |
| `/dashboard/ops-wall` | Real-time SLO wall — fleet health, stuck orders, push metrics | SUPER_ADMIN |
| `/dashboard/notifications/devices` | Business tablet monitor — 1 row per business, deduped by most-recent heartbeat, joined with business name | ADMIN+ |
| `/admin/messages` | Admin ↔ Driver and Admin ↔ Business message threads (tabbed: Drivers / Businesses) | ADMIN+ |
| `/admin/orders` | Order management | ADMIN+ |
| `/admin/drivers` | Driver management | ADMIN+ |
| `/admin/businesses` | Business management | ADMIN+ |
| `/admin/users` | User management | ADMIN+ |
| `/admin/products` | Product catalogue | ADMIN+ |
| `/admin/promotions` | Promotions | ADMIN+ |

**Removed routes** (deleted from codebase): `/admin/simulation`, `/admin/settlements`, `/admin/statistics`, `/admin/settings`. Driver Messages and Business Messages were merged into `/admin/messages`.

## Sidebar

The sidebar (`src/components/dashboard/sidebar.tsx`) uses collapsible sections (`NavSection[]`) driven by `useState<Record<string,boolean>>`. Section headers auto-expand when the current route falls within them. Section headers are styled as navigable button-like items (active highlight, `py-2.5`, `text-sm font-semibold`).

## Development Notes

- prefer the operations in `src/graphql/operations` over inlining large GraphQL strings inside pages
- do not manually edit files in `src/gql`; regenerate them from codegen inputs
- if a subscription or schema change breaks the admin panel, inspect both handwritten operations and generated outputs

## Related Docs

- [../docs/README.md](../docs/README.md)
- [../docs/BACKEND/API.md](../docs/BACKEND/API.md)
- [../docs/BACKEND/WATCHDOG_HEARTBEAT.md](../docs/BACKEND/WATCHDOG_HEARTBEAT.md)
- [../docs/BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md](../docs/BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md)
