# Driver Schema Refactoring - Migration Guide

Step-by-step guide to implement the driver schema refactoring and connection state system.

## Prerequisites

- PostgreSQL database with existing users table
- Drizzle ORM setup
- GraphQL server with context initialization
- Environment to test before deploying to production

## Phase 1: Database Migration

### Step 1a: Create Drivers Table

Run the migration:

```bash
# Using Drizzle CLI
npx drizzle-kit generate:pg

# Or manually run SQL
psql your_database < api/database/migrations/0001_add_drivers_table.sql
```

Verify the table was created:

```sql
-- Check table exists
SELECT * FROM information_schema.tables WHERE table_name = 'drivers';

-- Check columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'drivers';

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'drivers';
```

### Step 1b: Migrate Existing Driver Data

```sql
-- Create drivers for all existing drivers
INSERT INTO drivers (user_id, driver_lat, driver_lng, last_location_update, online_preference, connection_status)
SELECT 
  id,
  driver_lat,
  driver_lng,
  driver_location_updated_at,
  is_online,
  CASE 
    WHEN driver_location_updated_at > NOW() - INTERVAL '30 seconds' 
    THEN 'CONNECTED'
    ELSE 'DISCONNECTED'
  END
FROM users
WHERE role = 'DRIVER';

-- Verify migration
SELECT COUNT(*) FROM drivers;  -- Should match number of DRIVER users
SELECT COUNT(*) FROM users WHERE role = 'DRIVER';
```

## Phase 2: Code Implementation

### Step 2a: Create Repository

Create [api/src/repositories/DriverRepository.ts](../api/src/repositories/DriverRepository.ts):

```bash
# File already provided - just verify it's in place
ls -la api/src/repositories/DriverRepository.ts
```

### Step 2b: Create Heartbeat Service

Create [api/src/services/DriverHeartbeatService.ts](../api/src/services/DriverHeartbeatService.ts):

```bash
# File already provided - just verify it's in place
ls -la api/src/services/DriverHeartbeatService.ts
```

### Step 2c: Create High-Level Service

Create [api/src/services/DriverService.ts](../api/src/services/DriverService.ts):

```bash
# File already provided - just verify it's in place
ls -la api/src/services/DriverService.ts
```

### Step 2d: Create Service Initialization

Create [api/src/services/driverServices.init.ts](../api/src/services/driverServices.init.ts):

```bash
# File already provided - just verify it's in place
ls -la api/src/services/driverServices.init.ts
```

## Phase 3: GraphQL Schema Updates

### Step 3a: Add Driver Types

Create [api/src/models/Driver/Driver.graphql](../api/src/models/Driver/Driver.graphql):

This adds:
- `DriverConnectionStatus` enum
- `DriverConnection` type
- `driverConnection` field on User
- `adminSetDriverConnectionStatus` mutation
- `driverConnectionStatusChanged` subscription

### Step 3b: Update Mutation Resolvers

#### updateDriverLocation

Replace existing [api/src/models/User/resolvers/Mutation/updateDriverLocation.ts](../api/src/models/User/resolvers/Mutation/updateDriverLocation.ts) with the new version that:
- Uses DriverService instead of AuthRepository
- Updates drivers table
- Triggers heartbeat check
- Maintains backward compatibility with users table

#### updateDriverOnlineStatus

Replace existing [api/src/models/User/resolvers/Mutation/updateDriverOnlineStatus.ts](../api/src/models/User/resolvers/Mutation/updateDriverOnlineStatus.ts) with the new version that:
- Uses DriverService
- Updates drivers.onlinePreference
- Maintains backward compatibility

### Step 3c: Add New Mutation Resolvers

Create:
- [api/src/models/Driver/resolvers/Mutation/adminSetDriverConnectionStatus.ts](../api/src/models/Driver/resolvers/Mutation/adminSetDriverConnectionStatus.ts)

### Step 3d: Add User Resolver

Create [api/src/models/Driver/resolvers/Driver.ts](../api/src/models/Driver/resolvers/Driver.ts):

This resolver:
- Adds `driverConnection` field to User type
- Fetches data from drivers table
- Maintains backward compatibility

### Step 3e: Add Subscription

