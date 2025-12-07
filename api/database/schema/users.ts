import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    address: text('address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;
