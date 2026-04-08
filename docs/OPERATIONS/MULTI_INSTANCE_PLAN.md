# Multi-Instance Deployment Plan

> **Status:** Not yet executed. Reference this when traffic or reliability requirements justify a second API server.
> 
> **Trigger conditions to consider this:**
> - Grafana shows sustained CPU >70% on the single server during peak hours
> - p95 latency creeping above 500ms under real load
> - You need zero-downtime deploys (rolling update without any dropped requests)
> - You have SLA commitments to business clients

---

## Architecture Target

```
                    ┌─────────────────────────┐
  Mobile / Admin    │    Cloudflare (DNS)      │
  clients      ───→ │    DDoS protection       │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │   Hetzner Load Balancer  │
                    │   (or Caddy on LB box)   │
                    └─────┬──────────┬────────┘
                          │          │
             ┌────────────▼─┐    ┌───▼────────────┐
             │  API Server 1 │    │  API Server 2  │
             │  Node + Redis │    │  Node + Redis  │
             │  Caddy        │    │  Caddy         │
             └──────┬───────┘    └───────┬────────┘
                    │  Hetzner Private Network
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Postgres Server   │
                    │   (single DB, both  │
                    │    servers connect) │
                    └─────────────────────┘

                    ┌─────────────────────────┐
                    │   Observability Server  │
                    │   Grafana + Loki +      │
                    │   Prometheus +          │
                    │   GlitchTip             │
                    └─────────────────────────┘
```

---

## Phase 1 — Infrastructure changes

### 1.1 Hetzner Private Network
Create a private network in the Hetzner console connecting all servers:
- API Server 1 (e.g. 10.0.0.1)
- API Server 2 (e.g. 10.0.0.2)
- Postgres Server (e.g. 10.0.0.3)
- Observability Server (e.g. 10.0.0.4)

All inter-server traffic uses private IPs — never exposed publicly.

### 1.2 Load Balancer options

