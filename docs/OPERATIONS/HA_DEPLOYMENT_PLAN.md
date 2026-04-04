# High-Availability Deployment Plan

<!-- MDS:O18 | Domain: Operations | Updated: 2026-04-04 -->
<!-- Depends-On: A1, B1, B8, O7, O9 -->
<!-- Depended-By: O7 -->
<!-- Nav: Architecture context → A1. Redis/cache details → B8. Environment model → O7. Docker → O9. -->

> Goal: run 2–3 API instances behind a load balancer, shared Postgres replica, shared Redis, with zero single points of failure in the application tier.

---

## Target Architecture

```text
                      ┌─────────────────────────────┐
                      │       Load Balancer          │
                      │  (Nginx / Caddy / HAProxy)   │
                      └────────┬──────────┬──────────┘
                               │          │
               ┌───────────────▼──┐  ┌────▼──────────────┐
               │   API Instance 1 │  │  API Instance 2    │
               │   Node.js / tsx  │  │  Node.js / tsx     │
               │   port 4000      │  │  port 4000         │
               └───────┬──────────┘  └────────┬───────────┘
                       │                       │
          ┌────────────▼───────────────────────▼──────────┐
          │               Shared Services                  │
          │                                                │
          │   Postgres (primary + optional read replica)  │
          │   Redis (single instance or managed Upstash)  │
          └────────────────────────────────────────────────┘
```

All API instances are stateless (JWT auth, no server-side session). Any instance can handle any request. No sticky sessions required.

---

## Prerequisites (already done ✅)

- [x] Redis pub/sub for cross-instance GraphQL subscription fan-out (`B8`)
- [x] Redis-backed rate limiting (`rate-limit-redis`, all 4 limiters)
- [x] Postgres pool bumped to 50 connections per instance
- [x] `--max-old-space-size=2048` in Node start script
- [x] Driver list Redis cache (5s TTL)

---

## Phase 1 — Single VPS, Basic Hardening

Do this before adding more VPS machines.

### 1.1 Containerize the API

Create `api/Dockerfile`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build        # tsc → dist/
ENV NODE_ENV=production
CMD ["node", "--max-old-space-size=2048", "dist/index.js"]
```

> If you don't want to use Docker, skip this and use PM2 (see 1.2b).

### 1.2a With Docker Compose (recommended)

`docker-compose.yml` at repo root (api section):

```yaml
version: "3.9"
services:
  api1:
    build: ./api
    restart: always
    env_file: ./api/.env
    ports:
      - "4001:4000"

  api2:
    build: ./api
    restart: always
    env_file: ./api/.env
    ports:
      - "4002:4000"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "4000:80"
    depends_on:
      - api1
      - api2
```

### 1.2b Without Docker — PM2 Cluster

```bash
npm install -g pm2
pm2 start dist/index.js -i 2 --name api   # 2 instances on same machine
pm2 save
pm2 startup                                # auto-restart on reboot
```

PM2 cluster mode forks the process, routes connections round-robin, and auto-restarts crashed workers. This is the quickest path to multi-instance on one VPS.

---

## Phase 2 — Load Balancer Config

### Nginx (`nginx.conf`)

```nginx
events {}

http {
  upstream api {
    least_conn;                    # route to least-busy instance
    server 127.0.0.1:4001;
    server 127.0.0.1:4002;
    keepalive 32;
  }

  server {
    listen 80;

    # WebSocket upgrade for GraphQL subscriptions
    location / {
      proxy_pass         http://api;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection "upgrade";
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_read_timeout 86400s;   # keep WS alive
    }
  }
}
```

> For TLS, put Caddy or Certbot in front. Caddy handles HTTPS + auto-renewal automatically.

### Caddy (simpler alternative, handles TLS automatically)

`Caddyfile`:

```
api.yourdomain.com {
  reverse_proxy localhost:4001 localhost:4002 {
    lb_policy least_conn
    header_up Upgrade {http.upgrade}
    header_up Connection {http.connection}
  }
}
```

---

## Phase 3 — Two VPS Setup

### Network Layout

```
VPS-A                        VPS-B
  api instance 1               api instance 2
  Nginx (load balancer)        (no LB, just API)
  Postgres primary             Redis (shared)
```

Or use a managed Postgres (Supabase) and managed Redis (Upstash) so neither VPS owns the data layer.

### What changes

| Config | Value |
|--------|-------|
| `DATABASE_URL` | Both point to same Postgres (Supabase or VPS-A private IP) |
| `REDIS_URL` | Both point to same Redis (Upstash `rediss://` or VPS-B private IP) |
| `JWT_SECRET` | **Must be identical** on both VPS machines |
| `PORT` | 4000 on both; LB on VPS-A proxies to VPS-B:4000 remotely |

