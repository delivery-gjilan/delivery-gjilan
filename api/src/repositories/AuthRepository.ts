import { DbType } from '@/database';
import { DbUser, users } from '@/database/schema/users';
import { refreshTokenSessions } from '@/database/schema/refreshTokenSessions';
import { deviceTokens } from '@/database/schema/deviceTokens';
import { userAddress } from '@/database/schema/userAddress';
import { SignupStep } from '@/generated/types.generated';
import { eq, and, isNull, sql, inArray, gt } from 'drizzle-orm';

const userSelectColumns = {
    id: users.id,
    email: users.email,
    password: users.password,
    firstName: users.firstName,
    lastName: users.lastName,
    address: users.address,
    phoneNumber: users.phoneNumber,
    emailVerified: users.emailVerified,
    phoneVerified: users.phoneVerified,
    signupStep: users.signupStep,
    role: users.role,
    preferredLanguage: users.preferredLanguage,
    emailOptOut: users.emailOptOut,
    businessId: users.businessId,
    emailVerificationCode: users.emailVerificationCode,
    phoneVerificationCode: users.phoneVerificationCode,
    adminNote: users.adminNote,
    flagColor: users.flagColor,
    isDemoAccount: users.isDemoAccount,
    imageUrl: users.imageUrl,
    passwordResetToken: users.passwordResetToken,
    passwordResetExpiresAt: users.passwordResetExpiresAt,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    deletedAt: users.deletedAt,
};

function withDefaultIsBanned(row: Omit<DbUser, 'isBanned'>): DbUser {
    return { ...row, isBanned: false } as DbUser;
}

export class AuthRepository {
    constructor(private db: DbType) {}

    async createUser(firstName: string, lastName: string, email: string, hashedPassword: string): Promise<DbUser> {
        await this.db
            .insert(users)
            .values({
                firstName,
                lastName,
                email,
                password: hashedPassword,
                signupStep: 'INITIAL',
                emailVerified: false,
                phoneVerified: false,
                adminNote: null,
                flagColor: 'yellow',
            });

        const created = await this.findByEmail(email);
        if (!created) {
            throw new Error('Failed to create user');
        }
        return created;
    }

    async findByEmail(email: string): Promise<DbUser | undefined> {
        const [user] = await this.db
            .select(userSelectColumns)
            .from(users)
            .where(and(eq(users.email, email), isNull(users.deletedAt)));
        return user ? withDefaultIsBanned(user as Omit<DbUser, 'isBanned'>) : undefined;
    }

    async findById(id: string): Promise<DbUser | undefined> {
        const [user] = await this.db
            .select(userSelectColumns)
            .from(users)
            .where(and(eq(users.id, id), isNull(users.deletedAt)));
        return user ? withDefaultIsBanned(user as Omit<DbUser, 'isBanned'>) : undefined;
    }

    async updateSignupStep(userId: string, step: SignupStep): Promise<DbUser | undefined> {
        await this.db.update(users).set({ signupStep: step }).where(eq(users.id, userId));
        return this.findById(userId);
    }

