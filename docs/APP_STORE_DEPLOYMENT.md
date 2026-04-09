<!-- MDS:O15 | Domain: Operations | Updated: 2026-04-09 -->
<!-- Depends-On: O7, O10, O19 -->
<!-- Depended-By: O19 -->
<!-- Nav: When app submission blockers or mobile release config changes, update this tracker first and keep it aligned with each app's app.json and eas.json. -->

# App Store Deployment Guide — Zipp Platform

> Single source of truth for getting all Zipp mobile apps through Apple App Store and Google Play review.
> Covers every known rejection risk, compliance gap, and the exact fixes needed.

---

## ✅ Completed / ⏭️ Skipped / ❌ Remaining

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Legal pages & in-app links | ✅ Done | `legal/` folder created, hosted on Vercel. Links in all 4 apps. |
| Phase 2 — Account deletion compliance | ✅ Done | Backend PII anonymization fixed. Delete button added to Driver + Business. |
| Phase 3 — Debug/dead UI cleanup | ✅ Done | Dead-end buttons hidden, Contact Support → `mailto:`, debug screen removed. |
| Phase 4 — app.json / eas.json config fixes | ✅ Done | `appleTeamId`, `ITSAppUsesNonExemptEncryption`, `runtimeVersion`, permissions deduped, EAS submit configs populated. |
| Phase 5 — Production API infrastructure | ⏭️ Partial | Customer production build points at Railway. Driver, Business, and Admin production EAS profiles still point at temporary tunnel URLs. |
| Phase 6 — Live Activities verification | ✅ Done | `NSSupportsLiveActivitiesFrequentUpdates: true` added. Manual checks remain (see Phase 6 section). |
| Phase 7 — App Store Connect metadata & screenshots | ⏭️ Skipped | Copy written in `docs/APP_STORE_COPY.md`. **Must complete before submission** — enter metadata in ASC, take screenshots, fill Privacy Nutrition Labels. |
| Phase 8 — Build, test & submit | ❌ Not started | Customer is blocked by Phase 7 plus final production validation. Driver, Business, and Admin are also blocked by Phase 5. |

---

## Post-Approval Cleanup Checklist

> Things that exist **only** to support Apple/Google review. Delete or disable them after approval is granted and the app is live.

### Demo Accounts (most important)
- [ ] **Delete the demo customer account** — go to Admin Panel → Users, find the account with "Demo / App Review" badge, delete it. This account triggers automatic order progression for any order it places; it must not remain in production.
- [ ] **Delete the demo driver account** — go to Admin Panel → Drivers, find the demo driver, delete it.
- [ ] **Remove `DEMO_DRIVER_ID` from `api/.env`** (or production environment variables) — this env var has no use after review.
- [ ] **Delete the demo business + owner account** (if created exclusively for review) — go to Admin Panel → Businesses.

### Code / Infrastructure
- [ ] **`DemoProgressionService.ts`** (`api/src/services/DemoProgressionService.ts`) — can be removed entirely. It is only called when `customer.isDemoAccount === true`, so removing demo accounts above is enough to neutralize it, but cleaning the file reduces attack surface.
- [ ] **`isDemoAccount` DB column** — optional long-term: `ALTER TABLE users DROP COLUMN is_demo_account;`. Only do this once the service code is also removed, otherwise runtime will error. Safe to leave indefinitely if you plan to re-use it for future review cycles.
- [ ] **`api/database/migrations/0002_add-is-demo-account-to-users.sql`** — keep for historical record (do not delete migration files).

### Legal / Placeholder Pages
- [ ] Verify `legal/` pages (Privacy Policy, Terms of Service) contain final, lawyer-reviewed text — not the placeholder copy. These are live on Vercel and public-facing.

### App Review Notes Credentials
- [ ] After app is live, **rotate the demo account passwords** used in App Review Notes in App Store Connect (ASC → App → App Review Information). Credentials submitted to Apple should not remain valid in production.

---

## Apps Overview

