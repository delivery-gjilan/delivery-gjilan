import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

import { SignupStep, UserRole } from '@/generated/types.generated';
import { orders } from './orders';
import { businesses } from './businesses';
import { userAddress } from './userAddress';

const signupStepValues = ['INITIAL', 'EMAIL_SENT', 'EMAIL_VERIFIED', 'PHONE_SENT', 'COMPLETED'] as const;
[...signupStepValues] satisfies SignupStep[];

const userRoleValues = ['CUSTOMER', 'DRIVER', 'SUPER_ADMIN', 'ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE'] as const;
[...userRoleValues] satisfies UserRole[];

export const signupStepEnum = pgEnum('signup_step', signupStepValues);
export const userRoleEnum = pgEnum('user_role', userRoleValues);

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    address: text('address'),
    phoneNumber: text('phone_number'),
    emailVerified: boolean('email_verified').default(false).notNull(),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    signupStep: signupStepEnum('signup_step').default('INITIAL').notNull(),
    role: userRoleEnum('role').default('CUSTOMER').notNull(),
    preferredLanguage: text('preferred_language').default('en').notNull(),
    emailOptOut: boolean('email_opt_out').default(false).notNull(),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    emailVerificationCode: text('email_verification_code'),
    phoneVerificationCode: text('phone_verification_code'),
    adminNote: text('admin_note'),
    flagColor: text('flag_color').default('yellow'),
    isDemoAccount: boolean('is_demo_account').default(false).notNull(),
    isBanned: boolean('is_banned').default(false).notNull(),
    imageUrl: text('image_url'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
});

export const usersRelations = relations(users, ({ many, one }) => ({
    orders: many(orders, { relationName: 'orderCustomer' }),
    driverOrders: many(orders, { relationName: 'orderDriver' }),
    business: one(businesses, {
        fields: [users.businessId],
        references: [businesses.id],
    }),
    addresses: many(userAddress),
}));

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;