    async setEmailVerificationCode(userId: string, code: string): Promise<DbUser | undefined> {
        await this.db
            .update(users)
            .set({
                emailVerificationCode: code,
                signupStep: 'EMAIL_SENT',
            })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async markEmailVerified(userId: string): Promise<DbUser | undefined> {
        await this.db
            .update(users)
            .set({
                emailVerified: true,
                signupStep: 'EMAIL_VERIFIED',
                emailVerificationCode: null,
            })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async setPhoneVerificationCode(userId: string, code: string): Promise<DbUser | undefined> {
        await this.db
            .update(users)
            .set({
                phoneVerificationCode: code,
                signupStep: 'PHONE_SENT',
            })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async verifyEmailCode(userId: string, code: string): Promise<DbUser | undefined> {
        const user = await this.findById(userId);
        if (!user || user.emailVerificationCode !== code) {
            return undefined;
        }

        await this.db
            .update(users)
            .set({
                emailVerified: true,
                signupStep: 'EMAIL_VERIFIED',
                emailVerificationCode: null,
            })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async verifyPhoneCode(userId: string, code: string): Promise<DbUser | undefined> {
        const user = await this.findById(userId);
        if (!user || user.phoneVerificationCode !== code) {
            return undefined;
        }

        await this.db
            .update(users)
            .set({
                phoneVerified: true,
                signupStep: 'COMPLETED',
                phoneVerificationCode: null,
            })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async setPhoneNumber(userId: string, phoneNumber: string): Promise<DbUser | undefined> {
        await this.db.update(users).set({ phoneNumber }).where(eq(users.id, userId));
        return this.findById(userId);
    }

    async setPhoneNumberAndComplete(userId: string, phoneNumber: string): Promise<DbUser | undefined> {
        await this.db
            .update(users)
            .set({ phoneNumber, phoneVerified: true, signupStep: 'COMPLETED' })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<DbUser | undefined> {
        await this.db
            .update(users)
            .set({ password: hashedPassword, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async setPasswordResetToken(userId: string, token: string, expiresAt: string): Promise<void> {
        await this.db
            .update(users)
            .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
            .where(eq(users.id, userId));
    }

    async findByPasswordResetToken(token: string): Promise<DbUser | undefined> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(and(eq(users.passwordResetToken, token), isNull(users.deletedAt), gt(users.passwordResetExpiresAt, sql`CURRENT_TIMESTAMP`)));
        return user;
    }

    async clearPasswordResetToken(userId: string): Promise<void> {
        await this.db
            .update(users)
            .set({ passwordResetToken: null, passwordResetExpiresAt: null })
            .where(eq(users.id, userId));
    }

    async createUserWithRole(
        firstName: string,
        lastName: string,
        email: string,
        hashedPassword: string,
        role: 'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE',
        businessId?: string,
        isDemoAccount = false,
    ): Promise<DbUser> {
        await this.db
            .insert(users)
            .values({
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role,
                businessId,
                signupStep: 'COMPLETED',
                emailVerified: true,
                phoneVerified: false,
                adminNote: null,
                flagColor: 'yellow',
                isDemoAccount,
            });

        const created = await this.findByEmail(email);
        if (!created) {
            throw new Error('Failed to create user with role');
        }
        return created;
    }

    async findAllUsers(limit = 2000, offset = 0): Promise<DbUser[]> {
        const rows = await this.db
            .select(userSelectColumns)
            .from(users)
            .where(isNull(users.deletedAt))
            .limit(limit)
            .offset(offset);
        return rows.map((row) => withDefaultIsBanned(row as Omit<DbUser, 'isBanned'>));
    }

    async findDrivers(): Promise<DbUser[]> {
        const rows = await this.db
            .select(userSelectColumns)
            .from(users)
            .where(and(eq(users.role, 'DRIVER'), isNull(users.deletedAt)));
        return rows.map((row) => withDefaultIsBanned(row as Omit<DbUser, 'isBanned'>));
    }

    async findDriversByIds(driverIds: string[]): Promise<DbUser[]> {
        if (driverIds.length === 0) return [];
        const uniqueIds = Array.from(new Set(driverIds));
        const rows = await this.db
            .select(userSelectColumns)
            .from(users)
            .where(and(inArray(users.id, uniqueIds), eq(users.role, 'DRIVER'), isNull(users.deletedAt)));
        return rows.map((row) => withDefaultIsBanned(row as Omit<DbUser, 'isBanned'>));
    }

    async createRefreshTokenSession(userId: string, tokenHash: string, expiresAtIso: string): Promise<void> {
        await this.db.insert(refreshTokenSessions).values({
            userId,
            tokenHash,
            expiresAt: expiresAtIso,
        });
    }

    async hasActiveRefreshTokenSession(tokenHash: string, userId: string): Promise<boolean> {
        const [session] = await this.db
            .select({ id: refreshTokenSessions.id })
            .from(refreshTokenSessions)
            .where(
                and(
                    eq(refreshTokenSessions.tokenHash, tokenHash),
                    eq(refreshTokenSessions.userId, userId),
                    isNull(refreshTokenSessions.revokedAt),
                    gt(refreshTokenSessions.expiresAt, sql`CURRENT_TIMESTAMP`),
                ),
            )
            .limit(1);

        return !!session;
    }

    async rotateRefreshTokenSession(input: {
        userId: string;
        oldTokenHash: string;
        newTokenHash: string;
        newExpiresAtIso: string;
    }): Promise<boolean> {
        return this.db.transaction(async (tx) => {
            const [existing] = await tx
                .select({ id: refreshTokenSessions.id })
                .from(refreshTokenSessions)
                .where(
                    and(
                        eq(refreshTokenSessions.userId, input.userId),
                        eq(refreshTokenSessions.tokenHash, input.oldTokenHash),
                        isNull(refreshTokenSessions.revokedAt),
                        gt(refreshTokenSessions.expiresAt, sql`CURRENT_TIMESTAMP`),
                    ),
                )
                .limit(1);

            if (!existing) {
                return false;
            }

            await tx
                .update(refreshTokenSessions)
                .set({
                    revokedAt: sql`CURRENT_TIMESTAMP`,
                    replacedByTokenHash: input.newTokenHash,
                })
                .where(eq(refreshTokenSessions.id, existing.id));

            await tx.insert(refreshTokenSessions).values({
                userId: input.userId,
                tokenHash: input.newTokenHash,
                expiresAt: input.newExpiresAtIso,
            });

            return true;
        });
    }

    async revokeAllRefreshTokenSessionsForUser(userId: string): Promise<void> {
        await this.db
            .update(refreshTokenSessions)
            .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(refreshTokenSessions.userId, userId), isNull(refreshTokenSessions.revokedAt)));
    }

    async revokeRefreshTokenSession(userId: string, tokenHash: string): Promise<boolean> {
        const updated = await this.db
            .update(refreshTokenSessions)
            .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
            .where(
                and(
                    eq(refreshTokenSessions.userId, userId),
                    eq(refreshTokenSessions.tokenHash, tokenHash),
                    isNull(refreshTokenSessions.revokedAt),
                ),
            )
            .returning();

        return updated.length > 0;
    }

    async updateUser(
        userId: string,
        data: {
            firstName?: string;
            lastName?: string;
            role?: 'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE';
            businessId?: string | null;
            adminNote?: string | null;
            flagColor?: string | null;
            preferredLanguage?: string;
        }
    ): Promise<DbUser | undefined> {
        await this.db
            .update(users)
            .set(data)
            .where(eq(users.id, userId));
        return this.findById(userId);
    }

    async deleteUser(userId: string): Promise<boolean> {
        // Delete related records first
        await this.db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
        await this.db.delete(userAddress).where(eq(userAddress.userId, userId));

        // Anonymize all PII on the user record
        const result = await this.db
            .update(users)
            .set({
                deletedAt: sql`CURRENT_TIMESTAMP`,
                email: sql`'deleted_' || ${users.id} || '@deleted'`,
                firstName: 'Deleted',
                lastName: 'User',
                phoneNumber: null,
                address: null,
            })
            .where(and(eq(users.id, userId), isNull(users.deletedAt)))
            .returning();
        return result.length > 0;
    }
}
