# ngrok.yml Configuration Reference

## Current Setup

Your `ngrok.yml` defines three tunnels:

```yaml
version: 3
authtoken: ${NGROK_AUTHTOKEN}  # From .env.ngrok or shell env

tunnels:
  api:
    addr: http://localhost:4000
    proto: http
    domain: ${NGROK_DOMAIN_API}

  metro-customer:
    addr: http://localhost:8082
    proto: http
    domain: ${NGROK_DOMAIN_CUSTOMER}

  metro-driver:
    addr: http://localhost:8083
    proto: http
    domain: ${NGROK_DOMAIN_DRIVER}
```

## How to Customize

### 1. Use Only API Tunnel (Recommended)
Edit `ngrok.yml`:
```yaml
version: 3
authtoken: ${NGROK_AUTHTOKEN}

tunnels:
  api:
    addr: http://localhost:4000
    proto: http
```
Then run: `ngrok start api`

### 2. Add Reserved Domains (Paid Plan Only)
Edit `.env.ngrok`:
```
NGROK_DOMAIN_API=my-api.ngrok-free.app
NGROK_DOMAIN_CUSTOMER=my-customer.ngrok-free.app
NGROK_DOMAIN_DRIVER=my-driver.ngrok-free.app
```

### 3. Add HTTPS (Automatic)
ngrok automatically provides HTTPS:
```
http://localhost:4000  →  https://xxxxx-ngrok-free.app
```

### 4. Add Custom Headers/Authentication
```yaml
tunnels:
  api:
    addr: http://localhost:4000
    proto: http
    auth: "user:password"  # Basic auth tunnel
    # or use OAuth, etc.
```

## Common Scenarios

### Scenario 1: Only Test API Remotely
**What to do:**
- Modify `ngrok.yml` - keep only `api` tunnel
- Run: `ngrok start api`
- Update `.env` files with new ngrok URL
- Restart Metro

### Scenario 2: Test Specific Mobile App
**What to do:**
- Keep only that Metro tunnel
- Run: `ngrok start metro-customer` (or metro-driver)
- Share URL at http://localhost:4040

### Scenario 3: Full Development (All Services)
**What to do:**
- Run: `npm run dev:all` (uses all tunnels)
- Check http://localhost:4040 for all URLs

### Scenario 4: Local Development Only (No ngrok)
**What to do:**
- Don't run ngrok
- Keep Metro running with `expo start`
- Test on same network with Expo Go app

## Managing ngrok.yml

### Add a New Tunnel
```yaml
tunnels:
  api: ...
  metro-customer: ...
  metro-driver: ...
  
  my-new-service:        # Add this
    addr: http://localhost:5000
    proto: http
```
Then run: `ngrok start my-new-service`

### Remove a Tunnel
Simply comment it out or delete it:
```yaml
# metro-customer:
#   addr: http://localhost:8082
#   proto: http
```

### Rename a Tunnel
```yaml
# OLD: api
# NEW: api-backend
api-backend:  # Just change the name
  addr: http://localhost:4000
  proto: http
```
Then run: `ngrok start api-backend`

## Format Reference

| Field | Required | Example | Purpose |
|-------|----------|---------|---------|
| `version` | Yes | `3` | ngrok config version |
| `authtoken` | No | `${NGROK_AUTHTOKEN}` | Auth (from env or config) |
| `tunnels` | Yes | `api:` | List of tunnels |
| `addr` | Yes | `http://localhost:4000` | Local address to expose |
| `proto` | Yes | `http` or `tcp` | Protocol (use `http`) |
| `domain` | No | `${NGROK_DOMAIN_API}` | Reserved domain (paid only) |
| `auth` | No | `user:password` | Basic auth |
| `ip-restriction` | No | `0.0.0.0/0` | Access control |

## Running Specific Combinations

```bash
# All tunnels
ngrok start --all

# Specific tunnels
ngrok start api metro-customer
ngrok start api metro-driver
ngrok start api                 # Just API

# Single tunnel
ngrok start api
```

## Troubleshooting

### Tunnel fails to start
**Check:**
- Is the local service running? (e.g., is API on 4000?)
- Does `localhost:PORT` work in browser?
- Is another ngrok running? (`ngrok kill`)

### Can't access tunnel URL
**Check:**
- URL correct? (from http://localhost:4040)
- Firewall blocking? (ngrok dashboard shows if blocked)
- Endpoint online? (might be ERR_NGROK_334)

### Tunnel keeps disconnecting
**Check:**
- Local service still running?
- Network connection stable?
- ngrok connection limit? (free plan: 40 conn/min)

## Best Practices

✅ **DO:**
- Keep ngrok.yml in version control
- Use environment variables for secrets
- Document why you need ngrok
- Kill old sessions before starting new ones
- Use helper scripts for common tasks

❌ **DON'T:**
- Hardcode ngrok URLs in code
- Commit authtoken to git
- Run multiple ngrok instances without reason
- Leave ngrok running when not needed

## Getting Help

- **ngrok docs:** https://ngrok.com/docs
- **ngrok config reference:** https://ngrok.com/docs/ngrok-agent/config
- **Dashboard stats:** http://localhost:4040
- **Check logs:** `ngrok logs`

