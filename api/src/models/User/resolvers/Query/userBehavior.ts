import type { QueryResolvers } from '@/generated/types.generated';
import { userBehaviors } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const userBehavior: NonNullable<QueryResolvers['userBehavior']> = async (
    _parent,
    { userId },
    { db, userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new Error('Forbidden');
    }

    const [behavior] = await db.select().from(userBehaviors).where(eq(userBehaviors.userId, userId));

    return behavior || null;
};
