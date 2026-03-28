# Audit Logging

<!-- MDS:B10 | Domain: Backend | Updated: 2026-03-18 -->
<!-- Depends-On: B1, B5 -->
<!-- Depended-By: none -->
<!-- Nav: Adding a new auditable action → add to actionTypeValues in auditLogs.ts, add to the action types table below, and call auditLogRepo.createLog() in the relevant service. Adding a new entity type → add to entityTypeValues. -->

## Overview

Every significant mutation in the system writes a record to the `audit_logs` table. The log is append-only (no updates or deletes on audit rows). It captures who did what, to which entity, when, and from where.

**Source files:**
- Schema: `api/database/schema/auditLogs.ts`
- Repository: `api/src/repositories/AuditLogRepository.ts`

---

## Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `actor_id` | uuid (nullable) | FK → users.id (SET NULL on delete). Null for SYSTEM actor. |
| `actor_type` | enum `actor_type` | See actor types below |
| `action` | enum `action_type` | See action types below |
| `entity_type` | enum `entity_type` | See entity types below |
| `entity_id` | uuid (nullable) | Null if entity was deleted after logging |
| `metadata` | jsonb (nullable) | Context: old/new values, changes array, etc. |
| `ip_address` | varchar(45) | IPv6-safe length |
| `user_agent` | text | Client user agent string |
| `created_at` | timestamptz | Auto (CURRENT_TIMESTAMP) |

**Indexes:**
- `idx_audit_logs_actor_id` on `actor_id`
- `idx_audit_logs_entity` on `(entity_type, entity_id)` (composite)
- `idx_audit_logs_created_at` on `created_at`

---

## Actor Types

| Value | Description |
|-------|-------------|
| `ADMIN` | Admin user (ADMIN or SUPER_ADMIN role) performing an action |
| `BUSINESS` | Business owner or employee |
| `DRIVER` | Driver user |
| `CUSTOMER` | Customer user |
| `SYSTEM` | Automated process (e.g., watchdog, scheduled job) — `actor_id` is null |

---

## Entity Types

`USER`, `BUSINESS`, `PRODUCT`, `ORDER`, `SETTLEMENT`, `DRIVER`, `CATEGORY`, `SUBCATEGORY`, `DELIVERY_ZONE`

---

## Action Types

### User Management
| Action | Description |
|--------|-------------|
| `USER_CREATED` | New user registered |
| `USER_UPDATED` | User profile updated |
| `USER_DELETED` | User soft-deleted |
| `USER_ROLE_CHANGED` | Role promotion/demotion |

### Authentication
| Action | Description |
|--------|-------------|
| `USER_LOGIN` | Successful login |
| `USER_LOGOUT` | Logout / session revocation |
| `PASSWORD_CHANGED` | Password updated |
| `PASSWORD_RESET` | Password reset flow completed |

### Business Management
| Action | Description |
|--------|-------------|
| `BUSINESS_CREATED` | New business created |
| `BUSINESS_UPDATED` | Business details updated |
| `BUSINESS_DELETED` | Business deleted |
| `BUSINESS_APPROVED` | Business application approved by admin |
| `BUSINESS_REJECTED` | Business application rejected by admin |

### Product Management
| Action | Description |
|--------|-------------|
| `PRODUCT_CREATED` | New product added |
| `PRODUCT_UPDATED` | Product details updated |
| `PRODUCT_DELETED` | Product deleted |
| `PRODUCT_PUBLISHED` | Product visibility turned on |
| `PRODUCT_UNPUBLISHED` | Product visibility turned off |
| `PRODUCT_AVAILABILITY_CHANGED` | `is_available` toggled |
| `PRODUCT_PRICE_CHANGED` | Any price field changed |

### Order Management
| Action | Description |
|--------|-------------|
| `ORDER_CREATED` | New order placed |
| `ORDER_UPDATED` | Order details updated |
| `ORDER_STATUS_CHANGED` | Status transition (e.g., PENDING → PREPARING) |
| `ORDER_CANCELLED` | Order cancelled |
| `ORDER_ASSIGNED` | Driver assigned to order |
| `ORDER_DELIVERED` | Order marked as delivered |

### Driver Management
| Action | Description |
|--------|-------------|
| `DRIVER_CREATED` | Driver profile created |
| `DRIVER_UPDATED` | Driver profile updated |
| `DRIVER_APPROVED` | Driver application approved |
| `DRIVER_REJECTED` | Driver application rejected |
| `DRIVER_STATUS_CHANGED` | Connection status changed |

### Settlement Management
| Action | Description |
|--------|-------------|
| `SETTLEMENT_CREATED` | Settlement record created |
| `SETTLEMENT_PAID` | Settlement fully paid |
| `SETTLEMENT_PARTIAL_PAID` | Partial payment recorded |
| `SETTLEMENT_UNSETTLED` | Settlement marked as unsettled/reversed |

### Category Management
| Action | Description |
|--------|-------------|
| `CATEGORY_CREATED` | Product category created |
| `CATEGORY_UPDATED` | Category updated |
| `CATEGORY_DELETED` | Category deleted (hard delete cascades to products) |
| `SUBCATEGORY_CREATED` | Subcategory created |
| `SUBCATEGORY_UPDATED` | Subcategory updated |
| `SUBCATEGORY_DELETED` | Subcategory deleted |

---

## Repository API

```typescript
const auditLogRepo = new AuditLogRepository(db);

// Write
await auditLogRepo.createLog({
  actorId: 'user-uuid',          // optional (null for SYSTEM)
  actorType: 'ADMIN',
  action: 'PRODUCT_PRICE_CHANGED',
  entityType: 'PRODUCT',
  entityId: 'product-uuid',
  metadata: { oldPrice: 500, newPrice: 450 },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Query
const { logs, total } = await auditLogRepo.getAuditLogs({
  actorType: 'ADMIN',
  entityType: 'ORDER',
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-12-31T23:59:59Z',
  limit: 50,
  offset: 0,
});
```

### Filter Options (`AuditLogFilters`)

| Field | Type | Notes |
|-------|------|-------|
| `actorId` | string? | Filter by specific user |
| `actorType` | ActorType? | Filter by actor category |
| `action` | ActionType? | Filter by specific action |
| `entityType` | EntityType? | Filter by entity type |
| `entityId` | string? | Filter by specific entity |
| `startDate` | string? | ISO 8601 timestamp |
| `endDate` | string? | ISO 8601 timestamp |
| `limit` | number? | Pagination page size |
| `offset` | number? | Pagination offset |

Results are always ordered `created_at DESC`.

---

## Metadata Conventions

The `metadata` JSONB field is unstructured but follows these patterns in practice:

```jsonb
// Field change
{ "oldValue": "oldName", "newValue": "newName" }

// Price change
{ "oldPrice": 500, "newPrice": 450, "field": "base_price" }

// Status transition
{ "from": "PENDING", "to": "PREPARING" }

// Multi-field update
{ "changes": ["name", "description", "base_price"] }
```

There is no schema validation on `metadata`. Callers define what to store.

---

## Known Gaps

- **No audit log purge/archive job.** Logs grow indefinitely. For high-volume production use, a retention policy should be added (e.g., archive logs older than 90 days to cold storage).
- **Admin GraphQL does not expose audit logs yet.** `AuditLogRepository` exists but there is no GraphQL resolver or admin-panel UI for querying logs.
- **`ip_address` and `user_agent` may be empty** in GraphQL mutations since the GraphQL context does not currently forward these to services — only REST route handlers have easy access to `req.ip`.
