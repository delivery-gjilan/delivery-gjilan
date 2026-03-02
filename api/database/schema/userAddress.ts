import { relations, sql } from 'drizzle-orm';
import { pgTable, timestamp, integer, uuid, doublePrecision, text, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userAddress = pgTable('user_address', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    latitude:  doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    addressName: text('address_name'),
    displayName: text('display_name'),
    priority: integer('priority').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (t) => ([
    index('idx_user_address_user_id').on(t.userId),
]));

export const userAddressRelations = relations(userAddress, ({ one }) => ({
    product: one(users, {
        fields: [userAddress.userId],
        references: [users.id],
    }),
}));

export type DbUserAddress = typeof userAddress.$inferSelect;
export type NewDbUserAddress = typeof userAddress.$inferInsert;