| App | Bundle ID (iOS) | Package (Android) | ASC App ID | EAS Project ID | Owner |
|---|---|---|---|---|---|
| **Zipp Go** (Customer) | `com.artshabani.mobilecustomer` | `com.artshabani.mobilecustomer` | `6760239090` | `e5c04b16-...` | `artshabani2002` |
| **Zipp Driver** | `com.zippdelivery.mobiledriver` | `com.zippdelivery.mobiledriver` | `6760439437` | `d813bf35-...` | `artshabani2002` |
| **Zipp Business** | `com.zippdelivery.mobilebusiness` | `com.zippdelivery.mobilebusiness` | `6760672459` | `dc536dcd-...` | `artshabani2002` |
| **Zipp Admin** | `com.zippdelivery.mobileadmin` | `com.zippdelivery.mobileadmin` | `6760673685` | `311a1600-...` | `artshabani2002` |

### Configuration Gap Matrix

| Config Key | Customer | Driver | Business | Admin |
|---|---|---|---|---|
| `appleTeamId` | ✅ `87K8YXG5V8` | ✅ `87K8YXG5V8` | ✅ `87K8YXG5V8` | ⚠️ Verify in config before first store build |
| `ascAppId` (eas.json submit) | ✅ | ✅ | ✅ | ✅ |
| `owner` (app.json) | ✅ | ✅ | ✅ | ✅ |
| `ITSAppUsesNonExemptEncryption` | ✅ | ✅ | ✅ | ✅ |
| `runtimeVersion` | ✅ policy | ✅ policy | ⚠️ Hardcoded `"1.0.0"` | ✅ policy |
| EAS submit config | ✅ Full | ✅ App ID + team ID | ✅ App ID + team ID | ✅ Full |
| `scheme` (deep linking) | ✅ | ✅ | ✅ | ✅ |
| EAS projectId | ✅ | ✅ | ✅ | ✅ |

### Verified Customer App State

- `mobile-customer/app.json` is App Store-ready on the core config surface: bundle ID, `appleTeamId`, Live Activities flags, `ITSAppUsesNonExemptEncryption`, `owner`, and `runtimeVersion` are set.
- `mobile-customer/eas.json` production is pointed at `https://api-production-5008.up.railway.app/graphql`, not a tunnel URL.
- Customer app UI already exposes Privacy Policy, Terms of Service, Contact Support, and Delete Account.
- Remaining customer work is now mostly App Store Connect operations plus final production validation.
- Exact App Store Connect field selections for the customer app live in `docs/OPERATIONS/APP_STORE_CONNECT_CUSTOMER.md`.

---

## REJECTION RISK MATRIX

### Priority 1 — Hard Rejections (Apple WILL reject)

| # | Risk | App(s) | File(s) | What To Do |
|---|---|---|---|---|
| R1 | **No Privacy Policy URL** | All | No file exists | Host a privacy policy page. Link it in App Store Connect AND inside each app (profile/settings screen). Apple Guidelines 5.1.1(i) |
| R2 | **No Terms of Service URL** | All | No file exists | Host a ToS page. Link it inside each app. Required for apps with user accounts |
| R3 | **Account deletion doesn't fully anonymize PII** | All | `api/src/repositories/AuthRepository.ts:272-281` | Backend must clear all user PII and delete device tokens + saved addresses. Apple Guidelines 5.1.1(v) |
| R4 | **Account deletion button missing** | Driver, Business | `mobile-driver/app/(tabs)/profile.tsx`, `mobile-business/app/(tabs)/settings.tsx` | Driver profile has NO delete account option. Business settings has NO delete account option. The `deleteMyAccount` mutation exists in the GraphQL schema — just needs a UI button |
| R5 | **Dead-end buttons (no-op handlers)** | Customer, Admin | See list below | 9 buttons with `onPress={() => {}}` — Apple calls these "incomplete features" and will reject. Either implement or hide |
| R6 | **Debug screen in production** | Customer | `mobile-customer/app/(tabs)/profile.tsx:198`, `mobile-customer/app/debug-notifications.tsx` | "🐛 Debug Notifications" visible in profile. Remove or gate behind `__DEV__` |
| R7 | **Production URLs point to ngrok** | All | All `eas.json` files | Temporary tunnel URLs. App won't work after ngrok restarts. Replace with permanent HTTPS domain |
| R8 | **Missing `ITSAppUsesNonExemptEncryption`** | Business, Admin | `mobile-business/app.json` (no infoPlist), `mobile-admin/app.json` (not set) | Add `"ITSAppUsesNonExemptEncryption": false` to avoid export compliance hold on every build |
| R9 | **Age-rating mismatch if regulated goods are introduced later** | Customer | `mobile-customer/components/Categories.tsx` | Current customer categories do not expose alcohol. Keep App Store age rating at **4+** unless regulated goods or adult-only flows are added later. |
| R10 | **Missing `appleTeamId`** | Driver, Business, Admin | All three `app.json` files | Required for EAS to build and submit to App Store. Add `"appleTeamId": "87K8YXG5V8"` to the `ios` section |
| R11 | **Missing/broken EAS submit config** | Business, Admin | `mobile-business/eas.json` (empty submit), `mobile-admin/` (no eas.json) | Cannot run `eas submit` without proper config. Create eas.json for admin, add ascAppId to both |

