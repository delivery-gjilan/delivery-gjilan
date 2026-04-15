import { pgTable, text, boolean, timestamp, integer, doublePrecision } from 'drizzle-orm/pg-core';

/**
 * Store Settings table - stores global application settings
 */
export const storeSettings = pgTable('store_settings', {
    id: text('id').primaryKey().default('default'), // Single row with id 'default'
    isStoreClosed: boolean('is_store_closed').default(false).notNull(),
    closedMessage: text('closed_message').default('We are too busy at the moment. Please come back later!'),
    bannerEnabled: boolean('banner_enabled').default(false).notNull(),
    bannerMessage: text('banner_message'),
    bannerType: text('banner_type').default('info').notNull(), // 'info' | 'warning' | 'success'
    dispatchModeEnabled: boolean('dispatch_mode_enabled').default(false).notNull(),
    googleMapsNavEnabled: boolean('google_maps_nav_enabled').default(false).notNull(),
    inventoryModeEnabled: boolean('inventory_mode_enabled').default(false).notNull(),
    /** Minutes before estimated ready time to notify drivers (0 = on READY). */
    earlyDispatchLeadMinutes: integer('early_dispatch_lead_minutes').default(5).notNull(),
    /** Minutes to delay business notification after order is placed (0 = immediate). */
    businessGracePeriodMinutes: integer('business_grace_period_minutes').default(0).notNull(),
    /** Global kill-switch for direct-dispatch (business call-in) orders. */
    directDispatchEnabled: boolean('direct_dispatch_enabled').default(false).notNull(),
    /** Minimum number of free drivers to reserve for platform orders before allowing direct dispatch. */
    directDispatchDriverReserve: integer('direct_dispatch_driver_reserve').default(2).notNull(),
    /** Distance threshold (km) beyond which gas vehicles are dispatched first (0 = disabled). */
    farOrderThresholdKm: doublePrecision('far_order_threshold_km').default(5).notNull(),
    /** Seconds gas drivers get head-start before electric drivers are also notified for far orders. */
    gasPriorityWindowSeconds: integer('gas_priority_window_seconds').default(30).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});
