# Promotions System - Auto-Apply & User Targeting Features

## 🎉 New Features Implemented

### 1. **Auto-Apply Promotions**
Promotions can now be automatically applied to orders without customers needing to enter a code!

#### How it works:
- **Admin Panel**: When creating/editing a promotion, set "Auto-apply" to "Yes"
- **Backend**: The system automatically finds and applies the best auto-apply promotion during checkout
- **Mobile App**: Auto-applied discounts show automatically in the cart (no code needed!)

#### Use Cases:
- ✅ **First order always gets free delivery** - Create a FREE_DELIVERY promo, set "Auto-apply: Yes" and "First order only: Yes"
- ✅ **$2 off first order** - Create a FIXED_DISCOUNT promo with value $2, set "Auto-apply: Yes" and "First order only: Yes"
- ✅ **Weekend discount** - Create a promo with start/end dates for weekends, set "Auto-apply: Yes"
- ✅ **Loyalty rewards** - Auto-apply discounts for all users during special events

### 2. **User-Specific Promotions (Friends & Family Discounts)**
Target promotions to specific users only!

#### How it works:
- **Admin Panel**: In the "Target specific users" field, paste user IDs separated by commas
- **Backend**: Only the targeted users will see and be able to use this promotion
- **Leave blank**: Promo is available to everyone (default behavior)

#### Use Cases:
- ✅ **Friends discount** - Create special promo codes for your friends by adding their user IDs
- ✅ **VIP customers** - Reward loyal customers with exclusive discounts
- ✅ **Beta testers** - Give special promotions to early adopters
- ✅ **Referral rewards** - Target specific users who referred others

### 3. **Improved Admin UI**
The promotions admin panel has been refactored with:
- ✨ Better visual hierarchy and organization
- 🎯 Clear labels and help text for each field
- 👁️ Auto-apply and targeted user indicators in the table view
- 🎨 Purple badge for auto-apply promos
- 👥 Cyan badge showing number of targeted users

## 📊 Database Changes

### New Fields:
- **`auto_apply`** (boolean) - Whether the promo auto-applies without code entry
- **`promotion_target_users`** table - Junction table for user-specific targeting

### Migration:
- ✅ Migration file: `0020_auto_apply_and_user_targeting.sql`
- ✅ Already applied to your database

## 🎯 Example Setups

### Example 1: First Order Free Delivery (Auto-Applied)
```
Code: WELCOME (not required by users)
Name: Welcome - Free Delivery
Type: FREE_DELIVERY
Auto-apply: Yes
First order only: Yes
Active: Yes
Target users: (leave blank - for everyone)
```

### Example 2: $2 Off First Order (Auto-Applied)
```
Code: FIRST2 (not required by users)  
Name: First Order $2 Off
Type: FIXED_DISCOUNT
Value: 2
Auto-apply: Yes
First order only: Yes
Active: Yes
```

### Example 3: Friends & Family Discount (Manual Code)
```
Code: FRIENDS10
Name: Friends & Family 10% Off
Type: PERCENT_DISCOUNT
Value: 10
Auto-apply: No (users enter code manually)
Active: Yes
Target users: user-id-1, user-id-2, user-id-3
```

### Example 4: VIP Auto-Discount (Targeted + Auto-Apply)
```
Code: VIPSPECIAL
Name: VIP Customer Special
Type: FIXED_DISCOUNT
Value: 5
Auto-apply: Yes
Active: Yes
Target users: vip-user-id-1, vip-user-id-2
```

## 🔧 Technical Details

### API Changes:
- **New Query**: `getAutoApplyPromotions(input: { itemsTotal, deliveryPrice })` - Returns available auto-apply promos
- **Updated Mutation**: `createPromotion` and `updatePromotion` now accept `autoApply` and `targetUserIds` fields
- **Order Creation**: Automatically checks for auto-apply promos if no code provided

### GraphQL Schema Updates:
```graphql
type Promotion {
  # ... existing fields
  autoApply: Boolean!
  targetUserIds: [ID!]!
}

input CreatePromotionInput {
  # ... existing fields
  autoApply: Boolean
  targetUserIds: [ID!]
}
```

### Priority Logic:
1. If user enters a promo code → Use that code (manual entry takes priority)
2. If no code entered → Find auto-apply promos for this user
3. Apply the **best** auto-apply promotion (highest discount value)

## 🚀 How to Use

### For Admins:
1. Go to **Admin Panel → Promotions**
2. Click **"Create New Promotion"**
3. Fill in the details
4. Toggle **"Auto-apply"** to Yes for automatic application
5. Add **user IDs** (comma-separated) to target specific users
6. Save!

### For Customers:
- **Auto-apply promos**: Just shop normally! Discounts apply automatically at checkout
- **Manual codes**: Enter promotion codes as before - they override auto-apply

## 🎨 UI Features

### Admin Table View Shows:
- ✨ **Purple badge** - Auto-apply promotions
- 👥 **Cyan badge** - Number of targeted users (e.g., "3 targeted users")
- 🟢 **Green badge** - Active status
- 📋 All validation rules at a glance

### Form Improvements:
- Clear help text for each field
- Better organization into logical sections
- Auto-apply toggle with explanation
- User targeting with helpful placeholder text

## 📝 Notes

### Finding User IDs:
- Go to **Admin Panel → Users**
- User IDs are displayed in the user details
- Copy and paste IDs (comma-separated) into the promotion form

### Best Practices:
- Use **auto-apply** for universal offers (first order, seasonal discounts)
- Use **targeted** promos for VIP/friends/referrals
- Combine both for exclusive auto-applied offers to select users
- Test promotions before making them active

## ✅ Testing

### Test Auto-Apply:
1. Create an auto-apply promotion
2. Go to mobile app without entering any code
3. The discount should automatically appear in cart summary

### Test User Targeting:
1. Create a promotion with specific user IDs
2. Log in as a targeted user → promo works
3. Log in as a non-targeted user → promo shows "not found" or "invalid"

## 🐛 Troubleshooting

**Auto-apply not working?**
- Check promotion is **Active**
- Check **dates** (starts_at/ends_at)
- Check **first_order_only** setting matches user's order history
- Verify no **max_redemptions** limit reached

**User targeting not working?**
- Verify user IDs are correct UUIDs
- Check for spaces or formatting issues in the comma-separated list
- Ensure users exist in the database

---

**Status**: ✅ Fully implemented and ready to use!
