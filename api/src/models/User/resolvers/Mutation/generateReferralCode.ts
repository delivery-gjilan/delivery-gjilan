import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { users } from '@/database/schema/users';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AppError } from '@/lib/errors';

export const generateReferralCode: NonNullable<MutationResolvers['generateReferralCode']> = async (_parent, _arg, { userData }) => {
    if (!userData.userId) {
        throw AppError.unauthorized();
    }

    const db = await getDB();

    // Check if user already has a referral code
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.userId))
        .limit(1);

    if (!user) {
        throw AppError.notFound('User');
    }

    if (user.referralCode) {
        return user.referralCode;
    }

    // Generate a unique referral code
    let referralCode: string;
    let codeExists = true;

    while (codeExists) {
        // Generate code: first 4 chars of first name + 4 random alphanumeric
        const prefix = user.firstName.substring(0, 4).toUpperCase().padEnd(4, 'X');
        const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
        referralCode = `${prefix}${suffix}`;

        // Check if code already exists
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.referralCode, referralCode))
            .limit(1);

        codeExists = !!existing;
    }

    // Update user with referral code
    await db
        .update(users)
        .set({ referralCode })
        .where(eq(users.id, userData.userId));

    return referralCode;
};