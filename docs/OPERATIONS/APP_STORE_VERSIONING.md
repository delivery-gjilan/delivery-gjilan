# App Store Versioning & Deployment — Zipp Go (mobile-customer)

## Two Numbers, Two Jobs

| Number | Key in `app.json` | Example | Who manages it |
|---|---|---|---|
| **Version string** | `version` | `1.0.0` | You, manually |
| **Build number** | auto (EAS remote) | `42` | EAS, automatically |

Apple requires both. The build number must be strictly higher than the previous submission. The version string must match what you enter in App Store Connect.

---

## Build Number — Fully Automatic

Your `eas.json` is already configured correctly:

```json
"cli": { "appVersionSource": "remote" },
"build": {
  "production": { "autoIncrement": true }
}
```

Every time you run `eas build --profile production`, EAS increments the build number on its servers and embeds it in the binary. You never touch it.

---

## Version String — You Manage This

The `version` field in `mobile-customer/app.json` follows [semver](https://semver.org/): `MAJOR.MINOR.PATCH`.

**When to bump each part:**

| Change type | Example | Bump |
|---|---|---|
| Bug fix, small tweak | Fixed checkout crash | `1.0.0` → `1.0.1` |
| New feature, visible change | Added promo codes | `1.0.1` → `1.1.0` |
| Major redesign / breaking change | Full rebrand | `1.1.0` → `2.0.0` |

**Rule of thumb:** bump the version whenever you submit a new build to App Store Connect for review. If you submit two builds for the same version (e.g. you rejected and fixed something), keep the version the same and just let EAS increment the build number.

---

## Three Deployment Paths

### 1. OTA Update (fastest — no App Store review)
Use this for JS-only changes: UI tweaks, copy changes, bug fixes that don't touch native code.

```bash
eas update --channel production --message "Fix checkout bug"
```

- No version bump needed
- Users get the update silently in the background
- Takes effect on next app restart
- **Cannot** be used for: new permissions, new native modules, new app icons

### 2. App Store Submission (full review — 1–3 days)
Required for any native change. Bump `version` in `app.json` first.

```bash
# 1. Bump version in app.json  e.g. "1.0.0" → "1.0.1"
# 2. Build
eas build --profile production --platform ios
# 3. Submit to App Store
eas submit --profile production --platform ios
```

### 3. TestFlight (internal testing before going live)
Same build as production — just don't click "Release to App Store" in App Store Connect. Share the TestFlight link with testers instead.

---

## Practical Checklist Before Each App Store Submission

- [ ] Bump `version` in `mobile-customer/app.json` if this is a new user-facing release
- [ ] Ensure `mobile-customer/eas.json` production `env` points to the live API URL (not ngrok)
- [ ] Push any OTA updates to the `production` channel if needed: `eas update --channel production`
- [ ] Verify a demo/reviewer account exists and credentials are added in App Store Connect → App Review Information
- [ ] Confirm the production API is running and accessible (Railway deployment is live)

---

## Current Config Reference

| Setting | Value |
|---|---|
| App name | Zipp Go |
| Bundle ID | `com.artshabani.mobilecustomer` |
| EAS Project ID | `e5c04b16-6851-4fce-aa03-e4a183f0becf` |
| Apple Team ID | `87K8YXG5V8` |
| App Store Connect App ID | `6760239090` |
| OTA channel | `production` |
| Production API | `https://api-production-5008.up.railway.app/graphql` |
