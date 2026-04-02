# Email Service — Implementation Plan

<!-- MDS:FF1 | Domain: Future Features | Updated: 2026-03-31 -->
<!-- Depends-On: BL1, B2 -->
<!-- Nav: Receipt design → update B2 (Order Creation). Auth emails → update AuthService. -->

## Goal

Add a first-party `EmailService` to the API that can send transactional emails. Initial use-case: **order receipt** sent to the customer when an order is marked `DELIVERED`. Secondary use-case (later): replace the current "verification code returned in API response" flow with an actual email.

---

## Chosen Provider: Resend

**Why Resend over alternatives:**

| Concern | Resend | Nodemailer + SMTP | SendGrid |
|---------|--------|-------------------|----------|
| Setup complexity | Minimal — one SDK, one API key | Requires SMTP credentials + provider | Heavier SDK; stricter domain policy |
| React/HTML templates | First-class `react-email` support | Raw HTML strings | Handlebars / custom |
| Free tier | 3 000 emails/month | Depends on SMTP provider | 100/day |
| TypeScript types | Strong, built-in | Third-party typings | Generated |

Install:

```bash
cd api
npm install resend
```

Set env var:

```
RESEND_API_KEY=re_...
RESEND_FROM_ADDRESS=noreply@deliverygjilan.com   # must be a verified Resend domain
```

---

## Architecture

### 1. `api/src/services/EmailService.ts`

Thin wrapper around the Resend SDK. Exposes typed methods — one per email type.

```ts
import { Resend } from 'resend';

export class EmailService {
    private client: Resend;
    private from: string;

    constructor() {
        this.client = new Resend(process.env.RESEND_API_KEY!);
        this.from = process.env.RESEND_FROM_ADDRESS ?? 'noreply@deliverygjilan.com';
    }

    async sendOrderReceipt(params: OrderReceiptParams): Promise<void> { ... }

    // Later:
    async sendEmailVerificationCode(params: VerificationCodeParams): Promise<void> { ... }
    async sendPasswordResetCode(params: PasswordResetParams): Promise<void> { ... }
}

export type OrderReceiptParams = {
    toEmail: string;
    toName: string;
    order: {
        displayId: string;
        orderDate: Date;
        businessName: string;
        items: Array<{ name: string; quantity: number; unitPrice: number }>;
        subtotal: number;
        deliveryPrice: number;
        discountTotal: number;
        total: number;
        paymentCollection: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
        dropoffAddress: string;
    };
};
```

All methods fire-and-forget from the caller's perspective — they `await` internally but errors are caught and logged, not re-thrown. A receipt failure must never break order delivery flow.

### 2. Email Templates — `react-email`

Install the tooling:

```bash
cd api
npm install @react-email/components react react-dom
npm install -D @react-email/render
```

Create templates under `api/src/email-templates/`:

```
api/src/email-templates/
    OrderReceipt.tsx        ← main receipt component
    VerificationCode.tsx    ← (future)
    shared/
        Header.tsx
        Footer.tsx
        theme.ts            ← brand colours / fonts
```

`OrderReceipt.tsx` renders an HTML-first email with:
- Header: logo + "Your order receipt"
- Order ID (`GJ-XXXX`) and date
- Itemised table: name | qty | price
- Subtotal / delivery fee / discount / **total** row
- Payment method note
- Drop-off address
- Footer: support contact

Render to HTML string before sending:

```ts
import { render } from '@react-email/render';
import { OrderReceipt } from '@/email-templates/OrderReceipt';

const html = await render(<OrderReceipt {...params} />);
await this.client.emails.send({
    from: this.from,
    to: params.toEmail,
    subject: `Your receipt — Order ${params.order.displayId}`,
    html,
});
```

### 3. Injection into `createContext.ts`

Add `emailService` to the API context alongside `notificationService`:

```ts
// createContext.ts
import { EmailService } from '@/services/EmailService';

// inside createContext():
emailService: new EmailService(),
```

Add to `context.ts` interface:

```ts
emailService: EmailService;
```

### 4. Trigger point in `OrderService.ts`

In `updateStatusWithSideEffects`, in the `DELIVERED` branch (around line 1280), after settlements are created:

```ts
if (status === 'DELIVERED' && currentStatus !== 'DELIVERED') {
    // existing settlement creation...
    void financialService.createOrderSettlements(id).catch(...);

    // NEW — send receipt, fire-and-forget
    const user = await this.authRepository.findById(order.userId);
    if (user?.email && user?.emailVerified) {
        void context.emailService.sendOrderReceipt({
            toEmail: user.email,
            toName: `${user.firstName} ${user.lastName}`,
            order: buildReceiptPayload(order),  // helper that maps Order → OrderReceiptParams
        }).catch((err) => log.error({ err, orderId: id }, 'email:receipt:send_failed'));
    }
}
```

A private `buildReceiptPayload(order: Order)` helper converts the mapped `Order` type into `OrderReceiptParams`. It pulls `orderPromotions` to compute `discountTotal`.

---

## Files to Create / Modify

| Path | Action | Notes |
|------|--------|-------|
| `api/src/services/EmailService.ts` | **Create** | Provider wrapper |
| `api/src/email-templates/OrderReceipt.tsx` | **Create** | React-email component |
| `api/src/email-templates/shared/Header.tsx` | **Create** | Shared header |
| `api/src/email-templates/shared/Footer.tsx` | **Create** | Shared footer |
| `api/src/email-templates/shared/theme.ts` | **Create** | Brand tokens |
| `api/src/graphql/createContext.ts` | **Modify** | Add `emailService` |
| `api/src/graphql/context.ts` | **Modify** | Add `emailService` type |
| `api/src/services/OrderService.ts` | **Modify** | Trigger receipt on DELIVERED |
| `api/.env.example` | **Modify** | Document new env vars |

---

## Environment Variables

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_ADDRESS=noreply@deliverygjilan.com
```

`RESEND_API_KEY` is required. If absent, `EmailService` should skip sends and log a warning rather than crash the server.

---

## Error Handling & Safety Rules

1. **Never throw from `sendOrderReceipt`** — wrap the entire Resend call in try/catch, log to pino, return `void`.
2. **Never block order status updates on email** — all calls from `OrderService` must use `void promise.catch(log)`.
3. **Guard on `emailVerified`** — only send receipts when `user.emailVerified === true`. Unverified emails may be typos.
4. **Idempotency note** — Resend does not deduplicate. If the order status is updated to `DELIVERED` more than once (shouldn't happen per state machine, but guard defensively), the receipt fires again. Consider a `receiptSentAt` column on `orders` in a future iteration.

---

## Future Email Use-Cases (after receipt)

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
- Unit-test `OrderReceipt.tsx` using `@react-email/render` — assert the HTML string contains expected display ID, item names, total.
- Integration test: in settlement/order harness tests, stub `emailService.sendOrderReceipt` and assert it was called exactly once with correct params on `DELIVERED` transition.

---

## Validation Checklist (before shipping)

- [ ] `RESEND_API_KEY` is set in production `.env`
- [ ] Sending domain is verified in Resend dashboard
- [ ] Receipt renders correctly in Gmail, Apple Mail, and Outlook (use Resend preview or Litmus)
- [ ] Receipt is not sent for unverified emails
- [ ] A failed send does not surface an error to the customer or break the delivery status
- [ ] Receipts include correct discount line when a promo was applied
- [ ] Priority surcharge shows as a separate "Priority delivery" line when > 0
