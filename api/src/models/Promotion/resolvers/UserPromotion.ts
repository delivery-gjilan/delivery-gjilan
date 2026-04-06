import type { UserPromotionResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { users } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const UserPromotion: UserPromotionResolvers = {
    user: async (parent) => {
        const db = await getDB();
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, (parent as any).userId))
            .limit(1);
        return user as any ?? null;
    },
};