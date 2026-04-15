import { pgTable, uuid, doublePrecision, timestamp, pgEnum, boolean, numeric, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Connection status enum for drivers
 * - CONNECTED: Driver actively sending heartbeats
 * - STALE: No heartbeat for 45 seconds (warning state)
 * - LOST: No heartbeat for 90 seconds (offline state)
 * - DISCONNECTED: Subscription closed or never connected
 */
const driverConnectionStatusValues = ['CONNECTED', 'STALE', 'LOST', 'DISCONNECTED'] as const;
export const driverConnectionStatus = pgEnum('driver_connection_status', driverConnectionStatusValues);

export type DriverConnectionStatusType = (typeof driverConnectionStatusValues)[number];

/**
 * Vehicle type enum for drivers
 * - GAS: Internal combustion engine vehicle
 * - ELECTRIC: Electric vehicle (e-bike, e-scooter, EV)
 */
const driverVehicleTypeValues = ['GAS', 'ELECTRIC'] as const;
export const driverVehicleType = pgEnum('driver_vehicle_type', driverVehicleTypeValues);

export type DriverVehicleTypeType = (typeof driverVehicleTypeValues)[number];

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
    * CONNECTED -> STALE (45s) -> LOST (90s) -> DISCONNECTED (subscription closed)
   */
  connectionStatus: driverConnectionStatus('connection_status').default('DISCONNECTED').notNull(),

  /**
   * Last reported battery percentage from the driver's device.
   * Null means unknown or user has not opted in.
   */
  batteryLevel: integer('battery_level'),

  /**
   * Whether driver has explicitly opted in to battery sharing.
   */
  batteryOptIn: boolean('battery_opt_in').default(false).notNull(),

  /**
   * Timestamp when battery level was last updated by the mobile app.
   */
  batteryUpdatedAt: timestamp('battery_updated_at', {
    withTimezone: true,
    mode: 'string'
  }),

  /**
   * Optional charging state flag from device telemetry.
   */
  isCharging: boolean('is_charging'),

  // Commission and payment tracking
  commissionPercentage: numeric('commission_percentage', { precision: 5, scale: 2 }).default('0').notNull(),

  /**
   * Whether the driver uses their own vehicle for deliveries.
   * Used by settlement engine to evaluate DRIVER_VEHICLE_BONUS rules.
   */
  hasOwnVehicle: boolean('has_own_vehicle').default(false).notNull(),

  /**
   * Type of vehicle the driver uses (GAS or ELECTRIC).
   * Used for dispatch prioritization (gas vehicles for far orders)
   * and future bonus calculations.
   */
  vehicleType: driverVehicleType('vehicle_type'),

  /**
   * Optional per-order bonus paid to drivers who use their own vehicle.
   * Applied by settlement engine when hasOwnVehicle=true.
   */
  ownVehicleBonusAmount: numeric('own_vehicle_bonus_amount', { precision: 10, scale: 2 }).default('0').notNull(),

  /**
   * Maximum number of active orders this driver can handle simultaneously
   * Configurable per driver (default: 2)
   * Used to prevent driver overload
   */
  maxActiveOrders: numeric('max_active_orders', { precision: 3, scale: 0 }).default('2').notNull(),

  // Soft-delete
  isDeleted: boolean('is_deleted').default(false).notNull(),

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