Create [api/src/models/Driver/resolvers/Subscription/driverConnectionStatusChanged.ts](../api/src/models/Driver/resolvers/Subscription/driverConnectionStatusChanged.ts):

Optional per-driver subscription for granular updates.

## Phase 4: Context Setup

### Update GraphQL Context

In your server initialization (e.g., `src/index.ts` or wherever you create your Apollo context):

```typescript
import { initializeDriverServices, createContextWithDriverServices } from '@/services/driverServices.init';

async function startServer() {
  // Initialize driver services (starts heartbeat)
  await initializeDriverServices();

  // Create Apollo server with updated context
  const server = new ApolloServer({
    schema,
    context: (args) => {
      const baseContext = createContext(args); // Your existing context creator
      return createContextWithDriverServices(baseContext);
    },
  });

  await server.listen({ port: 4000 });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  shutdownDriverServices();
  process.exit(0);
});
```

## Phase 5: Testing

### 5a: Unit Tests

Create test file: `api/src/services/__tests__/DriverHeartbeatService.test.ts`

```typescript
describe('DriverHeartbeatService', () => {
  let service: DriverHeartbeatService;
  let driverRepo: DriverRepository;

  beforeEach(async () => {
    // Setup test database
    // Create service instance
  });

  it('marks drivers as CONNECTED if update is recent', async () => {
    // Create driver with lastLocationUpdate = 10 seconds ago
    // Create driver with connectionStatus = DISCONNECTED
    // Run checkNow()
    // Assert connectionStatus = CONNECTED
  });

  it('marks drivers as DISCONNECTED if update is stale', async () => {
    // Create driver with lastLocationUpdate = 60 seconds ago
    // Create driver with connectionStatus = CONNECTED
    // Run checkNow()
    // Assert connectionStatus = DISCONNECTED
  });

  it('publishes driversUpdated subscription on status change', async () => {
    // Spy on pubsub.publish
    // Trigger status change
    // Assert subscription was called
  });
});
```

### 5b: Integration Tests

```typescript
describe('Driver Location Updates', () => {
  it('updates connection status on location mutation', async () => {
    // Call updateDriverLocation mutation
    // Wait for heartbeat check
    // Assert driverConnection.connectionStatus = CONNECTED
  });

  it('broadcasts to admin subscription', async () => {
    // Setup subscription listener on driversUpdated
    // Call updateDriverLocation mutation
    // Assert subscription received update
  });
});
```

### 5c: Manual Testing

```bash
# 1. Start API with heartbeat
npm run dev

# 2. Test location update
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -d '{
    "query": "mutation { updateDriverLocation(latitude: 42.465, longitude: 21.469) { id driverConnection { connectionStatus lastLocationUpdate } } }"
  }'

# 3. Verify response shows CONNECTED
# Should see: connectionStatus: "CONNECTED"

# 4. Test online preference toggle
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -d '{
    "query": "mutation { updateDriverOnlineStatus(isOnline: true) { id driverConnection { onlinePreference } } }"
  }'

# 5. Watch admin dashboard to see updates via subscription
```

## Phase 6: Deployment

### Pre-Deployment Checklist

- [ ] Database migration tested on staging
- [ ] All tests passing
- [ ] Backward compatibility verified (existing data still works)
- [ ] GraphQL schema generated and committed
- [ ] Code reviewed
- [ ] Heartbeat interval tuned for environment (5s dev, 10s prod)
- [ ] Connection timeout appropriate for region (30s default)

### Deployment Steps

1. **Backup Database** (required)
   ```bash
   pg_dump your_database > backup.sql
   ```

2. **Deploy Code**
   ```bash
   git push origin main
   # Your CI/CD deploys to staging
   ```

3. **Run Migrations**
   ```bash
   npx drizzle-kit migrate:pg
   ```

4. **Verify Migrations**
   ```sql
   SELECT COUNT(*) FROM drivers;
   SELECT COUNT(*) FROM users WHERE role = 'DRIVER';
   ```

5. **Start Server**
   - Server automatically initializes driver services
   - Heartbeat checker starts running
   - Monitor logs for `[DriverHeartbeat] Started` message

6. **Monitor**
   ```bash
   # Watch server logs
   tail -f api.logs | grep DriverHeartbeat
   
   # Check admin dashboard
   # Verify drivers appear with connection status
   # Test location updates
   ```

