# Auth & User Management

<!-- MDS:B5 | Domain: Backend | Updated: 2026-04-09 -->
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

## Driver Architecture (Two-Table Model)

Drivers are **not** a standalone entity — they are users with `role = 'DRIVER'` **plus** a row in the `drivers` table linked by `userId` (unique FK, cascade-delete).

| Table | Responsibility |
|-------|---------------|
| `users` | Identity, auth, role, email, name, phone |
| `drivers` | Location, heartbeat, connection status, commission, vehicle flag, battery, ETA |

The `drivers` table is **required** for driver operation — `driverHeartbeat`, `updateDriverLocation`, and all other driver mutations query it by `userId`. You cannot remove this table.

**To promote an existing user to driver:** update `users.role = 'DRIVER'` + insert a `drivers` row with that `userId`. No mutation exists for this yet — requires a DB operation or an `adminPromoteToDriver` mutation.

**Current auth flows:**
- **Mobile-driver app** uses the standard `login` mutation (returns 15-min JWT + 30-day refresh token, stored in SecureStore)
- **`driverLogin` / `driverRegister` mutations** are registered in the schema and also return proper 15-min tokens + refresh tokens (via `DriverAuthService` using `AuthRepository.createRefreshTokenSession`)

`driverRegister` creates both rows atomically:
1. Inserts `users` row with `role = 'DRIVER'` via `AuthRepository.createUserWithRole`
2. Inserts `drivers` row via `DriverRepository.createDriver(userId)`

**Key files:**
- `api/src/services/DriverAuthService.ts`
- `api/src/repositories/DriverRepository.ts`
- `api/database/schema/drivers.ts`
- `api/src/models/Driver/resolvers/Mutation/driverRegister.ts`
- `api/src/models/Driver/Driver.graphql` — defines `DriverAuthResult`, `DriverBasicInfo`, `DriverLoginInput`, `DriverRegisterInput`

---

## User Schema Fields (Notable)

| Field | Type | Notes |
|-------|------|-------|
| `flagColor` | text | Admin moderation flag (`yellow` default) |
| `adminNote` | text | Internal admin annotation |
| `preferredLanguage` | text | UI localization hint |
| `deletedAt` | timestamp | **Soft delete** — never hard-deleted |
| `emailVerificationCode` | text | Cleared after verification |
| `phoneVerificationCode` | text | Cleared after verification |

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

---

## RBAC and Tenant Enforcement

Current authorization behavior across API resolvers and admin-panel:

- Login allows `SUPER_ADMIN`, `ADMIN`, `BUSINESS_OWNER`, `BUSINESS_EMPLOYEE` into admin-panel.
- Admin-panel layouts enforce role-aware route access (not only authentication):
  - `SUPER_ADMIN` can access all admin-panel routes.
  - `ADMIN` is blocked from super-admin-only routes.
  - `BUSINESS_OWNER` is limited to business-facing routes (`orders`, `categories`, `products`, `statistics`, `settings`).
  - `BUSINESS_EMPLOYEE` is limited to business-facing routes and blocked from `settings`.

### User Management Rules

- `SUPER_ADMIN` can create/update/delete users across the platform.
- `BUSINESS_OWNER` can create/update/delete only `BUSINESS_EMPLOYEE` users in the owner's own business.
- `BUSINESS_OWNER` cannot change employee role type or reassign employees to another business.
- `setUserPermissions` supports platform admins and business owners; owners are restricted to employees in their own business.
- `updateUserNote` is restricted by tenant scope for business roles (same business only).

### Query Visibility Rules

- `users` query:
  - `SUPER_ADMIN`/`ADMIN`: full list.
  - `BUSINESS_OWNER`/`BUSINESS_EMPLOYEE`: users in own business plus self.
  - other roles: forbidden.
- `drivers` query:
  - `SUPER_ADMIN`/`ADMIN`: full list.
  - `BUSINESS_OWNER`/`BUSINESS_EMPLOYEE`: drivers in own business.
  - other roles: forbidden.

### Business and Product Mutation Rules

- `createBusiness`: super-admin only.
- `createBusinessWithOwner`: super-admin only, creates business + `BUSINESS_OWNER` in one DB transaction.
- `updateBusiness`, `deleteBusiness`, `setBusinessSchedule`:
  - platform admins: any business.
  - business owner: own business only.
  - business employee: own business only + `manage_settings` permission.
- Product mutations (`createProduct`, `updateProduct`, `deleteProduct`, `updateProductsOrder`):
  - platform admins: any business.
  - business owner: own business only.
  - business employee: own business only + `manage_products` permission.
- Deal enforcement (`isOffer`):
  - only platform admins can create or mark products as deals/offers.
  - business roles cannot set `isOffer: true`.
- Global store status mutation (`updateStoreStatus`):
  - super-admin only (controls store live/close and global banner state).

### Provisioning Pattern

Recommended provisioning sequence:

1. Create business and owner atomically via `createBusinessWithOwner` when owner credentials are available.
2. Use `createBusiness` when owner will be assigned later.
3. Create or assign a `BUSINESS_OWNER` with matching `businessId`.
4. Let the owner create `BUSINESS_EMPLOYEE` users and assign permissions.

The admin-panel business creation screen supports both modes:

1. `createBusinessWithOwner` (single atomic mutation)
2. `createBusiness` only

### Resolver User Shape Mapping

User-returning resolvers normalize DB users through a shared mapper:

- `api/src/models/User/resolvers/utils/toUserParent.ts`
- Ensures required GraphQL `User` parent fields are present (`preferredLanguage`, `permissions`, `isOnline`) without implying database schema changes.
- Computed fields still resolve through field resolvers (`permissions`, `isOnline`, `driverConnection`, etc.).
