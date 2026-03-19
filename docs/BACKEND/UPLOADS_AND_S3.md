# Uploads & S3

<!-- MDS:B9 | Domain: Backend | Updated: 2026-03-18 -->
<!-- Depends-On: B1, B5 -->
<!-- Depended-By: O6 -->
<!-- Nav: Changing upload flow or S3 config → update this file. Adding a new allowed folder → update allowedFolders list in uploadRoutes.ts. -->

## Overview

Image uploads are handled by two REST endpoints (not GraphQL) defined in `api/src/routes/uploadRoutes.ts`. The service layer is `api/src/services/S3Service.ts`. Uploads are stored in a public AWS S3 bucket.

**Mounted at:** `POST /api/upload/image`, `DELETE /api/upload/image`  
**Auth:** JWT required on both routes (via local `requireAuth` middleware)

---

## Upload Route: `POST /api/upload/image`

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `image` | File | Yes | Processed by Multer (`uploadMiddleware.single('image')`) |
| `folder` | string | Yes | Must be one of: `businesses`, `products`, `categories` |

**Response (success):**
```json
{ "success": true, "url": "https://bucket.s3.region.amazonaws.com/businesses/1234567890-uuid.jpg" }
```

**Response (error):**
```json
{ "success": false, "error": "No file provided" }
```

---

## Delete Route: `DELETE /api/upload/image`

**Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `imageUrl` | string | Yes | Must pass `S3Service.isS3Url()` check |

The `isS3Url()` method validates the URL matches the pattern `https://{bucket}.s3.{region}.amazonaws.com/...` before attempting deletion. Non-S3 URLs are rejected with 400.

---

## S3Service

**File:** `api/src/services/S3Service.ts`

Initialized as a module-level singleton at startup. Throws `Error('AWS credentials not configured')` if `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` env vars are missing.

### Key Generation

```
{folder}/{timestamp}-{uuid}.{extension}

Examples:
  businesses/1700000000000-550e8400-e29b-41d4-a716-446655440000.jpg
  products/1700000000000-550e8400-e29b-41d4-a716-446655440000.png
  categories/1700000000000-550e8400-e29b-41d4-a716-446655440000.webp
```

Extension is taken from the original filename (lowercased). Defaults to `jpg` if no extension found.

### Public URL Format

```
https://{AWS_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{folder}/{timestamp}-{uuid}.{ext}
```

Bucket policy handles public read access — no ACL headers are set on the `PutObjectCommand`.

### Delete Flow

1. Extract S3 key from URL via regex match against `https://{bucket}.s3.{region}.amazonaws.com/(.+)`
2. Issue `DeleteObjectCommand` with that key
3. Returns `boolean` — `true` on success, `false` if URL parse fails or S3 error

---

## Upload Middleware

**File:** `api/src/lib/middleware/uploadMiddleware.ts`  
Configured with Multer. Handles multipart parsing and puts the file in `req.file` as a buffer.

---

## Auth on Upload Routes

The `requireAuth` middleware is defined locally in `uploadRoutes.ts` (not the shared GraphQL context middleware). It decodes the JWT via `decodeJwtToken()` from `api/src/lib/utils/authUtils.ts` and sets `req.userId` and `req.userRole` on the request.

**Important:** `requireAuth` only validates that the token is present and valid. It does **not** enforce role restrictions or ownership checks (e.g., a customer could upload to `businesses/`). This is a known security gap documented in [O6](../OPERATIONS/SECURITY_AUDIT_2026-03-13.md).

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | — | Yes | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | — | Yes | AWS IAM secret key |
| `AWS_BUCKET` | `''` | Yes | S3 bucket name |
| `AWS_REGION` | `eu-north-1` | No | AWS region |

---

## Known Gaps / Security Notes

- **No role check on upload** — any authenticated user (including customers) can upload to any folder (`businesses/`, `products/`, `categories/`). Role enforcement should be added to `requireAuth` or a separate middleware. _(Tracked in O6)_
- **No file type enforcement at service level** — Multer middleware should already restrict MIME types; verify `uploadMiddleware.ts` has a `fileFilter` configured.
- **No size limit documented** — confirm Multer `limits.fileSize` is set in `uploadMiddleware.ts`.
- **S3 bucket is public** — access is controlled by bucket policy, not object ACL. If the bucket policy is misconfigured, all uploads become world-readable.
