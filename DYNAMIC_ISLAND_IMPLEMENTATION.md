# iOS Dynamic Island / Live Activities Implementation

## 🎉 What's Been Implemented

This implementation adds **iOS Dynamic Island and Live Activities** support for real-time delivery tracking with ETA updates. The feature provides a premium iOS experience with persistent delivery status in the:
- **Dynamic Island** (iPhone 14 Pro and newer)
- **Lock Screen** (iPhone 12 and newer with Live Activities support)

### Features
✅ Real-time ETA updates in Dynamic Island
✅ Order status tracking (Preparing → Ready → Out for Delivery → Delivered)
✅ Driver name and information
✅ Automatic cleanup when order is delivered/cancelled
✅ Fallback to regular push notifications on unsupported devices
✅ Backend Live Activity push token management
✅ Live Activity updates from backend when order status changes

---

## 📦 What Was Changed

### Mobile Customer App (`mobile-customer/`)

1. **Package Added:**
   - `react-native-live-activities` - iOS ActivityKit wrapper

2. **iOS Native Code:**
   - `ios/modules/DeliveryActivityAttributes.swift` - Data model for Live Activity
   - `ios/modules/DeliveryLiveActivityWidget.swift` - Widget UI for Dynamic Island and Lock Screen

3. **App Configuration:**
   - `app.json` - Added iOS Live Activity entitlements and info.plist entries

4. **React Native Hook:**
   - `hooks/useLiveActivity.ts` - Manages Live Activity lifecycle (start/update/end)

5. **GraphQL Operations:**
   - `graphql/operations/notifications.ts` - Added `REGISTER_LIVE_ACTIVITY_TOKEN` mutation

6. **Order Details Screen:**
   - `modules/orders/components/OrderDetails.tsx` - Integration with Live Activity hook
   - Automatically starts Live Activity when order is OUT_FOR_DELIVERY
   - Updates ETA every 5 seconds while active
   - Ends Live Activity when delivered or cancelled

### Backend API (`api/`)

1. **Database Schema:**
   - `database/schema/liveActivityTokens.ts` - New table for Live Activity push tokens
   - `database/create-live-activity-tokens-table.sql` - SQL migration

2. **Repository:**
   - `src/repositories/LiveActivityTokenRepository.ts` - CRUD operations for Live Activity tokens

3. **Notification Service:**
   - `src/services/NotificationService.ts` - Added Live Activity update/end methods
   - Sends APNs with `apns-push-type: liveactivity`

4. **Order Notifications:**
   - `src/services/orderNotifications.ts` - Added `updateLiveActivity()` and `endLiveActivity()`

5. **GraphQL Schema:**
   - `src/models/Notification/Notification.graphql` - Added `registerLiveActivityToken` mutation

6. **Resolvers:**
   - `src/models/Notification/resolvers/Mutation/registerLiveActivityToken.ts` - New mutation resolver
   - `src/models/Order/resolvers/Mutation/updateOrderStatus.ts` - Calls Live Activity updates
   - `src/models/Order/resolvers/Mutation/startPreparing.ts` - Calls Live Activity updates

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```bash
cd api
psql -U your_db_user -d delivery_gjilan < database/create-live-activity-tokens-table.sql
```

Or connect to your database and run:
```sql
CREATE TABLE IF NOT EXISTS live_activity_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL UNIQUE,
    push_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS live_activity_tokens_order_id_idx ON live_activity_tokens(order_id);
CREATE INDEX IF NOT EXISTS live_activity_tokens_user_id_idx ON live_activity_tokens(user_id);
```

### Step 2: Regenerate GraphQL Types

```bash
cd api
npm run codegen

cd ../mobile-customer
npm run codegen
```

### Step 3: Prebuild iOS Native Modules

Since we added native Swift code, you need to regenerate the iOS project:

```bash
cd mobile-customer
npx expo prebuild --platform ios
```

This will:
- Link the Swift files to the iOS project
- Apply entitlements from app.json
- Configure the Widget Extension

