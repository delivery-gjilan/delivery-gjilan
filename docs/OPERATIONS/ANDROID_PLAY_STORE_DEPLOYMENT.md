# Android Play Store Deployment Plan

<!-- MDS:O16b | Domain: Operations | Updated: 2026-04-02 -->
<!-- Depends-On: O15, O7, M8, FF3 -->
<!-- Depended-By: O15 -->
<!-- Nav: iOS counterpart → O15 (APP_STORE_DEPLOYMENT.md). Driver navigation migration → FF3 (CUSTOM_NAVIGATION.md). Environments & secrets → O7 (ENVIRONMENTS_AND_RELEASES.md). -->

> Covers all three Android submissions: **Zipp Go** (Customer), **Zipp Driver**, and **Zipp Business**.
> Phases must be completed in order — Phases 1–3 are hard blockers for any build or submission.

---

## App Registry

| App | Package ID | Play Console Status |
|-----|-----------|---------------------|
| Zipp Go (Customer) | `com.artshabani.mobilecustomer` | Not yet submitted |
| Zipp Driver | `com.zippdelivery.mobiledriver` | Not yet submitted |
| Zipp Business | `com.zippdelivery.mobilebusiness` | Not yet submitted |

---

## 🐛 Known Bug: Map Not Rendering on Android (Customer + Driver)

### Symptom
Maps fail to render on Android builds for `mobile-customer`. Possibly also affects `mobile-driver` navigation screen.

### Root Cause (mobile-customer)
`@rnmapbox/maps` SDK is hosted on a **private Mapbox Maven repository** that requires a secret download token (`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`) at EAS build time. `mobile-customer/eas.json` has no `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` in any build profile → Gradle silently fails to download the SDK → map is blank or crashes.

Additionally, `mobile-customer/app.json` declares `@rnmapbox/maps` as a bare string plugin with no version — the driver app explicitly pins `"RNMapboxMapsVersion": "11.11.0"`. Mismatched versions can cause native build failures.

### Fixes Required

**`mobile-customer/eas.json`** — add to `preview` and `production` `env` blocks:
```json
"RNMAPBOX_MAPS_DOWNLOAD_TOKEN": "sk.eyJ1IjoiYXJ0c2hhYmFuaTIwMDIiLCJhIjoiY21seDU4cm9mMG5paDNjczU3aTNnbjg4diJ9.7pJd_j8rviQ3yvmGZwCezw"
```

**`mobile-customer/app.json`** — replace bare plugin with version-pinned config:
```json
["@rnmapbox/maps", { "RNMapboxMapsVersion": "11.11.0" }]
```

### Root Cause (mobile-driver)
`mobile-driver` has the download token and version pin correctly, so `@rnmapbox/maps` (used in `map.tsx`) should work. The navigation screen uses `@badatgil/expo-mapbox-navigation` (local module in `modules/expo-mapbox-navigation/`), which wraps the Mapbox Navigation SDK — a separate dependency with its own Maven coordinates. Verify the EAS build log for Gradle download errors on this module after a production build.

---

## Phase 1 — Config Fixes (Blockers — do before any build)

### 1a. Add Android submit config to all three `eas.json` files

All three currently have `submit.production` with `ios` only. Add `android` section to each:

```json
"submit": {
  "production": {
    "ios": { ...existing... },
    "android": {
      "serviceAccountKeyPath": "./google-play-service-account.json",
      "track": "internal"
    }
  }
}
```

> The service account JSON is obtained from Google Play Console → Setup → API access → Create service account → grant "Release Manager" role → download key. Store key files outside the repo (or in `.gitignore`d paths) — do not commit them.

### 1b. Add `distribution: "store"` to `mobile-customer` production build

`mobile-customer/eas.json` `production` profile is missing `"distribution": "store"`. EAS will not produce an AAB without it.

### 1c. Confirm `mobile-business` production build produces AAB

`mobile-business/eas.json` `preview` forces `"buildType": "apk"`. The `production` profile has no `android` override, so it inherits EAS default (AAB for store distribution) — this is correct. Do not copy the `apk` override into production.

### 1d. Replace all ngrok URLs with the production API domain

**This is the most important blocker.** Every `eas.json` production `env` block across all three apps still points to ngrok:

| App | Current production `EXPO_PUBLIC_API_URL` |
|-----|----------------------------------------|
| mobile-customer | `https://898a-2a03-4b80-bb1f-3360-e9e2-e0b1-a86e-31e9.ngrok-free.app/graphql` |
| mobile-driver | `https://colloquial-deadra-cursorily.ngrok-free.dev/graphql` |
| mobile-business | `https://colloquial-deadra-cursorily.ngrok-free.dev` |

Replace all with your permanent production HTTPS domain before building.

### 1e. Fix map token for mobile-customer

