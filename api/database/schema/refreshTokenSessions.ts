import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const refreshTokenSessions = pgTable(
    'refresh_token_sessions',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        tokenHash: text('token_hash').notNull(),
        replacedByTokenHash: text('replaced_by_token_hash'),
        revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
        expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => ({
        tokenHashUnique: uniqueIndex('refresh_token_sessions_token_hash_uq').on(table.tokenHash),
        userIdIdx: index('refresh_token_sessions_user_id_idx').on(table.userId),
        expiresAtIdx: index('refresh_token_sessions_expires_at_idx').on(table.expiresAt),
    }),
);

export type DbRefreshTokenSession = typeof refreshTokenSessions.$inferSelect;
export type NewDbRefreshTokenSession = typeof refreshTokenSessions.$inferInsert;
