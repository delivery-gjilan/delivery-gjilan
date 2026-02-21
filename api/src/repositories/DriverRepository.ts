import { DbType } from '@/database';
import { drivers as driversTable, DbDriver, NewDbDriver, DriverConnectionStatusType } from '@/database/schema/drivers';
import { eq, sql, and, isNotNull, or } from 'drizzle-orm';

// Thresholds for connection state transitions (in seconds)
export const CONNECTION_THRESHOLDS = {
  STALE: 45,      // No heartbeat for 45s -> STALE (iOS background location fires every ~30-60s)
  LOST: 90,       // No heartbeat for 90s -> LOST
  LOCATION_THROTTLE: 10, // Only write location every 10s
  LOCATION_DISTANCE_METERS: 5, // Only write if moved more than 5m
} as const;

export class DriverRepository {
  constructor(private db: DbType) {}

  /**
   * Create a driver profile for a user
   */
  async createDriver(userId: string, data?: Partial<NewDbDriver>): Promise<DbDriver> {
    const [driver] = await this.db
      .insert(driversTable)
      .values({
        userId,
        ...data,
      })
      .onConflictDoNothing({ target: driversTable.userId })
      .returning();

    if (driver) {
      return driver;
    }

    // If the driver already exists, fetch it to keep this operation idempotent.
    const existing = await this.getDriverByUserId(userId);
    if (!existing) {
      throw new Error('Failed to create driver profile');
    }
    return existing;
  }

  /**
   * Get driver by user ID
   */
  async getDriverByUserId(userId: string): Promise<DbDriver | undefined> {
    const [driver] = await this.db
      .select()
      .from(driversTable)
      .where(eq(driversTable.userId, userId));
    return driver;
  }

  /**
   * Get all drivers
   */
  async getAllDrivers(): Promise<DbDriver[]> {
    return this.db.select().from(driversTable);
  }

  /**
   * Get all drivers with activeOnly filter
   */
  async getDriversByConnectionStatus(
    connectionStatus: DriverConnectionStatusType
  ): Promise<DbDriver[]> {
    return this.db
      .select()
      .from(driversTable)
      .where(eq(driversTable.connectionStatus, connectionStatus));
  }

  /**
   * Process heartbeat from driver
   * - Always updates lastHeartbeatAt
   * - Sets connectionStatus to CONNECTED
   * - Clears disconnectedAt
   * - Optionally updates location if throttle conditions met
   */
  async processHeartbeat(
    userId: string,
    latitude: number,
    longitude: number,
    shouldUpdateLocation: boolean
  ): Promise<DbDriver | undefined> {
    const now = new Date().toISOString();
    
    const updateData: Partial<NewDbDriver> & { lastHeartbeatAt: string; connectionStatus: DriverConnectionStatusType; disconnectedAt: null } = {
      lastHeartbeatAt: now,
      connectionStatus: 'CONNECTED',
      disconnectedAt: null,
    };

    // Only update location if throttle allows
    if (shouldUpdateLocation) {
      updateData.driverLat = latitude;
      updateData.driverLng = longitude;
      updateData.lastLocationUpdate = now;
    }

    const [driver] = await this.db
      .update(driversTable)
      .set(updateData)
      .where(eq(driversTable.userId, userId))
      .returning();
    
    return driver;
  }

