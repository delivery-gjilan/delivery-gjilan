# Delivery Gjilan

Delivery Gjilan is a monorepo for the delivery platform: one API, one admin web app, four mobile apps, and an optional local observability stack.

## Workspace Layout

- `api` - GraphQL API, websocket subscriptions, business logic, Drizzle repositories, driver heartbeat/watchdog services
- `admin-panel` - Next.js admin dashboard for operations, finance, users, and live map workflows
- `mobile-customer` - customer ordering and live delivery tracking app
- `mobile-driver` - driver app with heartbeat, navigation, and delivery execution flows
- `mobile-business` - business app for order handling and store operations
- `mobile-admin` - mobile admin companion app
- `observability` - local Grafana, Loki, Promtail, and Sentry-oriented setup notes

## Quick Start

Prerequisites:

- Node.js 20+
- Docker with Compose

Install workspace dependencies:

```bash
npm install
```

Run the main apps from VS Code tasks or manually:

```bash
cd api && npm run dev
cd admin-panel && npm run dev
cd mobile-customer && npm start -- --port 8082
cd mobile-driver && npm start -- --port 8083
cd mobile-business && npm start -- --port 8084
```

## Documentation

Use the docs hub instead of relying on scattered root markdown files:

- [docs/README.md](docs/README.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/BACKEND/API.md](docs/BACKEND/API.md)
- [docs/BACKEND/WATCHDOG_HEARTBEAT.md](docs/BACKEND/WATCHDOG_HEARTBEAT.md)
- [docs/BUSINESS_LOGIC/PRICING_PROMOTIONS.md](docs/BUSINESS_LOGIC/PRICING_PROMOTIONS.md)
- [docs/MOBILE/OVERVIEW.md](docs/MOBILE/OVERVIEW.md)
- [docs/MOBILE/PUSH_AND_LIVE_ACTIVITY.md](docs/MOBILE/PUSH_AND_LIVE_ACTIVITY.md)
- [docs/BUSINESS_LOGIC/SETTLEMENT.md](docs/BUSINESS_LOGIC/SETTLEMENT.md)
- [docs/OPERATIONS/NOTIFICATIONS.md](docs/OPERATIONS/NOTIFICATIONS.md)
- [docs/OPERATIONS/MONITORING.md](docs/OPERATIONS/MONITORING.md)
- [docs/OPERATIONS/APP_STORE_RELEASE.md](docs/OPERATIONS/APP_STORE_RELEASE.md)
- [docs/OPERATIONS/ANALYTICS.md](docs/OPERATIONS/ANALYTICS.md)
- [docs/OPERATIONS/SECURITY.md](docs/OPERATIONS/SECURITY.md)
- [docs/OPERATIONS/OBSERVABILITY.md](docs/OPERATIONS/OBSERVABILITY.md)
- [docs/OPERATIONS/TESTING_PIPELINE.md](docs/OPERATIONS/TESTING_PIPELINE.md)
- [docs/OPERATIONS/ENVIRONMENTS_AND_RELEASES.md](docs/OPERATIONS/ENVIRONMENTS_AND_RELEASES.md)
- [docs/OPERATIONS/DOCKER_AND_STRESS_TESTING.md](docs/OPERATIONS/DOCKER_AND_STRESS_TESTING.md)

## Notes

- Generated build output such as `mobile-customer/dist-test-ios/` should stay out of git.
- Subscription auth now relies on websocket connection context rather than per-subscription token arguments.
- The docs under `docs/` are the primary entrypoint for onboarding and maintenance.
- The old root-level planning and rollout markdown files have been consolidated into the categorized docs under `docs/`.

### Making Schema Changes

1. **Modify Schema**: Add or update tables in `api/database/schema`.
2. **Export New Tables**: If you added a new file, export it in `api/database/schema/index.ts`:

    ```typescript
    export * from "./new-table";
    ```

3. **Generate Migration**:

    ```bash
    npm run db:generate
    ```

    _This creates SQL migration scripts._

4. **Apply Migration**:

    ```bash
    npm run db:migrate
    ```

5. **Visualize Database**:
    ```bash
    npm run db:studio
    ```
    Open `https://local.drizzle.studio` in your browser to view and manage data.

> [!IMPORTANT] > **Do not push changes in the `drizzle` (migrations) folder without consulting the team.**
