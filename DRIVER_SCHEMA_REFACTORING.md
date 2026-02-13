# Driver Schema Refactoring & Connection State System

Complete architecture for separating driver data from users table and implementing connection state tracking.

## Overview

This refactoring splits driver-specific functionality into a dedicated `drivers` table while maintaining the users table for authentication and general user info. It introduces a system-calculated `connectionStatus` separate from the user's `onlinePreference` toggle.

### Key Concepts

- **`onlinePreference`**: User toggle ("I want to work") - what the driver set
- **`connectionStatus`**: System-calculated ("I'm actually connected") - based on location update recency
- **Why separate?** Dispatch logic needs both signals:
  - Driver marked offline by system but preferred online? Flag for re-sync
  - Driver preferred online but disconnected? Don't dispatch orders
  - Driver both online and connected? Ready for work

## Database Schema

### New Table: `drivers`

```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Location
  driver_lat DOUBLE PRECISION,
  driver_lng DOUBLE PRECISION,
  
  -- Last location update timestamp
  last_location_update TIMESTAMP WITH TIME ZONE,
  
  -- User's preference: "I want to work" toggle
  online_preference BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- System-calculated: actively receiving updates?
  connection_status ENUM('CONNECTED', 'DISCONNECTED') NOT NULL DEFAULT 'DISCONNECTED',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_connection_status ON drivers(connection_status);
CREATE INDEX idx_drivers_online_preference ON drivers(online_preference);
CREATE INDEX idx_drivers_last_location_update ON drivers(last_location_update DESC NULLS LAST);
```

### Migration from Existing Data

When migrating from users table to drivers table:

```sql
-- Step 1: Create drivers for all users with role='DRIVER'
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

-- Step 2: (Optionally) Remove these fields from users table after verification
-- ALTER TABLE users DROP COLUMN driver_lat;
-- ALTER TABLE users DROP COLUMN driver_lng;
-- ALTER TABLE users DROP COLUMN driver_location_updated_at;
-- ALTER TABLE users DROP COLUMN is_online;
```

## Implementation Components

### 1. DriverRepository

**Location**: `api/src/repositories/DriverRepository.ts`

Handles all driver data persistence:

```typescript
class DriverRepository {
  // Create driver profile
  async createDriver(userId: string): Promise<DbDriver>
  
  // Get driver by user
  async getDriverByUserId(userId: string): Promise<DbDriver>
  
  // Location updates (called by updateDriverLocation mutation)
  async updateDriverLocation(userId: string, lat: number, lng: number): Promise<DbDriver>
  
  // User preference toggle
  async updateOnlinePreference(userId: string, isOnline: boolean): Promise<DbDriver>
  
  // Connection status (called by heartbeat)
  async updateConnectionStatus(userId: string, status: 'CONNECTED' | 'DISCONNECTED'): Promise<DbDriver>
  
  // Bulk updates for heartbeat efficiency
  async markStaleDriversAsDisconnected(timeoutSeconds: number): Promise<number>
  async markRecentDriversAsConnected(timeoutSeconds: number): Promise<number>
}
```

### 2. DriverHeartbeatService

**Location**: `api/src/services/DriverHeartbeatService.ts`

Runs on a timer to check driver connection status:

```typescript
class DriverHeartbeatService {
  constructor(
    config?: {
      intervalMs?: number;        // How often to check (default: 5000ms)
      timeoutSeconds?: number;    // When to mark disconnected (default: 30s)
    }
  )
  
  // Start/stop the checker
  start(): void
  stop(): void
  
  // Check now
  async checkNow(): Promise<void>
  async checkDriver(userId: string): Promise<'CONNECTED' | 'DISCONNECTED' | null>
  
  getStatus(): { isRunning: boolean; intervalMs: number; timeoutSeconds: number }
}
```

**Logic Flow**:

```
Every 5 seconds:
  1. Get all drivers from database
  2. For each driver:
     - If lastLocationUpdate is within 30 seconds: status = CONNECTED
     - If lastLocationUpdate is older than 30 seconds: status = DISCONNECTED
     - If status changed: update database + publish to GraphQL subscription
  3. Admin dashboard receives real-time update
```

### 3. Updated Mutations

#### updateDriverLocation

Existing mutation stays the same, but now:
- Updates `drivers.driverLat`, `drivers.driverLng`, `drivers.lastLocationUpdate`
- Optionally triggers immediate heartbeat check for that driver
- Publishes to `driversUpdated` subscription