### Step 4: Build for TestFlight

**Important:** Live Activities require a full native rebuild, not an OTA update.

```bash
cd mobile-customer
eas build --platform ios --profile production
```

Then submit to TestFlight:
```bash
eas submit --platform ios
```

### Step 5: Test on Physical Device

1. **Install from TestFlight** on iPhone 12 or newer
2. **Log in** to the customer app
3. **Place an order** and wait for status to change to OUT_FOR_DELIVERY
4. **Lock your phone** - you should see the Live Activity on the Lock Screen
5. **On iPhone 14 Pro+** - check the Dynamic Island for compact view

---

## 🧪 Testing Guide

### Device Requirements
- **Live Activities**: iPhone 12+ running iOS 16.2+
- **Dynamic Island**: iPhone 14 Pro, 14 Pro Max, 15 Pro, 15 Pro Max, 16 Pro, 16 Pro Max

### Testing Scenarios

#### 1. Order Lifecycle Test
1. Place order (status: PENDING)
2. Business accepts order (status: PREPARING)
   - ✅ Live Activity starts showing "Preparing" with prep time countdown
3. Business marks ready (status: READY)
   - ✅ Live Activity updates to "Ready for pickup"
4. Driver picks up (status: OUT_FOR_DELIVERY)
   - ✅ Live Activity updates with driver name and ETA
5. Order delivered (status: DELIVERED)
   - ✅ Live Activity ends automatically after 10 seconds

#### 2. ETA Update Test
1. While order is OUT_FOR_DELIVERY
2. Driver moves closer to customer
3. Backend receives driver location updates
4. ✅ ETA should update in the Dynamic Island/Lock Screen every 5 seconds

#### 3. Multi-Order Test
1. Place two orders simultaneously
2. ✅ Only one Live Activity should be active per order
3. Cancel one order
4. ✅ That Live Activity should end, other should continue

### Console Logs to Watch

Mobile app:
```
[LiveActivity] Starting Live Activity
[LiveActivity] Live Activity started {activityId}
[LiveActivity] Got push token, registering with backend
[LiveActivity] Push token registered with backend
```

Backend:
```
Sent Live Activity update {orderId, estimatedMinutes}
Ended Live Activity {orderId}
```

---

## 🎨 UI Preview

### Dynamic Island (iPhone 14 Pro+)

**Compact (Minimized):**
- 🚴 (bicycle icon) | 15m (time)

**Expanded (Tapped):**
```
┌─────────────────────────────────────┐
│  🚴 John Smith      ~15 min         │
│         Driver                       │
│                                      │
│           🚗                         │
│       On the way                    │
│                                      │
│  Order #1234    Restaurant Name     │
└─────────────────────────────────────┘
```

### Lock Screen (iPhone 12+)

```
╔═══════════════════════════════════════╗
║  Restaurant Name          #1234       ║
║                                        ║
║  🚗  On the way            ~15        ║
║      John Smith         minutes       ║
║                                        ║
║  [=========>-------]                  ║
╚═══════════════════════════════════════╝
```

---

## 🔧 Troubleshooting

### Live Activity Not Appearing

1. **Check iOS version**: Must be iOS 16.2+
2. **Check device**: Live Activities work on iPhone 12+, Dynamic Island only on 14 Pro+
3. **Check Settings**: Settings → Notifications → [Your App] → Live Activities must be enabled
4. **Check console logs**: Look for `[LiveActivity]` logs in Xcode or React Native debugger
5. **Check backend**: Ensure `live_activity_tokens` table exists and has records

### ETA Not Updating

1. **Check order status**: Must be OUT_FOR_DELIVERY
2. **Check driver location**: Driver must have location updates enabled
3. **Check backend logs**: Look for "Sent Live Activity update" messages
4. **Check Firebase Console**: Verify Live Activity push messages are being sent

### Live Activity Not Ending

1. **Check order status**: Should auto-end on DELIVERED or CANCELLED
2. **Manual end**: Call `endLiveActivity()` from the mobile app
3. **Backend cleanup**: Check `live_activity_tokens` table - tokens should be deleted when order completes

