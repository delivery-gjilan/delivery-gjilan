import type { QueryResolvers } from '@/generated/types.generated';
import { userBehaviors } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const userBehavior: NonNullable<QueryResolvers['userBehavior']> = async (
    _parent,
    { userId },
    { db, userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw AppError.forbidden();
    }

    const [behavior] = await db.select().from(userBehaviors).where(eq(userBehaviors.userId, userId));

    return behavior || null;
};
