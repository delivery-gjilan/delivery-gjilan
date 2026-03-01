# Security Roadmap

Prioritized security improvements for a city-level delivery app facing potential targeted attacks.

---

## Tier 1 — DDoS & Availability

- [ ] **Cloudflare / AWS Shield** — Edge-level DDoS protection. Put API behind Cloudflare (free tier works)
- [ ] **Redis-backed rate limiting** — `rate-limit-redis` package. Current in-memory store resets on restart and doesn't scale across instances
- [ ] **GraphQL persisted queries** — `@graphql-yoga/plugin-persisted-operations`. Extract queries at build time, reject unknown ones in production
- [ ] **Disable introspection in production** — Prevent attackers from discovering the full schema

## Tier 2 — Account Takeover & Auth Abuse

- [ ] **Account lockout** — Lock account after 5 failed login attempts for 15 minutes (store in DB)
- [ ] **OTP attempt limiting** — Max 5 attempts per verification code, then invalidate and require resend
- [ ] **Token blacklist (Redis)** — Store invalidated token JTIs in Redis with TTL = remaining token lifetime. Allows revoking compromised tokens
- [ ] **2FA for admin/business accounts** — TOTP via `otplib` for SUPER_ADMIN, ADMIN, BUSINESS_OWNER roles
- [ ] **Login notifications** — Push notification on login from new device/IP

## Tier 3 — Data & Infrastructure

- [ ] **S3 presigned URLs** — Generate time-limited presigned URLs for reads instead of public bucket URLs
- [ ] **File upload validation** — Validate MIME type via magic bytes (not just extension). Limit to image types only
- [ ] **Database connection encryption** — Add `?sslmode=require` to `DB_URL` in production
- [ ] **Secrets rotation plan** — Document rotation procedure; use AWS Secrets Manager in production
- [ ] **npm audit in CI** — `npm audit --audit-level=high` as a CI gate to catch vulnerable dependencies

## Tier 4 — Mobile-Specific

- [ ] **Certificate pinning** — Prevent MITM attacks on public WiFi (`expo-certificate-pinning` or custom fetch with pinned cert hash)
- [ ] **Play Integrity / App Attest** — Server-side attestation to verify requests come from genuine app builds
- [ ] **Root/jailbreak detection** — `expo-device` checks + `jail-monkey` library to detect compromised devices

## Tier 5 — Monitoring & Response

- [ ] **Anomaly alerting** — Grafana alerts on: spike in 429s, failed logins > threshold, error rate > 5%
- [ ] **Request fingerprinting** — Hash of User-Agent + Accept-Language + screen size to track attackers across IP rotations
- [ ] **Geo-blocking** — Cloudflare firewall rules: allow Kosovo + neighboring countries, challenge the rest
- [ ] **Incident runbook** — Document: how to enable Cloudflare "Under Attack" mode, how to rotate secrets, how to block IPs

---

## Quick Wins (do first)

1. **Cloudflare** — free, 15min setup, blocks 90% of attacks
2. **Account lockout** — prevents credential stuffing
3. **OTP attempt limiting** — prevents verification bypass
4. **Disable introspection in prod** — stops schema reconnaissance
5. **Geo-blocking** — app is Gjilan-only, block irrelevant countries

---

## Already Implemented ✅

- Helmet security headers
- CORS restricted to allowed origins
- Body size limit (16kb)
- Auth rate limiter on login/signup/refresh operations (20/15min)
- GraphQL Armor (depth 10, cost 5000, aliases 5, directives 10, tokens 1000)
- GraphiQL disabled in production
- JWT algorithm pinned to HS256
- Separate refresh token secret
- Access token shortened to 15min (refresh 30d)
- Password policy (min 8 chars)
- Email format validation
- Crypto-secure OTP (`crypto.randomInt`)
- Bcrypt salt rounds bumped to 12
- `.env` in `.gitignore`
- SecureStore for mobile token storage (all apps)
