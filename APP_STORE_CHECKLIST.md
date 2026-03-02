# App Store Submission Checklist

## Hard Rejection Blockers

### 1. Privacy Policy (Guideline 5.1.1)
- [ ] Create a privacy policy page (hosted URL)
- [ ] Add privacy policy URL to App Store Connect metadata
- [ ] Add privacy policy link inside the app (e.g. in Profile/Settings)
- [ ] Cover: data collected, how it's used, third-party sharing, retention, deletion rights
- [ ] Include contact info for privacy inquiries

### 2. Account Deletion (Guideline 5.1.1(v))
- [ ] Implement "Delete Account" option in app (Profile → Account)
- [ ] Use soft deletion (mark `deleted_at` instead of hard delete)
- [ ] Show confirmation dialog before deletion
- [ ] Clearly explain what data will be deleted
- [ ] Account deletion must be easy to find (not buried)
- [ ] Must actually delete/anonymize user data within a reasonable period

### 3. Non-Functional Features (Guideline 2.1)
- [ ] Remove or implement "Credits" (currently stub `onPress={() => {}}`)
- [ ] Remove or implement "Buy Gift Card" (currently stub)
- [ ] Remove or implement "Redeem Code" (currently stub)
- [ ] Remove or implement "Contact Support" (currently stub)
- [ ] Remove or implement "Account" settings (currently stub)
- [ ] Ensure every tappable element either works or is hidden

### 4. Bundle Identifier (Guideline 2.1)
- [ ] Replace placeholder `com.yourcompany.deliverygjilan` with real bundle ID
- [ ] Update in `app.json` / `eas.json`
- [ ] Match bundle ID in Apple Developer portal

### 5. Production API URL (Guideline 2.1)
- [ ] Replace development ngrok URL with production API endpoint
- [ ] Ensure HTTPS is used for all API calls
- [ ] Set up production server/hosting
- [ ] Test all features against production API

### 6. App Name & Branding (Guideline 2.3.7)
- [ ] Replace placeholder "DeliveryGjilan" with final app name
- [ ] Prepare app icon (1024×1024)
- [ ] Prepare screenshots for all required device sizes
- [ ] Write app description and keywords

---

## Strong Recommendations

### 7. Sign in with Apple (Guideline 4.8 — Required if any third-party login exists)
- [ ] If adding social login (Google, Facebook), must also offer Sign in with Apple
- [ ] Current email/password-only auth is fine without it
- [ ] Plan for this if social login is added later

### 8. Alcohol / Age-Gated Content (if applicable)
- [ ] If any businesses sell alcohol, add age verification gate (17+)
- [ ] Set appropriate age rating in App Store Connect
- [ ] Filter alcohol items for underage users if needed

### 9. Payment Transparency
- [ ] Make "Cash on Delivery" explicit in checkout flow
- [ ] Show payment method clearly before order confirmation
- [ ] If adding in-app payments later, ensure Apple Pay / IAP compliance

---

## App Store Connect Metadata

- [ ] App category: Food & Drink
- [ ] Age rating questionnaire completed
- [ ] App privacy details (nutrition labels) filled out
- [ ] Support URL provided
- [ ] Marketing URL (optional but recommended)
- [ ] Contact information for review team
- [ ] Demo account credentials for app review (if login required)

---

## Pre-Submission Testing

- [ ] Test full order flow end-to-end on production
- [ ] Test account creation → order → account deletion
- [ ] Test on multiple iOS device sizes
- [ ] Test with poor network / offline scenarios
- [ ] Verify no crashes or ANRs
- [ ] Verify all deeplinks work
- [ ] Test push notifications
