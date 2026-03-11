# Push Notifications And Live Activity Rollout Guide

This document explains how push notifications are currently implemented in `mobile-customer`, what parts are reusable for the other mobile apps, and what is still missing for the iOS Dynamic Island / Live Activities flow to work correctly end to end.

It is based on the current code in the repository, not on earlier implementation notes.

## Executive summary

Current state by app:

| App | Standard push config | Token registration logic | Firebase token plumbing | Live Activity / Dynamic Island |
|---|---|---|---|---|
| `mobile-customer` | Yes | Yes | Yes | Partial, native extension still missing |
| `mobile-driver` | Yes | Yes | Likely yes, already wired for push | No |
| `mobile-business` | Plugin only | No | No | No |
| `mobile-admin` | Plugin only | No | No | No |

The most important conclusion:

- `mobile-customer` has a real push implementation.
- `mobile-customer` also has a JS hook for Live Activities, backend token registration, and config flags.
- But the repository does not currently contain the required iOS Widget Extension / ActivityKit UI target source files, so the Dynamic Island implementation is not complete at the native layer.

## What exists today in `mobile-customer`

## 1. App config

Main file: `mobile-customer/app.json`

What is already configured:

- iOS:
  - `NSSupportsLiveActivities: true`
  - `UIBackgroundModes: ["remote-notification"]`
  - `bundleIdentifier`
  - `googleServicesFile: ./GoogleService-Info.plist`
- Android:
  - `googleServicesFile: ./google-services.json`
  - location permissions
- Plugins:
  - `expo-notifications`
  - `@react-native-firebase/app`
  - custom Firebase modular-header patch plugin
  - custom `patch-live-activities` plugin

Important detail:

- `mobile-customer` uses Firebase directly for push token retrieval, not Expo push tokens.
- This is the correct approach for this backend because the API sends through Firebase Admin and expects FCM tokens.

## 2. Standard push notification implementation

Main file: `mobile-customer/hooks/useNotifications.ts`

What the hook does:

1. sets foreground notification behavior with `expo-notifications`
2. defines interactive categories:
   - `order-on-the-way`
   - `order-delivered`
   - `order-cancelled`
3. requests notification permission
4. obtains an FCM token through `@react-native-firebase/messaging`
5. validates that the token is really an FCM token and not a raw APNs token
6. registers that token with the API via GraphQL
7. listens for token refresh and re-registers
8. listens for foreground notifications and shows an in-app toast
9. listens for notification taps and routes the user to the right screen
10. unregisters the device token on logout

GraphQL operations used:

- `REGISTER_DEVICE_TOKEN`
- `UNREGISTER_DEVICE_TOKEN`

Main app bootstrap:

- `mobile-customer/app/_layout.tsx` calls `useNotifications()` inside the app shell once Apollo and auth are available.

## 3. Debug screen for push notifications

Main file: `mobile-customer/app/debug-notifications.tsx`

This is useful because it gives you a concrete manual verification flow:

- check permissions
- request permissions
- fetch FCM token
- register token with backend
- send local test notification
- call backend debug route for test push

If the other apps get push support, creating a similar debug screen is worth keeping.

## 4. Live Activity / Dynamic Island JS layer

Main file: `mobile-customer/hooks/useLiveActivity.ts`

What it already does:

1. checks that the platform is iOS and intended OS version is supported
2. starts a Live Activity through `react-native-live-activities`
3. attempts to get a Live Activity push token from the native module
4. registers that token with the backend using `REGISTER_LIVE_ACTIVITY_TOKEN`
5. updates the activity state locally
6. ends the activity when the order completes or the component unmounts

Order screen integration:

- `mobile-customer/modules/orders/components/OrderDetails.tsx`

Current behavior there:

- creates the hook
- starts Live Activity when order becomes `OUT_FOR_DELIVERY`
- updates activity while order is `PREPARING`, `READY`, or `OUT_FOR_DELIVERY`
- ends activity when order is delivered or cancelled

## 5. Backend support already present

The backend side is largely ready.

Files involved:

- `api/src/models/Notification/resolvers/Mutation/registerDeviceToken.ts`
- `api/src/models/Notification/resolvers/Mutation/unregisterDeviceToken.ts`
- `api/src/models/Notification/resolvers/Mutation/registerLiveActivityToken.ts`
- `api/src/services/NotificationService.ts`
- `api/src/services/orderNotifications.ts`

