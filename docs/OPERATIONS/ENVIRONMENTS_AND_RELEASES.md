# Environments And Releases

<!-- MDS:O7 | Domain: Operations | Updated: 2026-03-18 -->
<!-- Depends-On: (none) -->
<!-- Depended-By: O8, O10 -->
<!-- Nav: Environment changes → update O8 (Testing), O10 (App Store). CI/CD pipeline → review O9 (Docker). -->

## Current State In This Repo

The repo already has the beginnings of a release model, but it is not production-safe yet.

What exists today:

- local development through VS Code tasks
- ngrok tunnel support for local API and Metro exposure
- EAS `development`, `preview`, and `production` build profiles
- Expo Update usage in the mobile apps

What is still a launch blocker:

- the mobile EAS profiles currently point at ngrok URLs in committed config
- secrets and environment-specific values are too close to source-controlled config
- there is no CI/CD workflow to deploy the API automatically
- there is no separate staging API deployment model documented in the repo

## Recommended Environment Model

You should have at least four environments.

### 1. Local

Purpose:

- active feature development
- unstable work
- local DB, Redis, ngrok, and local observability

### 2. Testing Or QA

Purpose:

- your tester validates frontend behavior
- you validate risky changes without touching production
- previews can point to a real hosted API with seeded or safe test data

This should be a real deployed environment, not another developer machine.

### 3. Staging

Purpose:

- pre-production validation
- release candidate verification
- integration checks across API, admin-panel, and mobile preview builds

This environment should be as close to production as practical.

### 4. Production

Purpose:

- real customer traffic
- real business and driver operations

Production should have its own database, secrets, monitoring, and alert routing.

## Should You Deploy A Testing API?

Yes.

You should not rely on production or ngrok for tester workflows.

My recommendation:

- deploy one non-production API that serves testing and preview builds
- if needed later, split it into `qa` and `staging`, but one hosted non-prod API is enough to start

That gives you:

- stable frontend testing URLs
- reproducible API behavior
- somewhere to run integration and preview checks
- less risk of accidental production impact

## Recommended Release Flow

### Branch Flow

- feature branches for active work
- pull requests into `main`
- branch protection on `main`

### On Pull Request

- run quality checks and tests
- optionally build preview artifacts

### On Merge To `main`

Recommended default behavior:

- deploy API and admin-panel to staging automatically
- publish internal preview builds or preview updates for mobile apps
- run post-deploy smoke checks against staging

### Production Promotion

Do not deploy production automatically on every merge to `main` at first.

Better flow:

- merge to `main` -> staging auto deploy
- verify on staging
- manual approval or release tag -> production deploy

That is safer while the platform is still changing quickly.

## Mobile Environment Recommendations

The mobile apps should not hardcode production URLs into `eas.json` if those values differ by environment.

Use:

- EAS secrets for sensitive values
- environment-specific public URLs through build profiles or release channels
- separate preview and production channels

Suggested mapping:

- `development` -> local/ngrok only
- `preview` -> testing or staging API
- `production` -> production API only

Right now, the committed ngrok URLs in preview and production profiles should be treated as temporary and replaced before go-live.

## API Deployment Recommendation

Choose a host that makes environment separation easy.

Pragmatic options:

- Railway
- Render
- Fly.io
- a VPS with Docker later
- AWS only if you want more setup responsibility now

For your current stage, the best choice is the one that gives you:

- easy environment variables
- managed Postgres or clean DB connection support
- simple staging and production services
- deploys from GitHub

## Secret Management Recommendation

Before go-live, move environment values out of committed config wherever possible.

Use:

- GitHub Actions secrets for CI/CD
- platform-managed secrets for API deployment
- EAS secrets for mobile build-time values

Sensitive values should not live in committed `eas.json` or ad hoc local notes.

## Recommended CI/CD Shape

### Staging

- trigger on merge to `main`
- deploy API to staging
- deploy admin-panel to staging
- optionally trigger EAS preview updates or internal preview builds

### Production

- trigger on version tag or manual workflow dispatch
- deploy API to production
- deploy admin-panel to production
- publish production mobile updates only after approval

## My Recommendation

The simplest safe release model for you is:

1. local for development
2. one hosted non-production API for tester and preview use
3. staging auto-deployed from `main`
4. production deployed manually after staging validation

That is much safer than merging to `main` and posting directly to production immediately.