### Health check endpoint

The load balancer needs a health check. Add to `api/src/app.ts`:

```ts
app.get('/health', (_req, res) => {
  res.json({ ok: true, pid: process.pid, uptime: process.uptime() });
});
```

Nginx config adds:

```nginx
upstream api {
  server vps-a-internal:4000;
  server vps-b-internal:4000;
  keepalive 32;
}
```

Enable health checks in Nginx Plus, or use a simple interval probe with Uptime Kuma.

---

## Phase 4 — Redis HA

### Option A: Managed (simplest, recommended)

Use Upstash Redis — see [MANAGED_REDIS_SETUP.md](MANAGED_REDIS_SETUP.md). No configuration other than `REDIS_URL`.

### Option B: Self-hosted with Sentinel

Three processes you run yourself:
- 1× Redis primary
- 1× Redis replica
- 3× Sentinel processes (quorum = 2)

Sentinel promotes the replica automatically when the primary dies. Your app connects via the Sentinel URL. More complex, not recommended unless you have ops experience with Redis.

### Option C: Redis Cluster

Shards data across nodes. Unnecessary for this scale. Skip.

**Recommendation: Use Upstash for now. Migrate to self-hosted Sentinel only if cost becomes a concern.**

---

## Phase 5 — Postgres HA

### Current: Supabase (or single VPS Postgres)

If using Supabase: HA is included. Nothing to configure.

If using self-hosted Postgres on VPS-A with pool max 50 per instance:
- 2 instances × 50 = **100 connections max** — check `max_connections` in Postgres (`SHOW max_connections;`)
- Default is 100; increase to 200+ in `postgresql.conf` if running 3 instances

### Adding a read replica (optional, Phase 5+)

Postgres streaming replication sends writes to primary, reads (non-critical) to replica. Use for analytics/reporting queries only. All order/user/driver mutations must go to primary.

---

## Deployment Checklist

### Before deploying multi-instance

- [ ] `/health` endpoint added
- [ ] `JWT_SECRET` is identical across all instances (check `.env`)
- [ ] `REDIS_URL` points to shared Redis (not `localhost`)
- [ ] `DATABASE_URL` points to shared Postgres (not `localhost`)
- [ ] Rate limiters confirmed using Redis store (not in-memory fallback)
- [ ] Redis pub/sub confirmed working (subscriptions fan-out across instances)
- [ ] Postgres `max_connections` ≥ (instances × pool_max) + 10 headroom
- [ ] Nginx/Caddy config includes WebSocket upgrade headers
- [ ] Restart policy set (`restart: always` in Docker or PM2 startup)

### After deploying

- [ ] Hit `/health` on each instance directly (bypass LB) — confirms each is alive
- [ ] Open a subscription in mobile app, kill one API instance — subscription should reconnect via other instance via Redis pub/sub
- [ ] Run k6 combined load test against LB URL — look for even distribution in logs
- [ ] Monitor Postgres connection count: `SELECT count(*) FROM pg_stat_activity;`

---

## Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Redis goes down | Rate limiting falls back to in-memory; pub/sub stops fan-out (subscriptions only see events from their own instance) | Managed Redis with built-in HA (Upstash) |
| One API instance crashes | LB stops routing to it; PM2/Docker restarts it | Restart policies + health checks |
| Postgres connection saturation | 500 errors, pool timeout logs | Increase `max_connections`; add PgBouncer if needed |
| JWT_SECRET mismatch between instances | Auth failures on ~50% of requests (whichever instance doesn't match) | Centralize secrets, use a `.env` sync tool or secret manager |
| WebSocket stickiness issues | Subscriptions drop on reconnect if LB doesn't support WS upgrade | Configure WS upgrade headers in Nginx (shown above) |

---

## Recommended Stack for 2-VPS Launch

| Layer | Choice | Reason |
|-------|--------|--------|
| Process manager | PM2 cluster (2 workers per VPS) | Simplest, no Docker required |
| Load balancer | Caddy on VPS-A | Free TLS, simple config |
| Redis | Upstash (managed) | Zero ops, free tier covers launch |
| Postgres | Supabase (managed) | Already likely in use; HA included |
| Monitoring | Uptime Kuma | Free, self-hosted, checks `/health` |
