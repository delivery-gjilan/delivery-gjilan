import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

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
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});
