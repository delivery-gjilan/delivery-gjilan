# Production Deployment Guide

Step-by-step for deploying ZippGo to the Hetzner CCX13 server.

---

## Prerequisites

- Hetzner CCX13 purchased, firewall open on 22/80/443
- Domain DNS pointing to the server IP (Cloudflare → A record)
- GitHub repo with `main` branch

---

## Phase 1 — GitHub Secrets Setup

Go to **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `PROD_SSH_HOST` | Your Hetzner server IP |
| `PROD_SSH_USER` | `root` (or deploy user) |
| `PROD_SSH_KEY` | Your private SSH key (the one that matches what you added in Hetzner) |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` scope |
| `GHCR_USERNAME` | Your GitHub username |

Also create a **GitHub Environment** named `production` (Settings → Environments) — this makes deploys require review or just provides an audit trail.

---

## Phase 2 — Server Bootstrap

SSH into the server:
```bash
ssh root@YOUR_SERVER_IP
```

Run the setup script:
```bash
curl -fsSL https://raw.githubusercontent.com/delivery-gjilan/delivery-gjilan/main/scripts/server-setup.sh | bash
```

Or copy it manually:
```bash
scp scripts/server-setup.sh root@YOUR_IP:/tmp/setup.sh
ssh root@YOUR_IP bash /tmp/setup.sh
```

---

## Phase 3 — Transfer Config Files

From your local machine:
```bash
SERVER=root@YOUR_IP

# API compose + Caddy config
scp api/docker-compose.prod.yml $SERVER:/opt/zippgo/api/
scp api/Caddyfile $SERVER:/opt/zippgo/api/

# Observability stack
scp -r observability/ $SERVER:/opt/zippgo/
```

---

## Phase 4 — Create .env.prod on Server

SSH into the server and create the file:
```bash
nano /opt/zippgo/api/.env.prod
```

Paste and fill in all values:
```env
NODE_ENV=production

# Database credentials (match what's in docker-compose.prod.yml)
DB_USER=zippgo
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=zippgo

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=CHANGE_ME
REFRESH_TOKEN_SECRET=CHANGE_ME

# App
PORT=4000
PUBLIC_API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://admin.yourdomain.com

# Maps
MAPBOX_TOKEN=your_mapbox_token

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_ADDRESS=noreply@yourdomain.com

# Redis (handled by docker-compose override, but set here as fallback)
REDIS_URL=redis://redis:6379
REDIS_REQUIRED=true

# Logging
LOG_LEVEL=info

# Error tracking — fill in AFTER GlitchTip is running (Phase 7)
SENTRY_DSN=
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

---

## Phase 5 — Update Caddyfile With Your Domain

Edit the Caddyfile on the server to replace placeholder domain:
```bash
sed -i 's/api.zippgo.com/api.yourdomain.com/g' /opt/zippgo/api/Caddyfile
sed -i 's/grafana.zippgo.com/grafana.yourdomain.com/g' /opt/zippgo/api/Caddyfile
sed -i 's/errors.zippgo.com/errors.yourdomain.com/g' /opt/zippgo/api/Caddyfile
```

Replace the `remote_ip 0.0.0.0/0` placeholder with your actual IP (get it from https://myip.io):
```bash
nano /opt/zippgo/api/Caddyfile
# Change  remote_ip 0.0.0.0/0  to  remote_ip YOUR.REAL.IP.ADDRESS
```

---

## Phase 6 — First Deploy

### 6a. Log in to GHCR on the server
```bash
# On the server:
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 6b. Start the stack

Either push to `main` to trigger the GitHub Actions deploy, **or** deploy manually for the first time:

```bash
cd /opt/zippgo/api
IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d
```

Check containers are up:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api --tail=50
```

### 6c. Run database migrations (first deploy only)
```bash
cd /opt/zippgo/api
docker compose -f docker-compose.prod.yml exec api node dist/migrate.js
```

---

## Phase 7 — Start Observability Stack

```bash
cd /opt/zippgo/observability
docker compose up -d
```

Open Grafana at http://grafana.yourdomain.com (or http://YOUR_IP:3100 before DNS is ready).

Default credentials: `admin` / `admin` — **change immediately**.

### GlitchTip first-time setup
1. Open https://errors.yourdomain.com
2. Create an account (first signup becomes admin)
3. Create an organization → create a project → copy the DSN
4. Add to `.env.prod` on the server: `SENTRY_DSN=https://...`
5. Restart the API: `docker compose -f /opt/zippgo/api/docker-compose.prod.yml restart api`

---

## Phase 8 — Verify Everything

```bash
# Health check
curl https://api.yourdomain.com/ready

# Logs
docker logs zippgo-api --tail=100

# DB connection
docker exec zippgo-db psql -U zippgo -c "\dt"

# Check backup runs OK
bash /opt/zippgo/backup.sh
ls /opt/zippgo/backups/
```

---

## Phase 9 — Configure Grafana Alerts

In Grafana UI:
1. **Alerting → Contact points** → edit the email contact point → add your `ALERT_EMAIL`
2. **Alerting → Alert rules** → confirm rules are in evaluation
3. **Dashboards** → import from `observability/grafana/dashboards/`

Set SMTP env vars if you want email alerts in `observability/docker-compose.yml`:
```yaml
GF_SMTP_ENABLED: "true"
GF_SMTP_HOST: "smtp.resend.com:587"
GF_SMTP_USER: "resend"
GF_SMTP_PASSWORD: "your_resend_api_key"
GF_SMTP_FROM_ADDRESS: "alerts@yourdomain.com"
```

---

## Ongoing: GitHub Actions CI/CD

After all the above is done, every push to `main` automatically:
1. Builds the Docker image and pushes to GHCR
2. SSHes into the server and does a rolling restart of just the API container
3. Waits for `/ready` to respond — rolls back if it fails

Secrets needed in GitHub (see Phase 1).

---

## Quick Reference Commands

```bash
# View logs
docker logs zippgo-api -f

# Restart API only (zero downtime for DB/Redis)
cd /opt/zippgo/api
docker compose -f docker-compose.prod.yml restart api

# Reload Caddy config (e.g. after changing Caddyfile)
docker exec zippgo-caddy caddy reload --config /etc/caddy/Caddyfile

# Manual backup now
bash /opt/zippgo/backup.sh

# Drizzle Studio (inspect DB remotely via SSH tunnel)
# On your local machine:
ssh -L 5432:localhost:5432 root@YOUR_IP
# Then locally: npx drizzle-kit studio
```
