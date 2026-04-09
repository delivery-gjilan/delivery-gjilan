<!-- MDS:O19 | Domain: Operations | Updated: 2026-04-09 | v2 -->
<!-- Depends-On: O10, O15 -->
<!-- Depended-By: O15 -->
<!-- Nav: When App Store Connect fields, screenshots, privacy answers, or review-note guidance change for the customer app, update this file and keep APP_STORE_COPY and APP_STORE_DEPLOYMENT aligned. -->

# App Store Connect Setup — Zipp Go

This file is the full markdown worksheet for submitting the customer iOS app in App Store Connect.

Use it together with:
- `docs/APP_STORE_COPY.md` for the exact copy blocks
- `docs/APP_STORE_DEPLOYMENT.md` for overall blocker tracking

---

## Quick Answer

If you only want the short version:

- App name: `Zipp Go`
- Category: `Food & Drink`
- Secondary category: leave blank
- Age rating: `4+`
- Price: `Free`
- Privacy Policy URL: `https://delivery-gjilan.vercel.app/privacy`
- Support URL: `https://delivery-gjilan.vercel.app/`
- Marketing URL: optional, same URL is fine
- Screenshots: `Yes, required`
- Videos / App Previews: `No, optional`
- Tracking: `No`
- Account required: `Yes`
- Account deletion available: `Yes`

---

## App Identity

- App: `Zipp Go`
- Bundle ID: `com.artshabani.mobilecustomer`
- App Store Connect App ID: `6760239090`
- EAS project ID: `e5c04b16-6851-4fce-aa03-e4a183f0becf`
- Primary launch market described in copy: `Gjilan, Kosovo`

---

## Metadata To Fill

### General Information

- Name: `Zipp Go`
- Subtitle: use the EN/SQ values from `docs/APP_STORE_COPY.md`
- Primary language: `English (U.S.)` or `English (U.K.)`
- Secondary localization: `Albanian`
- Category: `Food & Drink`
- Secondary category: leave blank unless you deliberately want `Shopping`
- Content rights: choose `No, it does not contain, show, or access third-party content`
- Age rating: `4+`

### Pricing And Availability

- Price: `Free`
- In-App Purchases: `None`
- Pre-order: `No`
- Availability: enable only the storefronts you actually want to launch in

### Links

- Privacy Policy URL: `https://delivery-gjilan.vercel.app/privacy`
- Support URL: `https://delivery-gjilan.vercel.app/`
- Marketing URL: optional, `https://delivery-gjilan.vercel.app/` is acceptable if you want one

### Version Information

Suggested `What's New in This Version` text for first App Store submission:

```text
Initial App Store release of Zipp Go with local business ordering, live delivery tracking, notifications, and account management.
```

### Description And Keywords

- Description: paste from `docs/APP_STORE_COPY.md`
- Keywords: paste from `docs/APP_STORE_COPY.md`

### Promotional Text

Optional. If you want one, use:

```text
Order from local restaurants, groceries, and shops in Gjilan with live delivery tracking and lock screen updates.
```

---

## Exact Recommended Choices

### Export Compliance

Because `mobile-customer/app.json` already sets `ITSAppUsesNonExemptEncryption` to `false`:

- Choose the export-compliance path that means the app does not use non-exempt encryption.
- Do not claim custom cryptography.
- If Apple asks whether the app qualifies for exemption because it only uses standard system encryption, the intended answer is effectively `Yes`.

### Account / Access

- Account required: `Yes`
- Account creation available in app: `Yes`
- Account deletion available in app: `Yes`

### Ads / Tracking

- Contains ads: `No`, unless you truly serve ads in the app
- Tracking across companies' apps or websites: `No`

### Kids / Sensitive Areas

- Made for Kids: `No`
- Gambling: `No`
- Alcohol / tobacco / drugs commerce: `No` for the current customer release
- Social networking / open user-generated-content positioning: `No`

### Age Rating Questionnaire

Use the lowest non-sensitive path consistent with the app as it exists now:

- Cartoon or fantasy violence: `None`
- Realistic violence: `None`
- Profanity or crude humor: `None`
- Mature or suggestive themes: `None`
- Sexual content or nudity: `None`
- Horror or fear themes: `None`
- Medical or treatment themes: `None`
- Alcohol, tobacco, or drug references: `None`
- Gambling simulation: `None`
- Contests: `None`
- Unrestricted web access: `No`
- User-generated content: `No` in the App Store rating sense

That path should keep the rating at `4+`.

---

## App Privacy Answers

You still have to fill the App Privacy section manually in App Store Connect. Follow these steps exactly.

Navigate: App Store Connect → Your app → **App Privacy** (left sidebar).