### Dead-End Buttons (R5 details)

| File | Line | Button | Fix |
|---|---|---|---|
| `mobile-customer/app/(tabs)/profile.tsx` | 119 | Credits | Hide until implemented |
| `mobile-customer/app/(tabs)/profile.tsx` | 196 | Redeem Code | Hide until implemented |
| `mobile-customer/app/(tabs)/profile.tsx` | 197 | Contact Support | **Must implement** — open email or support URL |
| `mobile-customer/app/(tabs)/analytics.tsx` | 87 | Credits | Hide until implemented |
| `mobile-customer/app/(tabs)/analytics.tsx` | 88 | Buy Gift Card | Hide until implemented |
| `mobile-customer/app/(tabs)/analytics.tsx` | 162 | Redeem Code | Hide until implemented |
| `mobile-customer/app/(tabs)/analytics.tsx` | 163 | Contact Support | **Must implement** |
| `mobile-customer/app/(tabs)/analytics.tsx` | 173 | Account | Hide until implemented |
| `mobile-admin/app/(tabs)/more.tsx` | 128 | (no-op button) | Hide until implemented |

### Priority 2 — Likely Rejections / Review Delays

| # | Risk | App(s) | What To Do |
|---|---|---|---|
| R12 | **Background location without demo video** | Driver | Apple will ask why. Record a 30-60s video of a driver doing a delivery with app backgrounded. Upload in App Review notes |
| R13 | **No reviewer demo credentials** | All | Create a test account for each app. Put credentials in the App Review Notes field in ASC |
| R14 | **Push notifications unverified in production** | All | APNs certificates must be production-valid. Test push delivery against prod Firebase before submitting |
| R15 | **No working Contact Support anywhere** | All | Customer app has a button but it's a no-op. Driver/Business/Admin have nothing. Apple expects users to be able to get help |
| R16 | **Duplicate permissions in app.json** | Customer, Driver | Customer: Android location perms listed 8×. Driver: `UIBackgroundModes` has `location` and `audio` each listed twice. Won't always cause rejection but can trigger warnings |
| R17 | **Missing App Store Connect metadata** | All | Screenshots, descriptions, keywords, categories, age rating not yet prepared |
| R18 | **Privacy Nutrition Labels not filled** | All | ASC requires declaring data collected: email, name, phone, location, device tokens, order history, usage data |
| R19 | **No iOS Privacy Manifest** | All | No `PrivacyInfo.xcprivacy` found. Required since iOS 17 for apps using certain APIs. Expo SDK 51+ may auto-generate, but verify the built IPA contains one |

### Priority 3 — Polish & Future Risks

