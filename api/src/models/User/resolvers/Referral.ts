import type { ReferralResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { users } from '@/database/schema/users';
import { eq } from 'drizzle-orm';

export const Referral: ReferralResolvers = {
    referredUser: async (parent): Promise<any> => {
        if (!parent.referredUserId) {
            return null;
        }

        const db = await getDB();
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, parent.referredUserId as string))
            .limit(1);

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            address: user.address,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            signupStep: user.signupStep as any,
            role: user.role as any,
            businessId: user.businessId,
            adminNote: user.adminNote,
            flagColor: user.flagColor,
            imageUrl: user.imageUrl,
            referralCode: user.referralCode,
            isOnline: false, // Not applicable for this context
            driverLocation: null,
            driverLocationUpdatedAt: null,
            business: null,
        };
    },
};