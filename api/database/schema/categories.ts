import { pgTable, serial, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
