import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { SignupStep, UserRole } from '@/generated/types.generated';

const signupStepValues = [
    'INITIAL',
    'EMAIL_SENT',
    'EMAIL_VERIFIED',
    'PHONE_SENT',
    'COMPLETED',
] as const satisfies SignupStep[];

const userRoleValues = ['CUSTOMER', 'DRIVER', 'SUPER_ADMIN'] as const satisfies UserRole[];

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
    emailVerificationCode: text('email_verification_code'),
    phoneVerificationCode: text('phone_verification_code'),
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