---

### Step 1 — Top question: Does this app collect data?

> Click **Yes**

---

### Step 2 — Is any collected data linked to the user's identity?

> Apple does not ask this as a single yes/no here — it is asked per data type. Move on to Step 3.

---

### Step 3 — Is any collected data used to track users across companies or apps?

> Click **No**

---

### Step 4 — Select all data types you collect

Click **+ Add** or **Get Started** to begin declaring data types. You will work through Apple's category list. Check or add each of the following and skip all others.

---

### Step 5 — Contact Info

#### 5a — Name

> Click **Add** next to **Name**

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
	- [x] **Customer Support**
- Click **Next** / **Save**

#### 5b — Email Address

> Click **Add** next to **Email Address**

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
	- [x] **Customer Support**
- Click **Next** / **Save**

#### 5c — Phone Number

> Click **Add** next to **Phone Number**

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
	- [x] **Customer Support**
- Click **Next** / **Save**

#### 5d — Physical Address (Delivery Address)

> Click **Add** next to **Physical Address**

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
- Click **Next** / **Save**

---

### Step 6 — Location

#### 6a — Precise Location

> Click **Add** next to **Precise Location**

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
- Click **Next** / **Save**

Do not add Coarse Location as a separate entry — Precise includes it.

---

### Step 7 — Identifiers

#### 7a — User ID

> Click **Add** next to **User ID**

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
- Click **Next** / **Save**

#### 7b — Device ID

> Click **Add** next to **Device ID**

Apple's Device ID covers push tokens and device identifiers. The app collects push tokens (Expo push tokens / APNs device tokens) to send order notifications and Live Activity updates.

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
- Click **Next** / **Save**

---

### Step 8 — Purchases

#### 8a — Purchase History

> Click **Add** next to **Purchase History**

Apple's Purchase History covers order history and transaction records. The app stores all past orders linked to the user's account.

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
	- [x] **Analytics**
- Click **Next** / **Save**

---

### Step 9 — Usage Data

#### 9a — Product Interaction

> Click **Add** next to **Product Interaction**

This covers interaction events like which businesses and products users tap and add to cart. The app's backend records orders and browsing implicitly through the order flow.

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
	- [x] **Analytics**
- Click **Next** / **Save**

---

### Step 10 — User Content (Optional but recommended)

#### 10a — Customer Support

> Click **Add** next to **Customer Support** under User Content

This covers any order notes or contact messages the customer submits in the app.

- Is this data used to track the user? → **No**
- Is this data linked to the user's identity? → **Yes**
- Purposes to select:
	- [x] **App Functionality**
	- [x] **Customer Support**
- Click **Next** / **Save**

---

### Step 11 — Categories to skip entirely

Do **not** add any of these:

- Health & Fitness
- Financial Info (the app is cash-on-delivery; no card data collected)
- Sensitive Info
- Contacts (address book)
- Browsing History
- Search History
- Emails or Text Messages
- Photos or Videos
- Audio Data
- Gameplay Content
- Advertising Data
- Diagnostics (Crash Data, Performance Data) — skip unless you have Sentry or similar enabled

---

### Step 12 — Review and Publish

After adding all data types:

1. Review the summary table App Store Connect shows you.
2. Confirm every row shows **Not Used for Tracking**.
3. Confirm every row for account/location/order data shows **Linked to Identity**.
4. Click **Publish** to make the nutrition label visible on the app's App Store page.

> Do not skip publishing. An unpublished privacy nutrition label blocks the app from going live.

---

### Reference Summary Table

| Data Type | Tracking | Linked to Identity | Purposes |
|---|---|---|---|
| Name | No | Yes | App Functionality, Customer Support |
| Email Address | No | Yes | App Functionality, Customer Support |
| Phone Number | No | Yes | App Functionality, Customer Support |
| Physical Address | No | Yes | App Functionality |
| Precise Location | No | Yes | App Functionality |
| User ID | No | Yes | App Functionality |
| Device ID | No | Yes | App Functionality |
| Purchase History | No | Yes | App Functionality, Analytics |
| Product Interaction | No | Yes | App Functionality, Analytics |
| Customer Support (User Content) | No | Yes | App Functionality, Customer Support |

### What Not To Declare

- Health data: skip
- Financial info / card details: skip (cash-on-delivery only)
- Contacts from address book: skip
- Browsing history: skip
- Sensitive information categories: skip
- Advertising data: skip

---

## Screenshots And Videos

### Screenshots

Yes, screenshots are required.

Recommended screenshot set for Zipp Go:

1. Home / business discovery
2. Business menu / product list
3. Cart or checkout
4. Live order tracking
5. Delivery address selection
6. Order history or active order screen
7. Profile with support / privacy / terms access

