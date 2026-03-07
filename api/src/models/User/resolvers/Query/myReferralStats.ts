// @ts-nocheck
import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { users, userReferrals } from '@/database/schema';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const myReferralStats: NonNullable<QueryResolvers['myReferralStats']> = async (_parent, _arg, { userData }) => {
    if (!userData.userId) {
        throw AppError.unauthorized();
    }

    const db = await getDB();

    // Get user's referral code (generate if doesn't exist)
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.userId))
        .limit(1);

    if (!user) {
        throw AppError.notFound('User');
    }

    let referralCode = user.referralCode;

    // Generate referral code if user doesn't have one
    if (!referralCode) {
        const crypto = await import('crypto');
        let codeExists = true;

        while (codeExists) {
            const prefix = user.firstName.substring(0, 4).toUpperCase().padEnd(4, 'X');
            const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
            referralCode = `${prefix}${suffix}`;

            const [existing] = await db
                .select()
                .from(users)
                .where(eq(users.referralCode, referralCode))
                .limit(1);

            codeExists = !!existing;
        }

        await db
            .update(users)
            .set({ referralCode })
            .where(eq(users.id, userData.userId));
    }

    // Get all referrals for this user
    const referrals = await db
        .select()
        .from(userReferrals)
        .where(eq(userReferrals.referrerUserId, userData.userId));

    // Calculate stats
    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(r => r.status === 'COMPLETED').length;
    const pendingReferrals = referrals.filter(r => r.status === 'PENDING').length;
    const totalRewardsEarned = referrals
        .filter(r => r.rewardGiven && r.rewardAmount)
        .reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);

    return {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalRewardsEarned,
        referralCode,
        referrals: referrals.map(r => ({
            id: r.id,
            referrerUserId: r.referrerUserId,
            referredUserId: r.referredUserId,
            referralCode: r.referralCode,
            status: r.status as any,
            rewardGiven: r.rewardGiven,
            rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
            completedAt: r.completedAt,
            createdAt: r.createdAt,
            referredUser: null, // Will be resolved by the Referral type resolver
        })),
    };
};