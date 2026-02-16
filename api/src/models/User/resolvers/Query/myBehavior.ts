import type { QueryResolvers } from '@/generated/types.generated';
import { userBehaviors } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const myBehavior: NonNullable<QueryResolvers['myBehavior']> = async (
    _parent,
    _args,
    { db, userData },
) => {
    if (!userData.userId) {
        throw new Error('Unauthorized');
    }

    const [behavior] = await db
        .select()
        .from(userBehaviors)
        .where(eq(userBehaviors.userId, userData.userId));

    return behavior || null;
};