```graphql
mutation UpdateDriverLocation($latitude: Float!, $longitude: Float!) {
  updateDriverLocation(latitude: $latitude, longitude: $longitude) {
    id
    driverConnection {
      lastLocationUpdate
      connectionStatus
      onlinePreference
    }
    driverLocation {
      latitude
      longitude
    }
  }
}
```

#### updateDriverOnlineStatus

Now updates `drivers.onlinePreference` (user's preference):

```graphql
mutation UpdateDriverOnlineStatus($isOnline: Boolean!) {
  updateDriverOnlineStatus(isOnline: $isOnline) {
    id
    driverConnection {
      onlinePreference
      connectionStatus
    }
  }
}
```

### 4. GraphQL Schema Updates

Add new types/fields:

```graphql
enum DriverConnectionStatus {
  CONNECTED
  DISCONNECTED
}

type DriverConnection {
  """User's preference: "I want to work" toggle"""
  onlinePreference: Boolean!
  
  """System-calculated: is driver actively sending updates?"""
  connectionStatus: DriverConnectionStatus!
  
  """Last time driver sent location update"""
  lastLocationUpdate: Date
}

extend type User {
  # Existing fields still present:
  # driverLocation: Location
  # driverLocationUpdatedAt: Date
  # isOnline: Boolean (deprecated, use driverConnection.onlinePreference)
  
  # New field for driver-specific data
  driverConnection: DriverConnection
}

extend type Mutation {
  # Existing mutations updated:
  updateDriverLocation(latitude: Float!, longitude: Float!): User!
  updateDriverOnlineStatus(isOnline: Boolean!): User!
  
  # Optional: admins can manually manage connection status (for testing/recovery)
  adminSetDriverConnectionStatus(driverId: ID!, status: DriverConnectionStatus!): User!
}

extend type Subscription {
  # Existing:
  driversUpdated: [User!]!
  
  # Optional: per-driver updates for more granular subscriptions
  driverConnectionStatusChanged(driverId: ID!): DriverConnection!
}
```

## Implementation Workflow

### Phase 1: Database Setup (Non-breaking)

1. Create `drivers` table (parallel to existing `users` table)
2. Migrate data using SQL script
3. Keep `users` fields for backward compatibility

### Phase 2: Repository & Service

1. Create `DriverRepository` class
2. Create `DriverHeartbeatService` class
3. Register service in GraphQL context

### Phase 3: Update Mutations

1. Update `updateDriverLocation` to use `DriverRepository`
2. Update `updateDriverOnlineStatus` to use `DriverRepository`
3. Trigger heartbeat check after location update (optional optimization)

### Phase 4: GraphQL Schema

1. Add `DriverConnection` type
2. Add `driverConnection` field to `User`
3. Update mutation return types
4. Add new subscription (optional)

### Phase 5: Server Startup

```typescript
// In your context initialization or server startup
const driverHeartbeat = new DriverHeartbeatService(
  db,
  driverRepository,
  authRepository,
  {
    intervalMs: 5000,          // Check every 5 seconds
    timeoutSeconds: 30,        // Driver goes offline after 30 seconds inactive
  }
);

// Start the heartbeat on server startup
driverHeartbeat.start();

// Stop on server shutdown
process.on('SIGTERM', () => {
  driverHeartbeat.stop();
  process.exit(0);
});

// Make available in GraphQL context
context.driverHeartbeat = driverHeartbeat;
```

## Admin Dashboard Updates

The `driversUpdated` subscription already works but now receives:

```typescript
// Before (from users table)
{
  id: "driver-123",
  isOnline: true,  // User preference
  driverLocation: { latitude, longitude },
  driverLocationUpdatedAt: "2026-02-12T10:30:00Z"
}

// After (from drivers table)
{
  id: "driver-123",
  driverConnection: {
    onlinePreference: true,       // User set this
    connectionStatus: "CONNECTED", // System calculated this
    lastLocationUpdate: "2026-02-12T10:30:00Z"
  },
  driverLocation: { latitude, longitude },
  driverLocationUpdatedAt: "2026-02-12T10:30:00Z"  // Still present for backward compat
}
```

Example dispatch logic in admin frontend:

```typescript
// Show driver as "Ready for Orders" if:
// 1. User wants to work (onlinePreference = true)
// 2. System confirms they're connected (connectionStatus = CONNECTED)
const isReadyForOrders = driver.driverConnection.onlinePreference && 
                         driver.driverConnection.connectionStatus === 'CONNECTED';

// Visual states for admin map:
if (isReadyForOrders) {
  // Green dot - ready
} else if (driver.driverConnection.onlinePreference && 
           driver.driverConnection.connectionStatus === 'DISCONNECTED') {
  // Yellow dot - wants work but not connected (sync issue?)
} else {
  // Red dot - offline
}
```

## Configuration Options

### Timeout Scenarios

**30 seconds** (recommended default):
- Suitable for active delivery logistics
- Accounts for brief network blips
- Good balance between responsiveness and false disconnects

**60 seconds** (conservative):
- More forgiving for spotty connections
- Or when drivers in rural areas

**10 seconds** (aggressive):
- For metro/dense areas with consistent connectivity
- Requires GPS location every 10 seconds

### Interval Scenarios

**5 seconds** (recommended):
- Minimal database load
- Fast updates to admin dashboard
- Matches typical location update frequency

**10 seconds** (simpler):
- Half the DB queries
- Still responsive enough

**1 second** (aggressive):
- For real-time tracking apps
- Not recommended for most cases

### Tuning Example

```typescript
// Rural area with spotty connectivity
new DriverHeartbeatService(db, driverRepository, authRepository, {
  intervalMs: 10000,      // Check less frequently
  timeoutSeconds: 60,     // Much more forgiving
});

// Metro area with dense coverage
new DriverHeartbeatService(db, driverRepository, authRepository, {
  intervalMs: 5000,
  timeoutSeconds: 15,     // Stricter
});
```

## Backward Compatibility

During migration, you can keep the `users` table fields populated:

```typescript
// In updateDriverLocation mutation
async updateDriverLocation(userId, lat, lng) {
  // Update new drivers table
  await driverRepository.updateDriverLocation(userId, lat, lng);
  
  // Also update users table for backward compatibility
  await authRepository.updateUser(userId, {
    driverLat: lat,
    driverLng: lng,
    driverLocationUpdatedAt: new Date().toISOString(),
  });
  
  return user;
}
```

Once clients are updated, remove the deprecated fields from `users` table.

## Testing

### Manual Testing

```bash
# Terminal 1: Start API with heartbeat
npm run dev

# Terminal 2: Simulate driver location updates
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { updateDriverLocation(latitude: 42.465, longitude: 21.469) { id driverConnection { connectionStatus } } }"}'

# Watch admin dashboard for real-time updates
```

### Unit Tests

```typescript
describe('DriverHeartbeatService', () => {
  it('marks drivers as CONNECTED if lastLocationUpdate is recent', async () => {
    // Create driver with update 10 seconds ago
    // Run heartbeat check
    // Assert connectionStatus = 'CONNECTED'
  });

  it('marks drivers as DISCONNECTED if lastLocationUpdate is stale', async () => {
    // Create driver with update 60 seconds ago
    // Run heartbeat check with 30s timeout
    // Assert connectionStatus = 'DISCONNECTED'
  });

  it('publishes driversUpdated subscription on status change', async () => {
    // Spy on pubsub.publish
    // Trigger status change
    // Assert subscription was called
  });
});
```

## Migration Checklist

- [ ] Create `drivers` table and indexes
- [ ] Migrate existing driver data
- [ ] Create `DriverRepository` class
- [ ] Create `DriverHeartbeatService` class
- [ ] Update `updateDriverLocation` mutation
- [ ] Update `updateDriverOnlineStatus` mutation
- [ ] Add `DriverConnection` GraphQL type
- [ ] Update `User` GraphQL type with `driverConnection` field
- [ ] Register heartbeat service in GraphQL context
- [ ] Test location updates trigger proper status changes
- [ ] Test admin dashboard receives subscription updates
- [ ] Test connection status calculation (edge cases, timeouts)
- [ ] Deploy and monitor
- [ ] Remove deprecated `users` table fields (after 1-2 releases)

## Future Enhancements

1. **Per-driver subscriptions**: `driverConnectionStatusChanged(driverId!)`
2. **Zone-based timeouts**: Different timeouts for metro vs rural
3. **Webhook notifications**: Alert admin if driver goes offline
4. **Connection history**: Track connection events for analytics
5. **Geo-fencing integration**: Auto-disable when driver leaves zone
6. **Battery/signal strength**: Include device metrics in connection status
