import { DbType } from '@/database';
import { DbUser, users } from '@/database/schema/users';
import { refreshTokenSessions } from '@/database/schema/refreshTokenSessions';
import { userReferrals } from '@/database/schema/referrals';
import { SignupStep } from '@/generated/types.generated';
import { eq, and, isNull, sql, inArray, gt } from 'drizzle-orm';

export class AuthRepository {
    constructor(private db: DbType) {}

    async createUser(firstName: string, lastName: string, email: string, hashedPassword: string): Promise<DbUser> {
        const [user] = await this.db
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
            })
            .returning();
        return user;
    }

    async findByEmail(email: string): Promise<DbUser | undefined> {
        const [user] = await this.db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt)));
        return user;
    }

    async findById(id: string): Promise<DbUser | undefined> {
        const [user] = await this.db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));
        return user;
    }

    async updateSignupStep(userId: string, step: SignupStep): Promise<DbUser | undefined> {
        const [user] = await this.db.update(users).set({ signupStep: step }).where(eq(users.id, userId)).returning();
        return user;
    }

    async setEmailVerificationCode(userId: string, code: string): Promise<DbUser | undefined> {
        const [user] = await this.db
            .update(users)
            .set({
                emailVerificationCode: code,
                signupStep: 'EMAIL_SENT',
            })
            .where(eq(users.id, userId))
            .returning();
        return user;
    }

    async setPhoneVerificationCode(userId: string, code: string): Promise<DbUser | undefined> {
        const [user] = await this.db
            .update(users)
            .set({
                phoneVerificationCode: code,
                signupStep: 'PHONE_SENT',
            })
            .where(eq(users.id, userId))
            .returning();
        return user;
    }

    async verifyEmailCode(userId: string, code: string): Promise<DbUser | undefined> {
        const user = await this.findById(userId);
        if (!user || user.emailVerificationCode !== code) {
            return undefined;
        }

        const [updatedUser] = await this.db
            .update(users)
            .set({
                emailVerified: true,
                signupStep: 'EMAIL_VERIFIED',
                emailVerificationCode: null,
            })
            .where(eq(users.id, userId))
            .returning();
        return updatedUser;
    }

    async verifyPhoneCode(userId: string, code: string): Promise<DbUser | undefined> {
        const user = await this.findById(userId);
        if (!user || user.phoneVerificationCode !== code) {
            return undefined;
        }

        const [updatedUser] = await this.db
            .update(users)
            .set({
                phoneVerified: true,
                signupStep: 'COMPLETED',
                phoneVerificationCode: null,
            })
            .where(eq(users.id, userId))
            .returning();
        return updatedUser;
    }

    async setPhoneNumber(userId: string, phoneNumber: string): Promise<DbUser | undefined> {
        const [user] = await this.db.update(users).set({ phoneNumber }).where(eq(users.id, userId)).returning();
        return user;
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<DbUser | undefined> {
        const [user] = await this.db
            .update(users)
            .set({ password: hashedPassword, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(users.id, userId))
            .returning();
        return user;
    }

    async createUserWithRole(
        firstName: string,
        lastName: string,
        email: string,
        hashedPassword: string,
        role: 'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE',
        businessId?: string,
    ): Promise<DbUser> {
        const [user] = await this.db
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
            })
            .returning();
        return user;
    }

    async findAllUsers(): Promise<DbUser[]> {
        return this.db.select().from(users).where(isNull(users.deletedAt));
    }

    async findDrivers(): Promise<DbUser[]> {
        return this.db.select().from(users).where(and(eq(users.role, 'DRIVER'), isNull(users.deletedAt)));
    }

    async findDriversByIds(driverIds: string[]): Promise<DbUser[]> {
        if (driverIds.length === 0) return [];
        const uniqueIds = Array.from(new Set(driverIds));
        return this.db
            .select()
            .from(users)
            .where(and(inArray(users.id, uniqueIds), eq(users.role, 'DRIVER'), isNull(users.deletedAt)));
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
            .returning({ id: refreshTokenSessions.id });

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
        const [user] = await this.db
            .update(users)
            .set(data)
            .where(eq(users.id, userId))
            .returning();
        return user;
    }

    async deleteUser(userId: string): Promise<boolean> {
        const result = await this.db
            .update(users)
            .set({
                deletedAt: sql`CURRENT_TIMESTAMP`,
                email: sql`'deleted_' || ${users.id} || '@deleted'`,
            })
            .where(and(eq(users.id, userId), isNull(users.deletedAt)))
            .returning();
        return result.length > 0;
    }

    async findUserByReferralCode(referralCode: string): Promise<string | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(and(eq(users.referralCode, referralCode), isNull(users.deletedAt)))
            .limit(1);
        return user ? user.id : null;
    }

    async createReferral(referrerUserId: string, referredUserId: string, referralCode: string): Promise<void> {
        await this.db.insert(userReferrals).values({
            referrerUserId,
            referredUserId,
            referralCode,
            status: 'PENDING',
            rewardGiven: false,
        });
    }
}