| # | Risk | App(s) | What To Do |
|---|---|---|---|
| R20 | **No Sign in with Apple** | All | Currently email/password only — this is fine. BUT if you later add Google/Facebook login, you MUST also add Sign in with Apple (Apple Guidelines 4.8) |
| R21 | **Guest mode edge cases** | Customer | App allows "Continue as guest". Verify guests can't reach broken states (deleting nonexistent account, accessing empty order history, etc.) |
| R22 | **Live Activities review scrutiny** | Customer | Live Activity widget is fully implemented. Be prepared to demo it — Apple may ask for a video. Ensure the widget extension is properly signed with the same team ID |
| R23 | **Mapbox tokens in app.json** | Driver | Public tokens (`pk.*`) are OK. Ensure the secret token (`sk.*`) in `eas.json` env vars never ends up in the app binary |
| R24 | **Inconsistent `runtimeVersion` format** | Admin | Uses hardcoded `"1.0.0"` while all others use `{ "policy": "appVersion" }`. This means OTA updates may not work correctly for admin |
| R25 | **`owner` field missing** | Business | `mobile-business/app.json` has no `owner`. EAS may not link to the correct account. Add `"owner": "artshabani2002"` or whichever account owns this project |
| R26 | **Driver + Customer share the same `scheme`** | Customer, Driver | Both use `"deliveryapp"`. Deep links may open the wrong app. Consider making Driver's scheme unique (e.g., `"zipp-driver"`) |

---

## DETAILED ACTION PLAN

### Phase 1: Legal Pages & In-App Links

**Depends on:** Nothing (do first)

**Goal:** Create and host Privacy Policy + Terms of Service pages, then link them from inside every app.

1. **Create Privacy Policy page** — must cover:
   - Data collected: email, name, phone, location (background for Driver), order history, device tokens, usage data
   - How data is used: order processing, delivery tracking, push notifications, analytics
   - Third parties: Firebase (Google), Mapbox, Expo/EAS, Agora (PTT voice)
   - Data retention and deletion rights (GDPR/CCPA)
   - Contact information

2. **Create Terms of Service page** — must cover:
   - Service description, user responsibilities
   - Payment and delivery terms
   - Account termination, liability limitations

3. **Host both** at permanent URLs (currently `https://delivery-gjilan.vercel.app/privacy` and `https://delivery-gjilan.vercel.app/terms`)

4. **Add in-app links** to both pages:
   - **Customer:** Add two `ProfileRow` items in `mobile-customer/app/(tabs)/profile.tsx`
   - **Driver:** Add links in `mobile-driver/app/(tabs)/profile.tsx`
   - **Business:** Render the existing `privacy_policy` and `terms` localization keys in `mobile-business/app/(tabs)/settings.tsx` (strings already exist in `en.json`/`al.json` but are not rendered anywhere)
   - **Admin:** Add links if submitting publicly

5. **Add URLs in App Store Connect** for each app (Privacy Policy URL + Support URL fields)

---

### Phase 2: Account Deletion Compliance

**Depends on:** Nothing (parallel with Phase 1)

**Goal:** Apple Guideline 5.1.1(v) — all apps that support account creation must support account deletion, and deletion must actually remove/anonymize personal data.

#### Backend Fix (`api/src/repositories/AuthRepository.ts:272`)

Current code:
```typescript
async deleteUser(userId: string): Promise<boolean> {
    const result = await this.db
        .update(users)
        .set({
            deletedAt: sql`CURRENT_TIMESTAMP`,
            email: sql`'deleted_' || ${users.id} || '@deleted'`,
        })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();
    return result.length > 0;
}
```

**Must also set:**
- `firstName` → `'Deleted'`
- `lastName` → `'User'`
- `phoneNumber` → `null`
- `address` → `null`

**Must also delete related records:**
- Device tokens (table: `deviceTokens` where `userId = X`)
- User addresses (table: `userAddresses` where `userId = X`)
- Optionally: anonymize customer name/phone on related orders (keep order records for business accounting but strip PII)

#### Frontend: Add Delete Account Button

- **Driver app:** Add "Delete Account" to `mobile-driver/app/(tabs)/profile.tsx` — use the existing `deleteMyAccount` mutation from GraphQL schema
- **Business app:** Add "Delete Account" to `mobile-business/app/(tabs)/settings.tsx` — same mutation
- **Customer app:** Already has the button ✅ (but has TypeScript errors on locale keys — fix the type definition)

---

### Phase 3: Remove Debug & Dead UI

**Depends on:** Nothing (parallel)

1. **Remove debug screen from customer app:**
   - Remove or wrap with `__DEV__` the `ProfileRow` at `mobile-customer/app/(tabs)/profile.tsx:198`
   - Either delete `mobile-customer/app/debug-notifications.tsx` or guard the route

