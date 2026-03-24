import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

const messageAlertTypeValues = ['INFO', 'WARNING', 'URGENT'] as const;
export const messageAlertTypeEnum = pgEnum('message_alert_type', messageAlertTypeValues);

const messageSenderRoleValues = ['ADMIN', 'DRIVER'] as const;
export const messageSenderRoleEnum = pgEnum('message_sender_role', messageSenderRoleValues);

export const driverMessages = pgTable('driver_messages', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    adminId: uuid('admin_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    senderRole: messageSenderRoleEnum('sender_role').notNull(),
    body: text('body').notNull(),
    alertType: messageAlertTypeEnum('alert_type').notNull().default('INFO'),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const driverMessagesRelations = relations(driverMessages, ({ one }) => ({
    admin: one(users, { fields: [driverMessages.adminId], references: [users.id] }),
    driver: one(users, { fields: [driverMessages.driverId], references: [users.id] }),
}));
