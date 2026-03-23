# App Store Deployment Guide — Zipp Platform

> Comprehensive checklist and steps for deploying all Zipp mobile apps to the Apple App Store and Google Play Store.

---

## Apps Overview

| App | Bundle ID (iOS) | Package (Android) | ASC App ID | EAS Project ID |
|---|---|---|---|---|
| **Zipp Go** (Customer) | `com.artshabani.mobilecustomer` | `com.artshabani.mobilecustomer` | `6760239090` | `e5c04b16-6851-4fce-aa03-e4a183f0becf` |
| **Zipp Driver** | `com.zippdelivery.mobiledriver` | `com.zippdelivery.mobiledriver` | `6760439437` | `1c06f250-74dc-4a5d-855c-f53e97df8c2e` |
| **Zipp Business** | `com.zippdelivery.mobilebusiness` | `com.zippdelivery.mobilebusiness` | — (not set) | `dc536dcd-100f-4271-82f4-2e8fcbdbb345` |
| **Zipp Admin** | `com.zippdelivery.mobileadmin` | `com.zippdelivery.mobileadmin` | — (not set) | `311a1600-6dc4-4a4d-9772-9aa6af6edd43` |

---

## Pre-Deployment Checklist

### 1. Apple Developer Account & App Store Connect

- [ ] Apple Developer Program membership is active (Team ID: `87K8YXG5V8`)
- [ ] Each app is created in App Store Connect with the correct bundle ID
- [ ] App Store Connect app IDs are set in `eas.json` → `submit.production.ios.ascAppId`
  - **Zipp Go**: ✅ `6760239090`
  - **Zipp Driver**: ✅ `6760439437`
  - **Zipp Business**: ❌ Needs ASC app ID
  - **Zipp Admin**: ❌ Needs ASC app ID
- [ ] App privacy details filled out in App Store Connect for each app
- [ ] App category selected (e.g., Food & Drink for Customer, Business for Business/Admin)

### 2. Google Play Console

- [ ] Google Play Developer account is active
- [ ] Each app is created in Google Play Console with the correct package name
- [ ] Upload key / signing key configured (Google Play App Signing recommended)
- [ ] Store listing draft completed for each app

### 3. App Metadata (Both Stores)

For **each** app, prepare:

- [ ] App name (30 chars max on iOS)
- [ ] Subtitle / short description (30 chars iOS / 80 chars Android)
- [ ] Full description (4000 chars max)
- [ ] Keywords (iOS only, 100 chars)
- [ ] Screenshots:
  - iPhone 6.7" (1290 × 2796) — required
  - iPhone 6.5" (1284 × 2778) — required
  - iPad 12.9" (2048 × 2732) — if `supportsTablet: true`
  - Android: phone (16:9), 7" tablet, 10" tablet
- [ ] App icon (1024 × 1024, no alpha, no rounded corners for iOS)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL (optional)

### 4. Permissions & Usage Descriptions (iOS)

Apple requires specific, user-friendly explanations for every permission. Current status:

| App | Permission | Description | Status |
|---|---|---|---|
| **Zipp Go** | Location (When In Use) | "We use your location to set the delivery address." | ✅ |
| **Zipp Driver** | Camera | "Allow camera access to take and upload delivery proof photos when required." | ✅ |
| **Zipp Driver** | Microphone | "Allow microphone access to receive live push-to-talk voice updates from dispatch." | ✅ |
| **Zipp Driver** | Location (Always) | "We need your location even when the app is closed to track deliveries." | ✅ |
| **Zipp Driver** | Background Location | "We need your location in the background to track deliveries in real-time." | ✅ |
| **Zipp Admin** | Location (When In Use) | "We use your location to center the map on your position." | ✅ |

> **Note:** All apps have `ITSAppUsesNonExemptEncryption: false` where needed. This prevents the export compliance questionnaire on each submission.

### 5. Production API URL

**CRITICAL:** All `eas.json` production environments currently point to **ngrok URLs**. These are temporary tunnel URLs and will break when ngrok restarts.

Before submitting to stores, update ALL `eas.json` production env vars to your **permanent production API URL**:

| App | Current Production URL | Action Needed |
|---|---|---|
| **Zipp Go** | `https://898a-...ngrok-free.app/graphql` | ❌ Replace with production URL |
| **Zipp Driver** | `https://colloquial-deadra-cursorily.ngrok-free.dev/graphql` | ❌ Replace with production URL |
| **Zipp Business** | `https://colloquial-deadra-cursorily.ngrok-free.dev` | ❌ Replace with production URL |
| **Zipp Admin** | Not set in eas.json | ⚠️ Add production URL |

### 6. Signing & Certificates

