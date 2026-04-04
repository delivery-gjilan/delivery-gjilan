# Managed Redis Setup (Upstash)

No code changes required — only an environment variable update.

## 1. Create a free Upstash database

1. Go to [console.upstash.com](https://console.upstash.com) and sign up (free)
2. Click **Create Database**
3. Name: `delivery-gjilan`
4. Region: pick the one closest to your VPS (e.g. `eu-west-1` for Europe)
5. Type: **Regional** (not Global — you don't need multi-region)
6. Enable **TLS** (on by default)
7. Click **Create**

## 2. Copy the connection URL

From the database dashboard, copy the **Redis URL** under the "Connect" tab.  
It looks like:

```
rediss://default:AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA@your-instance.upstash.io:6379
```

Note the `rediss://` (double-s) — this is TLS-encrypted. Required by Upstash.

## 3. Set the environment variable

### Local `.env`
```env
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
```

### On each VPS
```bash
export REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379"
```

Or add it to your process manager config (PM2, systemd, Docker Compose, etc.)

## 4. Restart the API

```bash
npm run start
```

The API will connect to Upstash on first request. Check logs for:
```
[Redis] connected — caching enabled
```

## Free tier limits

| Limit | Free tier |
|---|---|
| Commands/day | 10,000 |
| Storage | 256 MB |
| Max connections | 100 |
| Bandwidth | 200 MB/day |

For production with real traffic, the **Pay As You Go** plan at ~$0.20 per 100K commands is effectively free unless you have heavy traffic.

## What this enables

- Rate limiter counters shared across all API instances (no double-counting with 2 VPS)
- Cache (businesses, products, delivery zones, drivers) shared across instances
- Redis pub/sub for WebSocket subscriptions shared across instances
- Auto-failover built into Upstash — no manual Redis restarts needed

## Notes

- The existing `cache.ts` handles `rediss://` TLS URLs automatically via the `redis` npm package
- If Upstash is unreachable, the API falls back gracefully: cache misses hit Postgres, rate limiter falls back to in-memory per instance
- WebSocket subscriptions will stop delivering real-time events if Redis is down (this is the only load-bearing use of Redis)