## Phase 7: Cleanup (Optional - After 1-2 Release Cycles)

After confirming everything works and clients are updated, remove deprecated fields from users table:

```sql
-- REMOVE ONLY AFTER CONFIRMING NO CLIENTS USE THESE FIELDS

-- Remove from users table
ALTER TABLE users DROP COLUMN driver_lat;
ALTER TABLE users DROP COLUMN driver_lng;
ALTER TABLE users DROP COLUMN driver_location_updated_at;
-- Note: Keep is_online for now, or map it to drivers.online_preference

-- Update any indexes that referenced these columns
-- Update GraphQL schema to remove deprecated fields
```

## Configuration Tuning

### For Development
```typescript
new DriverHeartbeatService(db, driverRepository, authRepository, {
  intervalMs: 5000,      // Quick feedback
  timeoutSeconds: 30,    // Reasonable timeout
});
```

### For Production (Urban)
```typescript
new DriverHeartbeatService(db, driverRepository, authRepository, {
  intervalMs: 5000,      // Standard check frequency
  timeoutSeconds: 30,    // Strict timeout for dense coverage
});
```

### For Production (Rural)
```typescript
new DriverHeartbeatService(db, driverRepository, authRepository, {
  intervalMs: 10000,     // Less frequent checks
  timeoutSeconds: 60,    // More generous timeout
});
```

### For Testing
```typescript
new DriverHeartbeatService(db, driverRepository, authRepository, {
  intervalMs: 1000,      // Very frequent for faster tests
  timeoutSeconds: 5,     // Quick state changes
});
```

## Troubleshooting

### Drivers stuck as DISCONNECTED

**Problem**: Drivers keep appearing as disconnected even after sending location updates.

**Check**:
```sql
-- Verify data is being updated
SELECT id, last_location_update, connection_status 
FROM drivers 
ORDER BY last_location_update DESC 
LIMIT 5;

-- Check if lastLocationUpdate is actually recent
SELECT id, last_location_update, 
       EXTRACT(EPOCH FROM (NOW() - last_location_update)) as seconds_ago
FROM drivers 
WHERE id = 'DRIVER_ID';
```

**Solution**:
- Check heartbeat service is running: `GET /health/heartbeat`
- Verify timeout is appropriate
- Check logs for errors

### Heartbeat consuming too much CPU

**Problem**: Database queries increasing with many drivers.

**Solution**:
- Increase `intervalMs` to reduce query frequency
- Add database indexes (already in migration)
- Monitor query performance

### Subscription not receiving updates

**Problem**: Admin dashboard not getting driver updates.

**Check**:
```bash
# Check pubsub is working
# Verify subscription is connected
# Check network/websocket connection
```

**Solution**:
- Verify `topics.allDriversChanged()` is published
- Check GraphQL context has pubsub
- Ensure driver data changed (not just connection status)

## Rollback Plan

If issues arise, you can quickly rollback:

```bash
# 1. Stop server
# 2. Revert code to previous version
# 3. Database still has all data in drivers table
# 4. Restart with old code - will read from users table as before
# 5. Driver history preserved
```

No data loss with this architecture.

## Monitoring

### Key Metrics to Track

```
- Number of drivers in CONNECTED vs DISCONNECTED state
- Average time for status transition
- Heartbeat service response time
- Number of drivers per check cycle
- Subscription latency to admin dashboard
```

### Logging

Enable debug logging:

```typescript
// In development
process.env.DEBUG = 'driver-*';

// Will log:
// [DriverHeartbeat] Started (interval: 5000ms, timeout: 30s)
// [DriverHeartbeat] Marked 2 drivers as CONNECTED (recent)
// [DriverHeartbeat] Marked 1 driver as DISCONNECTED (stale)
```

## Success Criteria

After deployment, verify:

- [ ] All drivers appear on admin map
- [ ] Driver connection status updates in real-time
- [ ] Admin dashboard receives subscription updates
- [ ] Location updates work from mobile driver app
- [ ] Online preference toggle works
- [ ] No performance degradation with large driver counts
- [ ] Graceful shutdown stops heartbeat checker
- [ ] Can manually recover stuck drivers with admin mutation