#### iOS
- [ ] Apple Distribution certificate created (or let EAS manage it)
- [ ] Provisioning profiles for each bundle ID (App Store type)
- [ ] Push notification certificates (APNs) — needed for Firebase Cloud Messaging
- [ ] If using EAS managed credentials: run `eas credentials` to verify

#### Android
- [ ] Upload keystore generated (or use Google Play App Signing)
- [ ] `google-services.json` is the **production** version for each app
- [ ] SHA-256 fingerprint registered in Firebase for each app

### 7. App-Specific Considerations

#### Zipp Go (Customer)
- [ ] Live Activities extension is included (`plugins/patch-live-activities`, `plugins/with-live-activity-extension`)
- [ ] `NSSupportsLiveActivities: true` is set ✅
- [ ] Apple Team ID is set: `87K8YXG5V8` ✅
- [ ] Clean up duplicate permissions in `app.json` (location permissions listed 8× each in android)
- [ ] Clean up duplicate `UIBackgroundModes` entries (remote-notification listed 4×)

#### Zipp Driver
- [ ] Background location mode properly declared ✅
- [ ] Mapbox Navigation SDK properly configured ✅
- [ ] Clean up duplicate `UIBackgroundModes` entries (location and audio each listed twice)
- [ ] App review may require a demo video showing background location usage

#### Zipp Business
- [ ] No iOS `infoPlist` section — add `ITSAppUsesNonExemptEncryption: false` to skip export compliance
- [ ] Submit configuration not set in `eas.json` — add `ascAppId`

#### Zipp Admin
- [ ] Likely for internal use only — consider Apple Business Manager / TestFlight distribution instead of public App Store
- [ ] If public: add ASC app ID to `eas.json`

---

## Build Commands

### Production Build (iOS)

```bash
# From each app directory:
cd mobile-customer && eas build --platform ios --profile production
cd mobile-driver && eas build --platform ios --profile production
cd mobile-business && eas build --platform ios --profile production
cd mobile-admin && eas build --platform ios --profile production
```

### Production Build (Android)

```bash
cd mobile-customer && eas build --platform android --profile production
cd mobile-driver && eas build --platform android --profile production
cd mobile-business && eas build --platform android --profile production
cd mobile-admin && eas build --platform android --profile production
```

### Submit to App Store

```bash
# iOS — submits the latest production build to App Store Connect
eas submit --platform ios --profile production

# Android — submits the latest production build to Google Play
eas submit --platform android --profile production
```

---

## Deployment Order (Recommended)

1. **Set up production infrastructure** — permanent API URL, production database, SSL
2. **Update all `eas.json` files** — replace ngrok URLs with production URL
3. **Clean up `app.json` files** — fix duplicate permissions, add missing fields
4. **Build & test with `preview` profile** — internal testing first
5. **Build `production` profile** — for each app
6. **Submit Zipp Go (Customer)** first — this is the primary user-facing app
7. **Submit Zipp Driver** — needed for operations
8. **Submit Zipp Business** — for merchant onboarding
9. **Submit Zipp Admin** — last, consider internal distribution

---

## App Review Tips

- **Background Location (Zipp Driver):** Apple will ask why you need always-on location. Prepare a short video showing a driver completing a delivery with the app in the background. Include this in the App Review notes.
- **Login Credentials:** Provide demo account credentials in the review notes so Apple reviewers can test the app.
- **Push Notifications:** Make sure APNs certificates are valid and push notifications work in production.
- **Live Activities (Zipp Go):** Be prepared to demonstrate the order tracking Live Activity widget.
- **Mapbox / Maps:** Ensure map tiles load correctly with production API keys.
- **Privacy Nutrition Labels:** Accurately declare data collection for each app in App Store Connect.

---

## Post-Submission

- [ ] Monitor App Store Connect for review status
- [ ] Respond promptly to any reviewer rejection notes
- [ ] Once approved, enable phased release (recommended) or release immediately
- [ ] Set up EAS Update (`eas update`) for OTA JavaScript updates on the `production` channel
- [ ] Monitor crash reports via Firebase Crashlytics

---

## Version Management

All apps use `appVersionSource: "remote"` in EAS, with `autoIncrement: true` for production builds. This means:
- EAS automatically increments the build number on each production build
- App version (`1.0.0`) is set in `app.json` — bump manually for new releases
- For minor fixes, use `eas update` (OTA) instead of a full store submission

---

## Quick Reference: Key Accounts

| Service | Account |
|---|---|
| Apple Developer / ASC | `artshabani2002@icloud.com` |
| Expo (EAS) Owner | `artshabani2002` / `edonramadani` |
| Apple Team ID | `87K8YXG5V8` |