2. **Fix or hide no-op buttons:**
   - `Contact Support` → **implement**: open `Linking.openURL('mailto:artshabani2002@gmail.com')` or a support webpage
   - `Credits` / `Redeem Code` / `Buy Gift Card` / `Account` → **hide** (`{false && <ProfileRow .../>}` or remove entirely)
   - Same cleanup in `analytics.tsx`

3. **Admin no-op button** at `mobile-admin/app/(tabs)/more.tsx:128` → hide

---

### Phase 4: app.json + eas.json Fixes

**Depends on:** Having an Apple Developer account + ASC app IDs for Business and Admin

#### 4a. Add missing `appleTeamId` to all apps

Add to the `ios` section of each `app.json`:

```json
"appleTeamId": "87K8YXG5V8"
```

- `mobile-driver/app.json` → add to `ios` object
- `mobile-business/app.json` → add to `ios` object
- `mobile-admin/app.json` → already has it? Verify. If not, add it

#### 4b. Add missing `ITSAppUsesNonExemptEncryption`

- **Business:** Add entire `infoPlist` section to `mobile-business/app.json`:
  ```json
  "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
  }
  ```
- **Admin:** Add `"ITSAppUsesNonExemptEncryption": false` to existing `infoPlist` in `mobile-admin/app.json`

#### 4c. Add missing `owner` field

- **Business:** Add `"owner": "artshabani2002"` to `mobile-business/app.json` (use same account as customer/admin)

#### 4d. Fix `runtimeVersion` in Admin

Change from `"runtimeVersion": "1.0.0"` to:
```json
"runtimeVersion": { "policy": "appVersion" }
```

#### 4e. Deduplicate permissions

- **Customer `app.json`:**
  - Android `permissions`: reduce from 16 duplicate entries to just `["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]`
  - iOS `UIBackgroundModes`: reduce from `["remote-notification", "remote-notification", "remote-notification", "remote-notification"]` to `["remote-notification"]`

- **Driver `app.json`:**
  - iOS `UIBackgroundModes`: reduce from `["location", "audio", "location", "audio"]` to `["location", "audio"]`
  - Android `permissions`: deduplicate (remove duplicate `ACCESS_*` entries, keep only fully-qualified names)

#### 4f. Fix/create EAS submit configs

- **Business** — update `mobile-business/eas.json`:
  ```json
  "submit": {
      "production": {
          "ios": {
              "ascAppId": "<CREATE IN ASC AND PUT ID HERE>",
              "appleTeamId": "87K8YXG5V8"
          }
      }
  }
  ```

- **Admin** — the root `eas.json` currently exists but is very basic. If admin needs its own submit, create a proper `eas.json` in `mobile-admin/` or update the root. Add:
  ```json
  "submit": {
      "production": {
          "ios": {
              "ascAppId": "<CREATE IN ASC AND PUT ID HERE>",
              "appleTeamId": "87K8YXG5V8"
          }
      }
  }
  ```

- **Driver** — add `appleTeamId` to existing submit config in `mobile-driver/eas.json`

#### 4g. Consider unique scheme for Driver

Change Driver `scheme` from `"deliveryapp"` to `"zipp-driver"` to avoid deep link conflicts with Customer app.

---

### Phase 5: Production Infrastructure

**Depends on:** Having a production server ready

1. **Set up production API** with permanent HTTPS domain (e.g., `https://api.zippdelivery.com/graphql`)

2. **Update all `eas.json` production envs:**

| File | Key | New Value |
|---|---|---|
| `mobile-customer/eas.json` | `EXPO_PUBLIC_API_URL` | `https://api.zippdelivery.com/graphql` |
| `mobile-driver/eas.json` | `EXPO_PUBLIC_API_URL` | `https://api.zippdelivery.com/graphql` |
| `mobile-business/eas.json` | `EXPO_PUBLIC_API_URL` | `https://api.zippdelivery.com` |
| `mobile-business/eas.json` | `EXPO_PUBLIC_WS_URL` | `wss://api.zippdelivery.com` |
| `mobile-admin/eas.json` | Add production env | (currently not set at all) |