### First Upload Order

If you only want the first screenshot batch to prepare now, use this order:

1. Home screen showing businesses and categories
2. Business page showing products or menu items
3. Cart or checkout summary
4. Live order tracking map or order status screen
5. Address selection or saved addresses screen
6. Order history or active orders list
7. Profile or account screen with settings/support links

If you want an eighth screenshot, add:

8. Product detail or featured items screen

### Practical Screenshot Rule

Your first 3 screenshots matter most. Make those:

1. Home / discovery
2. Business menu
3. Cart or checkout

That gives the storefront the clearest story: browse, choose, order.

### What Each Screenshot Should Prove

1. Home: local discovery and variety of merchants
2. Business page: clear product browsing and pricing
3. Cart / checkout: real purchase flow exists
4. Tracking: delivery status and Live Activity-related experience
5. Address: location is used for delivery, not background tracking
6. Orders: repeat usage and order history
7. Profile: account management and support/legal access
8. Product detail: merchandising depth, if needed

### Screenshot Rules

- Use clean production-looking data
- Do not show debug UI
- Do not show unfinished features
- Do not show alcohol or adult-only content
- Make sure the visuals match the actual shipped app

### Screenshot Sizes

Apple changes required screenshot sets over time. The safe rule is:

- Upload the iPhone screenshot sizes App Store Connect explicitly asks for on the version page
- Start with your largest iPhone screenshots first, then add any smaller required size sets if ASC requests them

Do not trust old generic screenshot-size blog posts over what App Store Connect currently shows.

### Videos / App Previews

No, App Preview videos are not required.

You can submit without them.

### Review Videos

Separate from App Previews, Apple may still ask for a short clarification video if review is confused by a feature like Live Activities. That is optional support material, not a required storefront asset.

### Direct Answer

- Screenshots: `Yes, required`
- Videos / App Previews: `No, optional`

---

## Review Information

Use the review-notes block from `docs/APP_STORE_COPY.md` and replace placeholders with real working demo details.

### Review Contact

- First name: your real first name
- Last name: your real last name
- Email: `artshabani2002@gmail.com`
- Phone: your real reachable phone number

Apple sometimes emails or calls when review is blocked, so use contact info you will actually monitor.

### Demo Credentials

- Sign-in required: `Yes`
- Username: demo customer phone or email
- Password: only if applicable
- OTP/bypass instructions: provide exact instructions Apple can actually use

### Notes For Review Checklist

Include these points:

1. The app is a local delivery marketplace for Gjilan.
2. Orders can be placed from test businesses.
3. Demo progression is enabled for review so the order status advances automatically.
4. Live Activities are used for lock-screen delivery tracking.
5. Contact email is `artshabani2002@gmail.com`.

### Review Notes Paste Source

Primary source: `docs/APP_STORE_COPY.md`

---

## Before You Press Submit

1. Upload the production build for `com.artshabani.mobilecustomer`.
2. Fill subtitle, keywords, description, support URL, and privacy policy URL.
3. Fill App Privacy answers.
4. Upload screenshots.
5. Add review contact and review notes.
6. Confirm age rating stays `4+`.
7. Confirm no alcohol or adult-only positioning appears in screenshots or metadata.
8. Confirm production login, ordering, push notifications, Live Activities, and account deletion work.

---

## Final Worksheet

Use this as the last pass before submission.

### Listing

- Name: `Zipp Go`
- Subtitle pasted: `Yes/No`
- Category: `Food & Drink`
- Age rating: `4+`
- Description pasted: `Yes/No`
- Keywords pasted: `Yes/No`
- Promotional text added: `Optional`

### Links

- Privacy Policy URL: `https://delivery-gjilan.vercel.app/privacy`
- Support URL: `https://delivery-gjilan.vercel.app/`
- Marketing URL: `Optional`

### Privacy

- Data collected: `Yes`
- Tracking: `No`
- Contact info declared: `Yes`
- Precise location declared: `Yes`
- Identifiers declared: `Yes`
- Purchases/order history declared: `Yes`
- User content declared: `Yes`

### Assets

- Screenshots uploaded: `Required`
- App Preview uploaded: `Optional`

### Review

- Demo credentials ready: `Required`
- Review notes pasted: `Required`
- Review contact reachable: `Required`

---

## Short Answer Reference

- Do you have a markdown for what to write in App Store Connect: `Yes` — this file plus `docs/APP_STORE_COPY.md`
- Do you need screenshots: `Yes`
- Do you need videos / App Previews: `No`
- Should you upload a video anyway: `Only if you want extra marketing polish or need to help review understand Live Activities`