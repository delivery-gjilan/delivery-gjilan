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

## Auth on Upload Routes

The `requireAuth` middleware is defined locally in `uploadRoutes.ts` (not the shared GraphQL context middleware). It decodes the JWT via `decodeJwtToken()` from `api/src/lib/utils/authUtils.ts` and sets `req.userId` and `req.userRole` on the request.

**Role restrictions (enforced):**

| Folder | Allowed roles |
|--------|--------------|
| `businesses` | `ADMIN`, `SUPER_ADMIN` |
| `products` | `ADMIN`, `SUPER_ADMIN`, `BUSINESS_OWNER`, `BUSINESS_EMPLOYEE` |
| `categories` | `ADMIN`, `SUPER_ADMIN`, `BUSINESS_OWNER`, `BUSINESS_EMPLOYEE` |

DELETE is allowed by all business roles.

---

## Caller Patterns (Admin Panel)

Upload calls in the admin panel use `process.env.NEXT_PUBLIC_API_URL` as the base URL (stripping the `/graphql` suffix) with `http://localhost:4000` as fallback. The `authToken` from `localStorage` is forwarded as `Authorization: Bearer <token>`. Three call sites:

- `admin-panel/src/components/businesses/ProductsBlock.tsx` (`uploadImage` / `deleteImage`)
- `admin-panel/src/app/dashboard/businesses/page.tsx` (`uploadImage` / `deleteImage`)
- `admin-panel/src/app/dashboard/market/page.tsx` (inside `ProductModal`)

**Old image cleanup:** When a product or business image is replaced, `deleteImage` is called on the old S3 URL before uploading the new one. This prevents orphaned S3 objects.

---

## Old Image Cleanup Gap

~~When a business or product image is **replaced**, the old S3 object is never deleted.~~ **Fixed:** all three admin panel upload sites now call `DELETE /api/upload/image` on the old URL before uploading a replacement.

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | — | Yes | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | — | Yes | AWS IAM secret key |
| `AWS_BUCKET` | `''` | Yes | S3 bucket name |
| `AWS_REGION` | `eu-north-1` | No | AWS region |

---

## Pricing And Tier Visibility

The upload implementation uses standard AWS S3 APIs and does not contain account-tier metadata. Free-tier eligibility is determined at the AWS account level, not in application code.

Use AWS Billing and Cost Management to determine current S3 tier and limits for the active account:

1. Billing and Cost Management → Free Tier.
2. Check S3 free-tier usage and month-to-date consumption.
3. Billing and Cost Management → Bills or Cost Explorer to see charged S3 dimensions (storage GB-month, requests, data transfer out).
4. Confirm the same AWS account as the `AWS_ACCESS_KEY_ID` configured for this API environment.

App-level limits in this repository:

- Upload file size limit: 5 MB per file (Multer `limits.fileSize`).
- Allowed image MIME types: JPEG, JPG, PNG, WebP.
- Upload paths are restricted to `businesses`, `products`, and `categories`.

Operationally, S3 spend is driven by object count, object size, request volume (`PutObject`, `DeleteObject`, reads from public URLs), and outbound data transfer.

---

## Known Gaps / Security Notes

- **No role check on upload** — any authenticated user (including customers) can upload to any folder (`businesses/`, `products/`, `categories/`). Role enforcement should be added to `requireAuth` or a separate middleware. _(Tracked in O6)_
- **No file type enforcement at service level** — Multer middleware should already restrict MIME types; verify `uploadMiddleware.ts` has a `fileFilter` configured.
- **No size limit documented** — confirm Multer `limits.fileSize` is set in `uploadMiddleware.ts`.
- **S3 bucket is public** — access is controlled by bucket policy, not object ACL. If the bucket policy is misconfigured, all uploads become world-readable.