3. **Verify Firebase production project:**
   - `google-services.json` and `GoogleService-Info.plist` in each app should be from the production Firebase project
   - APNs auth key uploaded to Firebase Console → Project Settings → Cloud Messaging
   - Test a push notification end-to-end against production

4. **Verify Mapbox tokens** have production-level rate limits

---

### Phase 6: Live Activities Verification (Customer App)

**Status:** Fully implemented ✅ — but needs review before submission.

**What exists:**
- `NSSupportsLiveActivities: true` in `app.json` ✅
- Plugin: `plugins/patch-live-activities.js` ✅
- Plugin: `plugins/with-live-activity-extension.js` ✅
- Extension target: `ios/DeliveryLiveActivityExtension/` ✅
- Swift widget: `DeliveryActivityAttributes.swift` + `DeliveryLiveActivityWidget.swift` ✅
- Backend: `registerLiveActivityToken` mutation ✅

**Pre-submission checks:**
- [ ] Extension target is signed with same Team ID (`87K8YXG5V8`) and matching provisioning profile
- [ ] Live Activity push token registration works in production build (not just dev)
- [ ] Widget displays correctly for all order status states (8 states defined in Swift)
- [ ] Activity properly dismisses when order is delivered/cancelled
- [ ] Prepare a screen recording showing a Live Activity updating during a real order — Apple may request this

**Apple Review note for Live Activities:**
> "Our app uses Live Activities to show real-time order tracking on the lock screen. The widget displays: driver name, estimated time, and order status updates. The activity starts when an order is placed and ends when it's delivered or cancelled."

---

### Phase 7: App Store Connect Setup

**Depends on:** Phases 1 (legal pages) and 5 (production infra)

For **each app** being submitted:

1. **Create app in ASC** (if not done):
   - Customer: ✅ already exists (ASC ID `6760239090`)
   - Driver: ✅ already exists (ASC ID `6760439437`)
   - Business: ❌ create it → get ASC app ID → put in eas.json
   - Admin: ❌ create it OR decide on TestFlight-only distribution

2. **Fill metadata for each app:**
   - App name (e.g., "Zipp Go", "Zipp Driver", "Zipp Business")
   - Subtitle / short description
   - Full description (max 4000 chars)
   - Keywords (iOS only, max 100 chars)
   - Category: **Food & Drink** (Customer), **Business** (Driver/Business/Admin)
   - Age rating: **4+**

3. **Upload screenshots:**
   - iPhone 6.7" (1290 × 2796) — required
   - iPhone 6.5" (1284 × 2778) — required
   - iPad 12.9" (2048 × 2732) — all apps have `supportsTablet: true`

4. **Privacy Nutrition Labels** — declare:
   - **Data collected:** Name, Email, Phone Number, Precise Location, Coarse Location, Device ID (push tokens), Purchase History (orders), Usage Data
   - **Data linked to identity:** Name, Email, Phone Number, Purchase History
   - **Data used for tracking:** None (unless you add analytics SDKs)

5. **App Review Information:**
   - Demo credentials for each app
   - Contact info for reviewer questions
   - Notes explaining background location (Driver), Live Activities (Customer), and demo auto-progression for review accounts
   - Video attachments if applicable

   Use the prepared text in `docs/APP_STORE_COPY.md` under **App Review Notes** and paste it into App Store Connect → Your App → App Review → Notes for Review.

---

### Phase 8: Build, Test, Submit

**Depends on:** All previous phases complete

#### Pre-build verification checklist

- [ ] All `eas.json` production URLs point to production domain (NOT ngrok)
- [ ] All `app.json` have `appleTeamId: "87K8YXG5V8"`
- [ ] All `app.json` have `ITSAppUsesNonExemptEncryption: false`
- [ ] All `eas.json` have valid `submit.production.ios` config with `ascAppId`
- [ ] Privacy policy + Terms URLs are live and accessible
- [ ] Account deletion works end-to-end (test: create account → delete → verify PII cleared in DB)
- [ ] No debug screens visible in production
- [ ] No dead-end buttons
- [ ] Push notifications work against production Firebase
- [ ] Live Activities work in production build
- [ ] Contact Support opens email or support page
- [ ] Privacy/Terms links open correctly
- [ ] Guest mode doesn't crash on restricted screens