**Option A: Hetzner Managed Load Balancer (~€5/mo)**
- Create in Hetzner console
- Add both API servers as targets on port 443
- Health check: `GET /health` — removes a server from rotation if it fails
- Handles SSL termination (upload your cert or use Let's Encrypt)
- Simplest approach, zero config on your side

**Option B: Caddy on a separate LB server (free, more control)**
```
# Caddyfile on load balancer server
api.yourdomain.com {
    reverse_proxy {
        to 10.0.0.1:4000 10.0.0.2:4000
        health_uri /health
        health_interval 10s
        lb_policy round_robin
    }
}
```

### 1.3 Redis — shared vs. per-server

**Current setup:** Each server has its own Redis (in-memory pubsub).  
**Problem with 2 servers:** A WebSocket subscription on Server 1 won't receive pubsub events published on Server 2.  

**Fix — shared Redis:**
- Move Redis to the Postgres server (or a dedicated box)
- Both API servers point `REDIS_URL` to the shared Redis private IP
- Your existing Redis pubsub bridge (`initializePubSubRedisBridge`) already handles this — it was designed for this scenario
- Update `.env` on both servers: `REDIS_URL=redis://10.0.0.3:6379`

**Important:** `REDIS_REQUIRED=true` on both servers once shared Redis is in use.

---

## Phase 2 — Application changes

### 2.1 Session stickiness (WebSockets)

WebSocket connections are stateful — a client connected to Server 1 must stay on Server 1 for the duration of that connection. If the load balancer routes mid-session to Server 2, the subscription breaks.

**Fix:** Enable sticky sessions on the load balancer.

*Hetzner LB:* Enable "sticky sessions" in the console (cookie-based).  
*Caddy:* Use `lb_policy ip_hash` — same client IP always routes to same server.

```
reverse_proxy {
    to 10.0.0.1:4000 10.0.0.2:4000
    lb_policy ip_hash
    health_uri /health
}
```

### 2.2 No filesystem state

Confirm nothing is stored on local disk that the other server needs:
- ✅ Uploaded images → S3 (already in place)
- ✅ Sessions → JWT stateless (already in place)
- ✅ Pubsub → Redis bridge (already in place)
- ✅ Logs → written to local disk, but Promtail ships them to Loki (each server has own Promtail)
- ⚠️ Check: `api/logs/` is local per server — fine, Promtail handles this

---

## Phase 3 — Observability changes

### 3.1 Promtail on both servers

Each API server needs Promtail running alongside it, pushing logs to the central Loki on the observability server.

On each server's `docker-compose.prod.yml`, add:
```yaml
promtail:
  image: grafana/promtail:3.4.2
  restart: unless-stopped
  volumes:
    - ./logs:/var/log/api:ro
    - ./promtail-config.yml:/etc/promtail/config.yml
  command: -config.file=/etc/promtail/config.yml
```

In `promtail-config.yml` for each server, add a `host` label so you can tell them apart in Grafana:
```yaml
labels:
  job: delivery-api
  host: server-1        # or server-2
  __path__: /var/log/api/*.log
```

### 3.2 Prometheus scrapes both servers

Update `observability/prometheus/prometheus.yml`:
```yaml
- job_name: delivery-api
  static_configs:
    - targets:
        - 10.0.0.1:4000   # server 1
        - 10.0.0.2:4000   # server 2
```

Grafana dashboards automatically show aggregated metrics plus per-instance breakdowns via the `instance` label.

### 3.3 node_exporter on both servers

Each server runs node_exporter. Add both to Prometheus:
```yaml
- job_name: node
  static_configs:
    - targets:
        - 10.0.0.1:9100
        - 10.0.0.2:9100
```

### 3.4 Blackbox probes both /ready endpoints

```yaml
- job_name: delivery-api-ready
  metrics_path: /probe
  params:
    module: [http_2xx]
  static_configs:
    - targets:
        - http://10.0.0.1:4000/ready
        - http://10.0.0.2:4000/ready
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      replacement: blackbox-exporter:9115
```

---

## Phase 4 — Deployment changes (GitHub Actions)

### 4.1 Rolling deploy workflow

Deploy to Server 1 first, verify health, then Server 2. Users on Server 1 are temporarily rerouted to Server 2 by the load balancer's health check during the deploy window.

```yaml
# .github/workflows/deploy-production.yml

jobs:
  deploy:
    steps:
      - name: Deploy to server 1
        run: |
          ssh server1 "cd /opt/delivery && IMAGE_TAG=${{ github.sha }} docker compose pull api && docker compose up -d --no-deps api"

      - name: Health check server 1
        run: |
          for i in {1..12}; do
            curl -sf https://10.0.0.1:4000/ready && break
            sleep 5
          done

      - name: Deploy to server 2
        run: |
          ssh server2 "cd /opt/delivery && IMAGE_TAG=${{ github.sha }} docker compose pull api && docker compose up -d --no-deps api"

      - name: Health check server 2
        run: |
          for i in {1..12}; do
            curl -sf https://10.0.0.2:4000/ready && break
            sleep 5
          done
```

### 4.2 GitHub Actions secrets to add

- `SERVER1_SSH_KEY` + `SERVER1_HOST`
- `SERVER2_SSH_KEY` + `SERVER2_HOST`

---

## Phase 5 — Postgres considerations

With 2 API servers, connection pool pressure doubles: 2 servers × 10 connections = 20 connections. Still nothing for Postgres to worry about.

If you ever see `too many connections` errors (unlikely until you have many more servers), add **PgBouncer** as a connection pooler in front of Postgres. Not needed at 2 servers.

---

## Migration checklist (when executing)

- [ ] Create Hetzner private network, attach all servers
- [ ] Provision API Server 2 (same spec as Server 1)
- [ ] Move Redis to shared server, update `REDIS_URL` on both API servers
- [ ] Set `REDIS_REQUIRED=true` on both
- [ ] Deploy same Docker image to Server 2
- [ ] Run migrations on Server 2 (idempotent — safe)
- [ ] Add Server 2 to load balancer
- [ ] Verify load balancer health checks pass for both servers
- [ ] Enable sticky sessions on LB
- [ ] Add Server 2 Promtail, node_exporter to observability
- [ ] Update Prometheus scrape targets to include Server 2
- [ ] Update rolling deploy workflow in GitHub Actions
- [ ] Run a test order — verify it works regardless of which server handles it
- [ ] Watch Grafana for 30 minutes — confirm metrics appear for both instances