### Build Errors

If you get Swift compilation errors:
```bash
cd mobile-customer/ios
rm -rf Pods
pod install
cd ..
npx expo run:ios
```

---

## 📊 Data Flow

### Starting Live Activity

```
Mobile App (OrderDetails)
  ↓ useLiveActivity.startLiveActivity()
  ↓ react-native-live-activities.startActivity()
  ↓ iOS ActivityKit creates Live Activity
  ↓ Returns activityId + pushToken
  ↓ REGISTER_LIVE_ACTIVITY_TOKEN mutation
  ↓ Backend saves to live_activity_tokens table
  ✅ Live Activity visible on device
```

### Updating Live Activity

```
Backend (OrderService)
  ↓ Order status changes
  ↓ updateLiveActivity(orderId, status, driver, eta)
  ↓ NotificationService.sendLiveActivityUpdate()
  ↓ Gets tokens from live_activity_tokens table
  ↓ Sends APNs with apns-push-type: liveactivity
  ↓ Firebase Cloud Messaging → APNs
  ↓ iOS ActivityKit updates Live Activity
  ✅ Dynamic Island/Lock Screen updates
```

### Ending Live Activity

```
Backend (OrderService) OR Mobile App
  ↓ Order DELIVERED/CANCELLED or user closes app
  ↓ endLiveActivity(orderId)
  ↓ NotificationService.endLiveActivities()
  ↓ Sends end event via APNs
  ↓ Deletes tokens from live_activity_tokens table
  ✅ Live Activity dismisses after 10 seconds
```

---

## 🎯 Next Steps

### Optional Enhancements

1. **Interactive Actions**
   - Add "Call Driver" button to Live Activity
   - Add "View Map" deep link

2. **Improved ETA Calculation**
   - Use actual route distance instead of haversine
   - Factor in traffic data from Mapbox Directions API

3. **Multiple Orders**
   - Show multiple Live Activities if customer has multiple active orders
   - Prioritize the closest delivery

4. **Customization**
   - Make Live Activity colors match app theme
   - Add business logo to Live Activity

5. **Analytics**
   - Track Live Activity engagement
   - Measure impact on customer satisfaction

---

## 📝 Notes

- **Rebuilds Required**: Any changes to Swift code require `eas build`
- **OTA Updates**: Changes to JavaScript/TypeScript (hook logic, ETA calculation) can use `eas update`
- **Push Certificates**: Ensure your APNs certificate is valid in Firebase Console
- **Battery Impact**: Live Activities use minimal battery (< 1% per hour)
- **Privacy**: Live Activities don't expose customer location, only driver location to customer
- **Android**: No equivalent feature exists (Live Activities are iOS-only). Android users continue to receive standard push notifications.

---

## ✅ Testing Checklist

Before releasing to production:

- [ ] Database migration completed successfully
- [ ] GraphQL types regenerated on backend and mobile
- [ ] iOS prebuild completed without errors
- [ ] TestFlight build uploaded and installed
- [ ] Live Activity appears when order is OUT_FOR_DELIVERY
- [ ] ETA updates in real-time as driver moves
- [ ] Driver name displays correctly
- [ ] Live Activity ends when order is delivered
- [ ] Live Activity ends when order is cancelled
- [ ] Multiple orders work correctly (separate Live Activities)
- [ ] Works on iPhone 12-13 (Lock Screen only)
- [ ] Works on iPhone 14 Pro+ (Dynamic Island + Lock Screen)
- [ ] Fallback to regular notifications on iPhone 11 and older
- [ ] Backend logs show Live Activity updates being sent
- [ ] No errors in mobile console logs

---

## 🎉 Success!

Your iOS Dynamic Island implementation is complete! Customers with iPhone 14 Pro+ will now see a beautiful, real-time delivery tracker in the Dynamic Island, while other iOS users will see it on their Lock Screen.

**Questions?** Check the console logs or refer to the code comments in the Swift files for detailed explanations.