#### Build commands

```bash
# Preview builds (internal testing)
cd mobile-customer && eas build --platform ios --profile preview
cd mobile-driver && eas build --platform ios --profile preview
cd mobile-business && eas build --platform ios --profile preview

# Production builds
cd mobile-customer && eas build --platform ios --profile production
cd mobile-driver && eas build --platform ios --profile production
cd mobile-business && eas build --platform ios --profile production

# Android
cd mobile-customer && eas build --platform android --profile production
cd mobile-driver && eas build --platform android --profile production
cd mobile-business && eas build --platform android --profile production

# Submit iOS
cd mobile-customer && eas submit --platform ios --profile production
cd mobile-driver && eas submit --platform ios --profile production
cd mobile-business && eas submit --platform ios --profile production
```

#### Submission order

1. **Zipp Go (Customer)** — primary user-facing app, submit first
2. **Zipp Driver** — needed for operations, submit second
3. **Zipp Business** — for merchant onboarding
4. **Zipp Admin** — last; consider TestFlight/internal distribution only

---

## App Review Notes Template

```
Demo Account:
Email: demo@zippdelivery.com
Password: [create a test account and put password here]

This is a food delivery application operating in Gjilan, Kosovo.

[FOR CUSTOMER APP (Zipp Go):]
- Live Activities: The app uses Live Activities to display real-time
  order tracking on the lock screen during active deliveries. The
  widget shows driver name, estimated time, and delivery status.
- Location: Used only to set the delivery address (When In Use).
- Push Notifications: Used for order status updates.

[FOR DRIVER APP (Zipp Driver):]
- Background Location: Required to track driver position in real-time
  while completing deliveries. Customers see the driver's live position
  on a map. A demo video is attached showing this functionality with
  the app in the background.
- Camera: Used to take delivery proof photos.
- Microphone: Used for push-to-talk voice communication with dispatch.
- Push Notifications: Used for new order alerts.

[FOR BUSINESS APP (Zipp Business):]
- Push Notifications: Used for incoming order alerts.
- No special permissions required.

Privacy Policy: https://[your-domain]/privacy
Terms of Service: https://[your-domain]/terms
Support: artshabani2002@gmail.com
```

---

## Notification Testing Plan (Before Submission)

The customer app has a debug screen (`debug-notifications.tsx`) that tests:
- Expo push token retrieval
- Firebase FCM token
- APNs token (iOS)
- Token registration with backend
- Sending test push

**Use this to verify before submission, then REMOVE it:**

1. Build `preview` profile pointing at production API
2. Open Debug Notifications screen
3. Verify all tokens register successfully
4. Send a test push from the admin panel
5. Confirm notification arrives on device
6. Remove the debug screen link from profile.tsx
7. Build `production` profile

---

## Post-Submission

- [ ] Monitor App Store Connect for review status (usually 24-48 hours)
- [ ] Respond to reviewer rejections within 24 hours
- [ ] Enable phased release (recommended for v1.0)
- [ ] Set up `eas update` for OTA JS updates on `production` channel
- [ ] Monitor Firebase Crashlytics for post-launch crashes
- [ ] Monitor push notification delivery rates in Firebase Console

---

## Version Management

All apps use `appVersionSource: "remote"` in EAS with `autoIncrement: true` for production:
- Build number auto-increments per `eas build --profile production`
- App version `1.0.0` is in `app.json` — bump manually for new releases
- For JS-only fixes: `eas update --channel production` (no store re-review)
- For native changes: full build + store resubmission required

---

## Key Accounts

| Service | Account |
|---|---|
| Apple Developer / ASC | `artshabani2002@icloud.com` |
| Apple Team ID | `87K8YXG5V8` |
| Expo (EAS) Owner | `artshabani2002` / `edonramadani` |

---

## Age Rating Decision

`mobile-customer/components/Categories.tsx` currently exposes Restaurants, Groceries, Health & Wellbeing, and Beauty & Care only.

- Set the customer app age rating to **4+** in App Store Connect.
- Revisit the rating only if you later add regulated goods or adult-only flows.



---- also I think I should have the button to stop notifications and stuff on all apps ?