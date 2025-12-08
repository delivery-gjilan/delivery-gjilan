import { DbType } from '@/database';
import { DbUser, users } from '@/database/schema/users';
import { SignupStep } from '@/generated/types.generated';
import { eq } from 'drizzle-orm';

export class AuthRepository {
    constructor(private db: DbType) {}

    async createUser(email: string, hashedPassword: string): Promise<DbUser> {
        const [user] = await this.db
            .insert(users)
            .values({
                email,
                password: hashedPassword,
                signupStep: 'INITIAL',
                emailVerified: false,
                phoneVerified: false,
            })
            .returning();
        return user;
    }

    async findByEmail(email: string): Promise<DbUser | undefined> {
        const [user] = await this.db.select().from(users).where(eq(users.email, email));
        return user;
    }

    async findById(id: string): Promise<DbUser | undefined> {
        const [user] = await this.db.select().from(users).where(eq(users.id, id));
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
}