What the API already supports:

- saving standard device tokens by app type and platform
- saving Live Activity tokens per order and activity instance
- sending normal push through Firebase Admin
- sending Live Activity APNs updates with `apns-push-type: liveactivity`
- ending Live Activities when orders complete

So the backend is not the main blocker right now.

## What is missing for Dynamic Island to actually be complete

This is the key gap.

The repo currently does not contain any checked-in native iOS Widget Extension / ActivityKit UI files for `mobile-customer`.

Specifically, the repo does not currently contain files like:

- `mobile-customer/ios/...` Widget extension sources
- `ActivityAttributes` Swift types
- WidgetKit extension code that renders the Live Activity UI
- an extension target committed to the iOS project

That matters because Live Activities on iOS are not just a JS hook plus entitlements. You also need a native Widget Extension target that defines:

- the Activity attributes
- the Activity content state
- the Lock Screen UI
- the Dynamic Island UI

The existing `DYNAMIC_ISLAND_IMPLEMENTATION.md` mentions files such as:

- `ios/modules/DeliveryActivityAttributes.swift`
- `ios/modules/DeliveryLiveActivityWidget.swift`

but those files are not present in the current repository state.

## Missing native task to add

This is the task that should be explicitly tracked:

### Required task: add the iOS Widget Extension / Live Activity extension target

You need to add a native iOS Widget Extension target for `mobile-customer` that includes:

1. `ActivityAttributes` Swift model for the delivery activity
2. WidgetKit extension entry point
3. Dynamic Island UI and Lock Screen UI for the activity
4. correct target entitlements and signing
5. inclusion in the generated iOS project after prebuild

Without that extension target, the JS `react-native-live-activities` hook is only part of the story and the Dynamic Island flow is not fully grounded in native code.

## Secondary risks and caveats

## 1. Existing dynamic-island documentation is ahead of the code

The current `DYNAMIC_ISLAND_IMPLEMENTATION.md` should be treated as aspirational in parts, not fully verified.

It describes native files and a widget setup that are not currently checked into the repository.

## 2. `patch-live-activities` only patches the podspec

File: `mobile-customer/plugins/patch-live-activities.js`

This plugin helps the `react-native-live-activities` package build against the current React Native toolchain by removing old pod dependencies.

It does not create the widget extension.

So this patch is a compatibility workaround, not the missing native implementation.

## 3. `fix-firebase-modular-headers` is customer-specific and target-name-sensitive

File: `mobile-customer/plugins/fix-firebase-modular-headers.js`

This plugin patches the Podfile for the iOS target named `mobilecustomer`.

If another app uses a different native target name, this plugin cannot just be copied unchanged. The target matcher will need to be updated.

## 4. Standard push and Live Activities are separate concerns

Do not merge them mentally.

Standard push requires:

- permission
- FCM token retrieval
- backend device token registration
- sending via Firebase Admin

Live Activities additionally require:

- iOS 16.2+
- ActivityKit / WidgetKit native extension
- Live Activity push token registration
- APNs liveactivity pushes from the backend

An app can support standard push without supporting Live Activities.

## How to roll standard push notifications out to other apps

This is the reusable path for `mobile-business` and `mobile-admin`, and mostly already exists in `mobile-driver`.

## Required pieces for each app

### 1. Config in `app.json`

Minimum:

- `expo-notifications` plugin
- `defaultChannel` for Android
- iOS `googleServicesFile` if using Firebase Messaging on iOS
- Android `googleServicesFile`
- `enableBackgroundRemoteNotifications: true` if background remote pushes are needed

### 2. Firebase dependencies

If the app is going to register FCM tokens directly like `mobile-customer`, add:

- `@react-native-firebase/app`
- `@react-native-firebase/messaging`

Right now, `mobile-business` and `mobile-admin` do not appear to have this wiring. They currently only have the Expo notifications plugin/dependency layer.

### 3. Native config files

Per app, add valid Firebase files:

- `GoogleService-Info.plist`
- `google-services.json`

These must match the app’s bundle identifier / package name.

### 4. Runtime notification hook

Reuse the customer pattern:

- request permissions
- get FCM token via Firebase Messaging
- register token with backend using `REGISTER_DEVICE_TOKEN`
- listen for token refresh and re-register
- unregister token on logout
- optionally add categories and navigation behavior per app

### 5. App bootstrap

Call the notification hook once in the root layout after auth and Apollo are initialized.