See the [bug section above](#-known-bug-map-not-rendering-on-android-customer--driver).

---

## Phase 2 — Google Play Console Setup (per app)

Complete this for each of the three apps before submitting.

### 2a. Create app in Play Console
- New app → Android → Free → not a game
- App name: Zipp Go / Zipp Driver / Zipp Business

### 2b. Data Safety form (mandatory)
Play Store requires you to declare all data collected. For all three apps declare:

| Data type | Collected | Purpose |
|-----------|-----------|---------|
| Name | ✅ | Account, app functionality |
| Email | ✅ | Account |
| Phone number | ✅ | Account |
| Precise location | ✅ | App functionality (delivery address / driver tracking) |
| Device / other IDs | ✅ | Push notifications (FCM tokens) |
| Order history | ✅ | App functionality |
| App interactions | ✅ | Analytics (if enabled) |

For **Zipp Driver** specifically: flag background location collection and state that it is required for real-time delivery tracking (foreground service).

### 2c. App content questionnaire
- **Target audience**: 18+ (delivery app)
- **Ads**: No
- **Sensitive permissions**: Background location (Driver only) — provide written justification

### 2d. Store listing per app

| Field | Zipp Go | Zipp Driver | Zipp Business |
|-------|---------|-------------|---------------|
| Short description | ≤80 chars | ≤80 chars | ≤80 chars |
| Full description | ≤4000 chars | ≤4000 chars | ≤4000 chars |
| Icon | 512×512 PNG | 512×512 PNG | 512×512 PNG |
| Feature graphic | 1024×500 PNG | 1024×500 PNG | 1024×500 PNG |
| Phone screenshots | ≥2 required | ≥2 required | ≥2 required |
| Privacy policy URL | `legal/privacy.html` on Vercel | same | same |

> App Store copy drafts are in `docs/APP_STORE_COPY.md` — repurpose for Play Store descriptions.

### 2e. App signing
Enroll in **Play App Signing** for all three apps (Google manages the signing key). EAS handles this automatically when `distribution: "store"` is set and the AAB is uploaded via service account.

---

## Phase 3 — Build

Run from each app directory after Phase 1 is complete:

```bash
# Customer
cd mobile-customer
eas build --platform android --profile production

# Driver
cd mobile-driver
eas build --platform android --profile production

# Business
cd mobile-business
eas build --platform android --profile production
```

Monitor build logs in EAS dashboard. Watch for:
- Gradle Mapbox Maven auth failures (signals missing download token)
- `@badatgil/expo-mapbox-navigation` resolution errors in driver build
- Any missing Google Services JSON errors

---

## Phase 4 — Submit

After builds complete:

```bash
# Submit using latest completed build
eas submit --platform android --profile production --latest
```

EAS will use the `serviceAccountKeyPath` in `eas.json` to upload the AAB to the **internal testing** track in Play Console.

---

## Phase 5 — Internal Testing → Production Promotion

### Test on internal track first

| Test area | Customer | Driver | Business |
|-----------|----------|--------|----------|
| Login / auth flow | ✅ verify | ✅ verify | ✅ verify |
| Map renders | ✅ critical (was broken) | ✅ critical | n/a |
| Navigation view (turn-by-turn) | n/a | ✅ verify | n/a |
| Order creation → tracking | ✅ verify | ✅ verify | ✅ verify |
| Push notifications (FCM) | ✅ verify | ✅ verify | ✅ verify |
| Background location (Driver) | n/a | ✅ required | n/a |
| Account deletion | ✅ verify | ✅ verify | ✅ verify |

### Promote to production
Play Console → Testing → Internal testing → Promote release → Production → set rollout % (start at 20%).

---

## Readiness Matrix

| Item | Customer | Driver | Business |
|------|----------|--------|----------|
| Production API URL | ❌ ngrok | ❌ ngrok | ❌ ngrok |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | ❌ Missing | ✅ Present | n/a |
| Mapbox version pin in app.json | ❌ Not pinned | ✅ Pinned | n/a |
| `distribution: "store"` in production | ❌ Missing | ✅ Present | ✅ Present |
| Android submit config in eas.json | ❌ No android section | ❌ No android section | ❌ No android section |
| Google service account key | ❌ Not created | ❌ Not created | ❌ Not created |
| Data Safety form | ❌ Not filled | ❌ Not filled | ❌ Not filled |
| Store listing + screenshots | ❌ Not done | ❌ Not done | ❌ Not done |
| Privacy policy URL | ✅ Vercel | ✅ Vercel | ✅ Vercel |
| Account deletion | ✅ Done | ✅ Done | ✅ Done |
| `google-services.json` | ✅ Present | ✅ Present | ✅ Present |
| EAS projectId set | ✅ | ✅ | ✅ |

---

## Post-Approval

- Remove demo accounts from production DB (see `docs/APP_STORE_DEPLOYMENT.md` post-approval checklist — applies equally to Play Store)
- Rotate any review credentials used in Play Console review notes
- Keep `google-play-service-account.json` keys out of version control permanently
