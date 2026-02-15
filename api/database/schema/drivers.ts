import { pgTable, uuid, doublePrecision, timestamp, pgEnum, boolean, numeric } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Connection status enum for drivers
 * - CONNECTED: Driver actively sending heartbeats
 * - STALE: No heartbeat for 15 seconds (warning state)
 * - LOST: No heartbeat for 30 seconds (offline state)
 * - DISCONNECTED: Subscription closed or never connected
 */
const driverConnectionStatusValues = ['CONNECTED', 'STALE', 'LOST', 'DISCONNECTED'] as const;
export const driverConnectionStatus = pgEnum('driver_connection_status', driverConnectionStatusValues);

export type DriverConnectionStatusType = (typeof driverConnectionStatusValues)[number];

/**
 * Drivers table - stores driver-specific information
 * Relationship to Users table via userId (FK)
 */
export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  
  // Foreign key to users table
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Location fields
  driverLat: doublePrecision('driver_lat'),
  driverLng: doublePrecision('driver_lng'),
  
  /**
   * Last time driver sent a heartbeat (every 5 seconds)
   * Used by watchdog to determine connection status
   */
  lastHeartbeatAt: timestamp('last_heartbeat_at', { 
    withTimezone: true, 
    mode: 'string' 
  }),

  /**
   * Last time location was actually written to DB (throttled to every 10s)
   * Separate from heartbeat to optimize DB writes
   */
  lastLocationUpdate: timestamp('last_location_update', { 
    withTimezone: true, 
    mode: 'string' 
  }),

  /**
   * Timestamp when driver was marked as DISCONNECTED
   * Used for analytics and reconnection handling
   */
  disconnectedAt: timestamp('disconnected_at', { 
    withTimezone: true, 
    mode: 'string' 
  }),

  /**
   * User's preference when they toggle "I want to work"
   * Independent of actual connection status
   * Driver can set this to true, but only be CONNECTED if sending updates
   */
  onlinePreference: boolean('online_preference').default(false).notNull(),

  /**
   * System-calculated connection status
   * Updated by watchdog service based on lastHeartbeatAt
   * CONNECTED -> STALE (15s) -> LOST (30s) -> DISCONNECTED (subscription closed)
   */
  connectionStatus: driverConnectionStatus('connection_status').default('DISCONNECTED').notNull(),

  // Commission and payment tracking
  commissionPercentage: numeric('commission_percentage', { precision: 5, scale: 2 }).default('0').notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const driversRelations = relations(drivers, ({ one }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
}));

export type DbDriver = typeof drivers.$inferSelect;
export type NewDbDriver = typeof drivers.$inferInsert;
