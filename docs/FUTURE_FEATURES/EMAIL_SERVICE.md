# Email Service

<!-- MDS:FF1 | Domain: Future Features | Updated: 2026-04-05 -->
<!-- Depends-On: BL1, B2 -->
<!-- Nav: Receipt design → update B2 (Order Creation). Auth emails → update AuthService. -->

## Current State

The `EmailService` is implemented and sends order receipt emails via **Resend** when an order transitions to `DELIVERED`.

### How it works

1. **`api/src/services/EmailService.ts`** — Thin wrapper around the Resend SDK. Exposes `sendOrderReceipt()`. If `RESEND_API_KEY` is not set, sending is silently skipped with a warning log.
2. **Injected into GraphQL context** (`emailService`) alongside other services in `createContext.ts`.
3. **Triggered fire-and-forget** in `OrderLifecycleModule.updateStatusWithSideEffects` when `status === 'DELIVERED'`. The private `sendReceiptEmail()` method gathers user, business, items, and promotion data, then calls `emailService.sendOrderReceipt()` without awaiting. Failures are caught and logged — never block the delivery flow.
4. **Receipt HTML** is built inline with a plain-HTML template function (`buildOrderReceiptHtml`) — no react-email dependency. Renders an itemised table with subtotal, delivery fee, priority surcharge (if > 0), discounts, total, payment method, and drop-off address.
5. **Emails are sent to the user's registered email regardless of verification status.**
6. **Localization** — Receipts are sent in the user's `preferredLanguage` (`en` or `al`). An `emailI18n` dictionary inside `EmailService.ts` maps all template labels into English and Albanian. Date formatting uses the matching locale (`en-GB` / `sq`).
7. **Email opt-out** — Users can disable receipt emails via a toggle in the mobile-customer profile screen. The `users.email_opt_out` boolean column (default `false`) is checked in `sendReceiptEmail()`; if `true`, sending is skipped. A dedicated `setMyEmailOptOut(optOut: Boolean!): User!` GraphQL mutation persists the preference.
8. **One-click unsubscribe** — Each receipt email includes an unsubscribe link in the footer. The link hits `GET /api/email/unsubscribe?token=xxx` (a public REST endpoint). The token is an HMAC-SHA256 signed userId, verified with constant-time comparison — no auth header needed. On success, the endpoint sets `emailOptOut = true` and renders a confirmation HTML page.

### Environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes (for sending) | — skips sends if absent |
| `RESEND_FROM_ADDRESS` | No | `noreply@deliverygjilan.com` |
| `PUBLIC_API_URL` | No | `https://api.zippdelivery.com` |

### Files

| Path | Role |
|------|------|
| `api/src/services/EmailService.ts` | Service + HTML template + i18n dictionary |
| `api/src/services/order/OrderLifecycleModule.ts` | Trigger on DELIVERED (queries `preferredLanguage`, `emailOptOut`) |
| `api/src/routes/emailRoutes.ts` | Unsubscribe REST endpoint + HMAC token helpers |
| `api/src/models/User/resolvers/Mutation/setMyEmailOptOut.ts` | GraphQL mutation resolver |
| `api/database/schema/users.ts` | `emailOptOut` column |
| `api/src/graphql/context.ts` | Context interface (`emailService`) |
| `api/src/graphql/createContext.ts` | Instantiation |
| `mobile-customer/app/(tabs)/profile.tsx` | Email receipts toggle UI |
| `mobile-customer/graphql/operations/auth/setMyEmailOptOut.ts` | Client-side mutation |
| `api/.env.example` | Documents env vars |

---

## Error Handling & Safety Rules

1. **Never throw from `sendOrderReceipt`** — the entire Resend call is wrapped in try/catch, logged to pino, returns `void`.
2. **Never block order status updates on email** — all calls from `OrderLifecycleModule` use fire-and-forget `.catch(log)`.
3. **Idempotency note** — Resend does not deduplicate. The `DELIVERED` guard (`currentStatus !== 'DELIVERED'`) prevents double sends, but if it somehow fires twice the receipt sends again. Consider a `receiptSentAt` column on `orders` in a future iteration.

---

## Future Email Use-Cases

| Email | Trigger | Priority |
|-------|---------|----------|
| Email verification code | `AuthService.initiateSignup` | High — removes code from API response |
| Password reset code | `AuthService.resetPassword` | High |
| Order cancelled | Status → `CANCELLED` | Medium |
| Order confirmation (placed) | Order created (non-approval path) | Medium |
| Referral reward notification | Referral credited | Low |

When email verification is moved to email-based flow, the current `emailVerificationCode` column and "return code in response" pattern in `AuthService` should be removed.

---

## Testing Strategy

- Unit-test `EmailService` by mocking the Resend client (inject via constructor).
- Integration test: in settlement/order harness tests, stub `emailService.sendOrderReceipt` and assert it was called exactly once with correct params on `DELIVERED` transition.

---

## Validation Checklist (before shipping to production)

- [ ] `RESEND_API_KEY` is set in production `.env`
- [ ] Sending domain (`deliverygjilan.com`) is verified in Resend dashboard
- [ ] Receipt renders correctly in Gmail, Apple Mail, and Outlook (use Resend preview or Litmus)
- [ ] A failed send does not surface an error to the customer or break the delivery status
- [ ] Receipts include correct discount line when a promo was applied
- [ ] Priority surcharge shows as a separate "Priority delivery" line when > 0
- [ ] Albanian receipt renders correctly (check translated labels, date locale `sq`)
- [ ] Email opt-out toggle in profile screen persists and prevents receipt sending