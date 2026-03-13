# Security Audit Checklist (2026-03-13)

This file tracks the risks found during the code scan and what to fix next.

## How to use this file

- Change each item status from `[ ]` to `[x]` when done.
- Add the date and short notes under each completed item.
- Start from Critical, then High, then Medium.

## Critical

- [ ] Rotate exposed secrets immediately
  - Scope: API JWT/refresh secrets, AWS credentials, Firebase service account key.
  - Files to review:
    - `api/.env`
  - Action:
    - Generate new secrets/keys.
    - Update runtime secret manager values.
    - Revoke/disable old credentials.
    - Restart affected services.
  - Notes:

## High

- [ ] Remove tracked env file with real values from git history
  - Files:
    - `mobile-admin/.env`
  - Action:
    - Move real values to local-only env or secret manager.
    - Keep only placeholders in `.env.example`.
    - Remove from git history if sensitive values were committed.
  - Notes:

- [ ] Validate and restrict tracked Firebase app config exposure
  - Files:
    - `mobile-customer/google-services.json`
    - `mobile-customer/GoogleService-Info.plist`
    - `mobile-driver/google-services.json`
  - Action:
    - Confirm these are intended to be committed.
    - Restrict Firebase keys by app package/bundle/signing cert.
    - Enable abuse monitoring and alerting.
  - Notes:

- [ ] Patch vulnerable dependencies (runtime first)
  - Files:
    - `api/package.json`
    - `package-lock.json`
  - Priority packages:
    - `express-rate-limit` (upgrade to patched version)
    - AWS SDK chain used by S3 client
    - `fast-xml-parser` transitive chain
  - Action:
    - Run `npm audit` and update vulnerable packages.
    - Re-test API upload/auth flows after upgrades.
  - Notes:

## Medium

- [ ] Enable strict CSP in production
  - File:
    - `api/src/index.ts`
  - Current behavior:
    - CSP is disabled globally for helmet.
  - Action:
    - Enable CSP in production.
    - Keep relaxed dev behavior only for local GraphiQL if needed.
  - Notes:

- [ ] Align driver auth token lifecycle with refresh rotation model
  - File:
    - `api/src/services/DriverAuthService.ts`
  - Current behavior:
    - Driver access tokens are long-lived.
  - Action:
    - Use short-lived access token + refresh token rotation, same pattern as main auth service.
  - Notes:

- [ ] Add authorization checks on upload endpoints
  - File:
    - `api/src/routes/uploadRoutes.ts`
  - Current behavior:
    - Endpoint authenticates user, but resource/role authorization should be explicit.
  - Action:
    - Add role/resource ownership checks for upload and delete.
  - Notes:

- [ ] Harden web token storage fallback assumptions
  - Files:
    - `mobile-customer/utils/secureTokenStore.ts`
    - `mobile-driver/utils/secureTokenStore.ts`
    - `mobile-business/utils/secureTokenStore.ts`
    - `mobile-admin/utils/secureTokenStore.ts`
  - Current behavior:
    - Uses SecureStore on native, AsyncStorage on web.
  - Action:
    - Keep short TTL for web tokens.
    - Ensure forced logout/session invalidation support.
    - Document web threat model assumptions.
  - Notes:

## Suggested execution order

1. Secret rotation and revocation.
2. Remove sensitive tracked files/history and enforce secret scanning.
3. Dependency patching and regression testing.
4. CSP and upload authorization hardening.
5. Driver auth lifecycle alignment.

## Verification checklist

- [ ] All old secrets revoked and replaced.
- [ ] No real secrets in tracked `.env` files.
- [ ] `npm audit` high/critical issues reduced to acceptable baseline.
- [ ] Production API runs with CSP enabled.
- [ ] Upload routes enforce authorization rules.
- [ ] Driver auth uses short-lived access tokens plus refresh rotation.

## Optional automation to add

- pre-commit secret scanning (`gitleaks` or `trufflehog`)
- CI security checks (`npm audit` with fail threshold)
- dependency update automation (Dependabot/Renovate)
