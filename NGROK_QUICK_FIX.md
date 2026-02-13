# Quick Fix: ERR_NGROK_334 and Multi-Tunnel Setup

## What Was Done ✅

1. **Created `ngrok.yml`** - Central config for managing multiple tunnels
2. **Updated `.vscode/tasks.json`** - Changed from `ngrok http 4000` to `ngrok start --all`
3. **Created `.env.ngrok`** - Placeholder for authtoken and custom domains
4. **Created helper scripts** - `scripts/ngrok-start.ps1` and `scripts/ngrok-start.sh`
5. **Created this guide** - `NGROK_SETUP.md` with detailed instructions

## Fix Your Current Error: ERR_NGROK_334

### The Problem
You're getting **ERR_NGROK_334: Endpoint already online** because:
- An ngrok tunnel is still running/connected to that endpoint
- You're trying to start ngrok while it's already active
- Or the ngrok URL in your `.env` is still registered

### The Solution (Quick)

**Option A: Cleanest - Disconnect everything**
```powershell
# 1. Kill all ngrok processes
ngrok kill

# 2. Wait 5 seconds (important!)
Start-Sleep -Seconds 5

# 3. Clear any stuck ngrok processes
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# 4. Restart from scratch
npm run dev:all
```

**Option B: Update API URL (if endpoint was changed)**
If ngrok generated a NEW URL:
1. Check ngrok dashboard: `http://localhost:4040`
2. Find the new API URL (format: `https://xxxxx-ngrok-free.app`)
3. Update both:
   - `mobile-customer/.env` → `EXPO_PUBLIC_API_URL=https://xxxxx-ngrok-free.app/graphql`
   - `mobile-driver/.env` → `EXPO_PUBLIC_API_URL=https://xxxxx-ngrok-free.app/graphql`
4. Restart Metro to reload environment

**Option C: Use the helper script (Windows)**
```powershell
# Easiest: Just run the management script
.\scripts\ngrok-start.ps1 -KillExisting

# Or specific mode
.\scripts\ngrok-start.ps1 api -KillExisting  # Just API tunnel
```

## Answers to Your Questions

### ✅ Can I use both API and Metro on free plan?
**YES** - Free plan supports multiple tunnels via `ngrok.yml`. The limit is connection rate (40/min), not number of tunnels.

### ✅ Does Expo already handle tunneling?
**YES** - When you run `expo start`, it automatically enables tunnel mode. You get:
- **Expo's tunneling** (built-in, no setup needed) - Good for development
- **Your Metro on 8082/8083** (local or LAN)
- **Optional:** ngrok for using public URLs

**For mobile testing without ngrok:**
- Just run `npm start` in mobile-customer/driver
- Use Expo Go app to scan QR code
- Works on local network or Expo's tunnel

### ✅ Is ngrok needed for Metro?
**NO** - Not typically. Expo's tunneling is better. Only use ngrok if you need:
- Public static URLs
- External service integrations
- Specific testing scenarios

## Recommended Setup

### For Local Development (Fastest)
```bash
cd api && npm run dev          # Terminal 1: API on 4000
cd mobile-customer && npm start # Terminal 2: Metro on 8082, Expo tunnel enabled
# Use Expo Go app: Scan QR code
```
✅ **No ngrok** - No tunnel conflicts - Fast - Free

### For Public Testing / Demo
```bash
npm run dev:all  # All services + ngrok tunnels
# Share API URL from ngrok dashboard at http://localhost:4040
```
✅ **Public URLs** - Mobile apps can access from anywhere

### For Backend-Only (API testing)
```bash
cd api && npm run dev
.\scripts\ngrok-start.ps1 api -KillExisting
# API now publicly accessible
```
✅ **Simple** - Only expose what you need

## Files Created/Modified

| File | Purpose |
|------|---------|
| `ngrok.yml` | Central config for all tunnels |
| `.env.ngrok` | Placeholder for authtoken |
| `scripts/ngrok-start.ps1` | Windows helper script |
| `scripts/ngrok-start.sh` | macOS/Linux helper script |
| `.vscode/tasks.json` | Updated to use `ngrok start --all` |
| `NGROK_SETUP.md` | Full documentation |

## Next Steps

1. **Fix the error now:**
   ```powershell
   ngrok kill
   Start-Sleep -Seconds 5
   npm run dev:all
   ```

2. **Get ngrok authtoken:**
   - Go to https://dashboard.ngrok.com/get-started/your-authtoken
   - Run: `ngrok config add-authtoken YOUR_TOKEN`

3. **Choose your workflow** (see NGROK_SETUP.md)

4. **Start developing!** 🚀

## Quick Commands

```powershell
# Start everything
npm run dev:all

# Start only API (with ngrok)
npm run dev:api

# Use helper script for just API tunnel
.\scripts\ngrok-start.ps1 api -KillExisting

# Kill stuck ngrok
ngrok kill

# View all tunnels
# Open: http://localhost:4040
```

---

**Still stuck?** Check the full guide: `NGROK_SETUP.md`