### 6. Backend app type

The registration mutation includes `appType`, so each app must register itself with the correct backend app type value.

Examples:

- `CUSTOMER`
- `DRIVER`
- whichever types the API schema supports for business/admin

Verify the backend enum before wiring new apps.

## Recommended rollout order

### `mobile-driver`

This app already looks closest to complete for standard push.

It already has:

- `expo-notifications` plugin
- `useNotifications()` in root layout
- notification GraphQL operations
- Google services config in `app.json`

Action for driver:

- verify end-to-end token registration and test pushes on real devices
- document whether it is already using Firebase Messaging directly or still needs parity cleanup with customer

### `mobile-business`

This app currently looks like config-first only.

It has:

- `expo-notifications` plugin
- `expo-notifications` package

It does not appear to have:

- token registration hook
- Firebase Messaging token retrieval
- root-layout bootstrap for push registration

Action for business:

- add customer-style push hook adapted for business routes and actions
- add Firebase native files and dependencies if missing
- register with backend using the business app type

### `mobile-admin`

This app is also plugin-first only.

It has:

- `expo-notifications` plugin

It does not appear to have:

- token registration runtime hook
- Firebase Messaging integration
- backend registration flow in the app shell

Action for admin:

- add a push registration hook
- wire backend token registration
- add test notification screen if admins will rely on alerts heavily

## Should Live Activities be copied to other apps?

Probably not by default.

Live Activities make the most sense for `mobile-customer` because the customer has a single active delivery journey that benefits from Lock Screen / Dynamic Island visibility.

For the other apps:

- `mobile-driver`: background delivery work is better served by navigation, foreground service behavior, and standard notifications than Dynamic Island
- `mobile-business`: standard order notifications are usually enough
- `mobile-admin`: standard notifications are usually enough

Recommendation:

- roll out standard push to all apps as needed
- keep Live Activities customer-only unless a very specific product requirement appears

## Concrete implementation checklist for other apps

For each app that needs standard push:

- add Firebase app and messaging packages if not present
- add `GoogleService-Info.plist`
- add `google-services.json`
- update `app.json` with notification plugin config
- add a `useNotifications` hook modeled on customer
- add GraphQL notification operations if not already present
- call the hook from root layout
- add logout cleanup for tokens
- add a debug screen for permissions, token retrieval, backend registration, and test push
- test on a physical iOS device and a physical Android device

For `mobile-customer` Live Activities specifically:

- add the iOS Widget Extension target
- add ActivityKit / WidgetKit Swift source files
- ensure extension signing and entitlements are correct
- verify `react-native-live-activities` can talk to the extension correctly after prebuild
- rebuild a native iOS binary, because OTA is not enough
- test on iOS 16.2+ physical hardware

## Suggested follow-up tasks

### Priority 1

- implement the missing `mobile-customer` iOS Widget Extension / Live Activity extension target

### Priority 2

- standardize standard push notification wiring across all mobile apps using the customer hook as the template

### Priority 3

- update or replace `DYNAMIC_ISLAND_IMPLEMENTATION.md` so it matches the real repository state

## Short reference map

Customer push files:

- `mobile-customer/app.json`
- `mobile-customer/app/_layout.tsx`
- `mobile-customer/hooks/useNotifications.ts`
- `mobile-customer/app/debug-notifications.tsx`
- `mobile-customer/graphql/operations/notifications.ts`

Customer Live Activity files:

- `mobile-customer/hooks/useLiveActivity.ts`
- `mobile-customer/modules/orders/components/OrderDetails.tsx`
- `mobile-customer/plugins/patch-live-activities.js`

Backend files:

- `api/src/services/NotificationService.ts`
- `api/src/services/orderNotifications.ts`
- `api/src/models/Notification/resolvers/Mutation/registerDeviceToken.ts`
- `api/src/models/Notification/resolvers/Mutation/unregisterDeviceToken.ts`
- `api/src/models/Notification/resolvers/Mutation/registerLiveActivityToken.ts`

## Final conclusion

The customer app already contains a solid standard push implementation and a partial Live Activity implementation. The missing native piece for Dynamic Island is the iOS Widget Extension / ActivityKit target itself. That should be tracked as unfinished native work before treating Live Activities as complete.

For the other apps, the right strategy is to copy the standard push architecture from `mobile-customer` first and only consider Live Activities if there is a strong product reason.
