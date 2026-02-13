# 🚀 ngrok Multi-Tunnel Setup Guide

## Overview
Your project now has a professional multi-tunnel ngrok configuration that supports:
- **API** (port 4000) - Backend GraphQL
- **Metro Customer** (port 8082) - Customer mobile app  
- **Metro Driver** (port 8083) - Driver mobile app

## Architecture Decision: Expo vs ngrok for Metro

### **RECOMMENDED: Use Expo's Built-in Tunneling (No ngrok needed for Metro)**
✅ **Pros:**
- Expo Go handles tunneling automatically
- No additional configuration needed
- Works seamlessly with development builds
- Recommended by Expo team
- Free tier supports simultaneous development

✅ **Current Setup:** Your mobile apps already use `expo start`, which provides:
- LAN tunneling (local network, fastest)
- Tunnel mode (Expo's servers, works from anywhere)

### **Alternative: Use ngrok for Metro (Optional)**
- Only needed if you want public ngrok URLs for Metro
- Requires additional configuration
- Not typically necessary for local development
- Uses ngrok free tier quotas

## Quick Start

### 1. **Set up ngrok authtoken** (required for free tier limits)
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```
Get your token: https://dashboard.ngrok.com/get-started/your-authtoken

### 2. **Start all services** (recommended for first time)
```bash
# From VS Code: Run task "dev:all"
# Or from terminal:
npm run dev:all
```

### 3. **Run only what you need**
```bash
# Option A: Just API with ngrok (typical for local mobile testing)
npm run dev:api     # Terminal 1
ngrok start api     # Terminal 2 (only this tunnel)

# Option B: All services with all tunnels
npm run dev:all     # Starts API + Admin + Both Metro apps + All ngrok tunnels

# Option C: All services, manual ngrok (pause Metro ngrok if not needed)
npm run dev:all     # But edit ngrok.yml and comment out metro-customer/metro-driver
ngrok start api     # Then just start API tunnel
```

## Configuration Files

### `ngrok.yml` (Root Directory)
Defines all available tunnels. Modify to suit your needs:

```yaml
tunnels:
  api:           # API tunnel (always recommended)
  metro-customer: # Optional, comment out if not needed
  metro-driver:   # Optional, comment out if not needed
```

### `.env.ngrok` (Root Directory)
Configure domain names and authtoken:
```
NGROK_AUTHTOKEN=your_token_here
# Paid plan only:
# NGROK_DOMAIN_API=reserved-domain.ngrok-free.app
```

## Mobile App Configuration

### Current Setup in `.env` Files
Both `mobile-customer/.env` and `mobile-driver/.env` have:
```
EXPO_PUBLIC_API_URL=https://your-ngrok-url/graphql
```

### To Update API URL After ngrok Restarts
1. When you run `ngrok start --all`, check the ngrok dashboard for the new API URL
2. Update both `.env` files:
   ```bash
   EXPO_PUBLIC_API_URL=https://new-ngrok-url.ngrok-free.app/graphql
   ```
3. Restart Metro with Ctrl+R to reload environment

## Troubleshooting

### ERR_NGROK_334: Endpoint already online
**Cause:** Another ngrok session is still running
**Fix:** 
```bash
# Kill existing ngrok sessions
ngrok kill
# Or close all ngrok terminals and wait 5 seconds
# Then restart
```

### Metro keeps reconnecting
**Cause:** ngrok URL changed, check Expo tunnel mode
**Fix:**
- If using Expo tunnel: Use Expo Go app for fastest reconnection
- If using ngrok: Update `.env` with new URL and restart Metro

### Free tier limitations
- Single ngrok instance by default
- Multiple tunnels need authtoken (free)
- Bandwidth: 1GB/month
- Connection limit: 40 connections/minute

## Recommended Development Workflow

### For Local Mobile Testing (NO ngrok needed)
```bash
# Terminal 1: API
cd api && npm run dev

# Terminal 2: Mobile app
cd mobile-customer && npm start

# Terminal 3: Test device
>> Open Expo Go app
>> Scan QR code from Terminal 2
```
✅ Fast, no ngrok needed, works on local network

### For Remote Testing / Demo (ngrok helpful)
```bash
# Run all with ngrok
npm run dev:all

# Share ngrok URLs:
# - API: https://xxxxx-ngrok-free.app/graphql
# - Get from ngrok dashboard at http://localhost:4040
```

## Next Steps

1. **Get ngrok authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken
2. **Configure it locally**: `ngrok config add-authtoken YOUR_TOKEN`
3. **Choose your workflow** (see Recommended Development Workflow above)
4. **Start developing!** ✨

## Commands Reference

```bash
# Start everything
npm run dev:all

# Manual control
ngrok start api              # Just API tunnel
ngrok start metro-customer   # Just customer Metro tunnel
ngrok start api metro-driver # Specific tunnels
ngrok kill                   # Stop all tunnels

# Check tunnel status
# Open: http://localhost:4040
```

---

**Questions?** Check ngrok docs: https://ngrok.com/docs
