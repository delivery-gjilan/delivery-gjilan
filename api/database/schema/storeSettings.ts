import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * Store Settings table - stores global application settings
 */
export const storeSettings = pgTable('store_settings', {
    id: text('id').primaryKey().default('default'), // Single row with id 'default'
    isStoreClosed: boolean('is_store_closed').default(false).notNull(),
    closedMessage: text('closed_message').default('We are too busy at the moment. Please come back later!'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});
