# Auth & User Management

<!-- MDS:B5 | Domain: Backend | Updated: 2026-03-18 -->
<!-- Depends-On: B1 -->
<!-- Depended-By: O5, O6 -->
<!-- Nav: Token lifetime changes → update O5 (Security). Signup step changes → review M1 (Mobile Overview). Role changes → review BL1 (Settlements), B2 (Order Creation). -->

## Overview

Auth is handled by `AuthService` + `AuthRepository`. The system uses a two-token model (short-lived JWT + long-lived refresh) with a multi-step signup flow.

**Key files:**
- `api/src/services/AuthService.ts`
- `api/src/repositories/AuthRepository.ts`
- `api/database/schema/users.ts`
- `api/database/schema/refreshTokenSessions.ts`

---

## Token Model

| Token | Algorithm | Lifetime | Secret | Contains |
|-------|-----------|----------|--------|----------|
| Access (JWT) | HS256 | **15 minutes** | `JWT_SECRET` | `{ userId, role, businessId }` |
| Refresh token | HS256 | **30 days** | `REFRESH_TOKEN_SECRET` (falls back to `JWT_SECRET`) | `{ userId, type: 'refresh', jti: uuid }` |

- Refresh tokens are **hashed (sha256)** before persistence — raw tokens are never stored
- Rotation on refresh: old session is invalidated, new hash persisted atomically
- Revocation: single-session or full-user wipe available
- Connection-based WebSocket auth: token validated once at connection time, not per-subscription

---

## Signup Flow (4-Step)

Steps are tracked in `users.signupStep` (`signup_step` enum):

| Step | `signupStep` Value | Action |
|------|--------------------|--------|
| 0 | `INITIAL` | User record created, email code generated |
| 1 | `EMAIL_SENT` | Verification code sent to email |
| 2 | `EMAIL_VERIFIED` | Email code confirmed |
| 3 | `PHONE_SENT` | Phone number submitted, SMS code sent |
| 4 | `COMPLETED` | Phone code confirmed — account active |

```
initiateSignup(firstName, lastName, email, password)
  → validate email format + password strength (8 chars, 1 uppercase, 1 digit)
  → check uniqueness
  → hashPassword (bcrypt)
  → createUser (signupStep: INITIAL)
  → generate + store emailVerificationCode
  → return { token, user }   ← JWT issued immediately for subsequent steps

verifyEmail(userId, code)    → EMAIL_VERIFIED
submitPhoneNumber(...)       → PHONE_SENT + phoneVerificationCode generated
verifyPhone(userId, code)    → COMPLETED
```

**Important:** JWT is issued at step 0, before email verification. Clients are expected to enforce `signupStep === 'COMPLETED'` before allowing API access.

---

## Login Flow

```
login(email, password)
  → normalize email (trim + lowercase)
  → findByEmail → not found → badInput ("Invalid email or password")   ← no email enumeration
  → comparePassword (bcrypt)
  → generateJWT (15m)
  → generateRefreshToken (30d) + persist hashed session
  → return { token, refreshToken, user }
```

Login is allowed at any signup stage — redirect to appropriate step based on `signupStep`.

---

## Refresh Token Rotation

```
refreshAccessToken(refreshToken)
  → verify JWT (type === 'refresh')
  → hasActiveRefreshTokenSession(hash, userId)   ← revocation check
  → generateJWT (new access token)
  → generateRefreshToken (new refresh token)
  → rotateRefreshTokenSession(old hash → new hash)   ← atomic swap
  → return { token, refreshToken }
```

If the session is not found (revoked or expired), throws `unauthorized`.

---

## User Roles

Defined in `userRoleEnum`:

| Role | Use |
|------|-----|
| `CUSTOMER` | Default; places orders |
| `DRIVER` | Sends heartbeats, executes deliveries |
| `BUSINESS_OWNER` | Manages own business; requires `businessId` |
| `BUSINESS_EMPLOYEE` | Operates within own business; requires `businessId` |
| `ADMIN` | Admin panel operations |
| `SUPER_ADMIN` | Elevated admin |

Business roles (`BUSINESS_OWNER`, `BUSINESS_EMPLOYEE`) require a non-null `businessId` — enforced in `createUser`.

---

## Password Rules (Validation in AuthService)

- Minimum 8 characters
- At least one uppercase letter
- At least one digit
- Applied on both `initiateSignup` and admin `createUser`

---

## Admin User Creation (Bypass Signup)

`createUser(...)` skips the verification steps entirely — account is `COMPLETED` immediately. Used by SUPER_ADMIN for provisioning business employees, drivers, etc.

---

## User Schema Fields (Notable)

| Field | Type | Notes |
|-------|------|-------|
| `referralCode` | unique text | Null until generated; used for referral tracking |
| `flagColor` | text | Admin moderation flag (`yellow` default) |
| `adminNote` | text | Internal admin annotation |
| `preferredLanguage` | text | UI localization hint |
| `deletedAt` | timestamp | **Soft delete** — never hard-deleted |
| `emailVerificationCode` | text | Cleared after verification |
| `phoneVerificationCode` | text | Cleared after verification |

---

## Referral System

- A user signs up with a referral code → `createReferral(referrerId, newUserId, code)` persists to `referrals` table
- Referral records tracked but there is no automated reward engine yet
- Table: `api/database/schema/referrals.ts`

---

## Rate Limiting on Auth Endpoints

Auth operations are on the **strict tier** (20 req / 15 min per user-id/email):
- `Login`
- `InitiateSignup`
- `RefreshToken`

See `docs/BACKEND/API.md` (B1) for the full three-tier rate limiting model.

---

## Known Gaps

- Email/SMS sending is logged only — no actual email/SMS provider wired
- OTP attempt limits not enforced (any number of guesses allowed, only rate limit applies) — flagged in O5 (Security)
- No account lockout after repeated failed logins
- Refresh token cleanup job not scheduled (expired sessions accumulate in DB)
