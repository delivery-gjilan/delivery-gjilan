import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { messageAlertTypeEnum } from './driverMessages';

const businessMessageSenderRoleValues = ['ADMIN', 'BUSINESS'] as const;
export const businessMessageSenderRoleEnum = pgEnum('business_message_sender_role', businessMessageSenderRoleValues);

export { messageAlertTypeEnum };

export const businessMessages = pgTable('business_messages', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    adminId: uuid('admin_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    businessUserId: uuid('business_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    senderRole: businessMessageSenderRoleEnum('sender_role').notNull(),
    body: text('body').notNull(),
    alertType: messageAlertTypeEnum('alert_type').notNull().default('INFO'),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const businessMessagesRelations = relations(businessMessages, ({ one }) => ({
    admin: one(users, { fields: [businessMessages.adminId], references: [users.id] }),
    businessUser: one(users, { fields: [businessMessages.businessUserId], references: [users.id] }),
}));