  /**
   * Update driver location and timestamp (legacy method for backward compatibility)
   */
  async updateDriverLocation(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<DbDriver | undefined> {
    const [driver] = await this.db
      .update(driversTable)
      .set({
        driverLat: latitude,
        driverLng: longitude,
        lastLocationUpdate: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
        connectionStatus: 'CONNECTED',
        disconnectedAt: null,
      })
      .where(eq(driversTable.userId, userId))
      .returning();
    return driver;
  }

  /**
   * Update driver's online preference (user toggle)
   */
  async updateOnlinePreference(userId: string, isOnline: boolean): Promise<DbDriver | undefined> {
    const [driver] = await this.db
      .update(driversTable)
      .set({
        onlinePreference: isOnline,
      })
      .where(eq(driversTable.userId, userId))
      .returning();
    return driver;
  }

  /**
   * Update connection status (called by watchdog)
   */
  async updateConnectionStatus(
    userId: string,
    status: DriverConnectionStatusType,
    setDisconnectedAt: boolean = false
  ): Promise<DbDriver | undefined> {
    const updateData: Partial<NewDbDriver> = {
      connectionStatus: status,
    };

    if (setDisconnectedAt && status === 'DISCONNECTED') {
      updateData.disconnectedAt = new Date().toISOString();
    }

    const [driver] = await this.db
      .update(driversTable)
      .set(updateData)
      .where(eq(driversTable.userId, userId))
      .returning();
    return driver;
  }

  /**
   * Mark drivers as STALE if lastHeartbeatAt is between 15-30 seconds ago
   * Only affects drivers currently marked as CONNECTED
   */
  async markStaleDrivers(): Promise<DbDriver[]> {
    const result = await this.db
      .update(driversTable)
      .set({
        connectionStatus: 'STALE',
      })
      .where(
        and(
          isNotNull(driversTable.lastHeartbeatAt),
          // Between 15 and 30 seconds ago (use raw SQL for interval to avoid parameterization)
          sql`${driversTable.lastHeartbeatAt} < now() - interval '${sql.raw(String(CONNECTION_THRESHOLDS.STALE))} seconds'`,
          sql`${driversTable.lastHeartbeatAt} >= now() - interval '${sql.raw(String(CONNECTION_THRESHOLDS.LOST))} seconds'`,
          // Only if currently CONNECTED
          eq(driversTable.connectionStatus, 'CONNECTED')
        )
      )
      .returning();

    return result;
  }

  /**
   * Mark drivers as LOST if lastHeartbeatAt is more than 30 seconds ago
   * Affects drivers marked as CONNECTED or STALE
   */
  async markLostDrivers(): Promise<DbDriver[]> {
    const result = await this.db
      .update(driversTable)
      .set({
        connectionStatus: 'LOST',
      })
      .where(
        and(
          isNotNull(driversTable.lastHeartbeatAt),
          // More than 30 seconds ago (use raw SQL for interval to avoid parameterization)
          sql`${driversTable.lastHeartbeatAt} < now() - interval '${sql.raw(String(CONNECTION_THRESHOLDS.LOST))} seconds'`,
          // Only if currently CONNECTED or STALE
          or(
            eq(driversTable.connectionStatus, 'CONNECTED'),
            eq(driversTable.connectionStatus, 'STALE')
          )
        )
      )
      .returning();

    return result;
  }

  /**
   * Mark driver as DISCONNECTED (subscription closed)
   */
  async markDriverDisconnected(userId: string): Promise<DbDriver | undefined> {
    const [driver] = await this.db
      .update(driversTable)
      .set({
        connectionStatus: 'DISCONNECTED',
        disconnectedAt: new Date().toISOString(),
      })
      .where(eq(driversTable.userId, userId))
      .returning();
    return driver;
  }

  /**
   * Restore driver session on reconnect
   */
  async restoreDriverSession(userId: string): Promise<DbDriver | undefined> {
    const [driver] = await this.db
      .update(driversTable)
      .set({
        connectionStatus: 'CONNECTED',
        lastHeartbeatAt: new Date().toISOString(),
        disconnectedAt: null,
      })
      .where(eq(driversTable.userId, userId))
      .returning();
    return driver;
  }

  /**
   * Get driver count grouped by connection status — single SQL query, no full table scan.
   * Use this instead of getAllDrivers() + forEach for monitoring/logging.
   */
  async getConnectionStatusCounts(): Promise<Record<DriverConnectionStatusType, number>> {
    const rows = await this.db
      .select({
        status: driversTable.connectionStatus,
        count: sql<number>`COUNT(*)::INT`,
      })
      .from(driversTable)
      .groupBy(driversTable.connectionStatus);

    const counts: Record<DriverConnectionStatusType, number> = {
      CONNECTED: 0,
      STALE: 0,
      LOST: 0,
      DISCONNECTED: 0,
    };
    rows.forEach((row) => {
      counts[row.status] = row.count;
    });
    return counts;
  }

  /**
   * Delete driver (cascade delete via FK)
   */
  async deleteDriver(userId: string): Promise<boolean> {
    const result = await this.db
      .delete(driversTable)
      .where(eq(driversTable.userId, userId))
      .returning();
    return result.length > 0;
  }
}
