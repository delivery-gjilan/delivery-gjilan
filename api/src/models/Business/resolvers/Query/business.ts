import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { businesses as businessTable } from '../../../../../database/schema/businesses';
import { eq } from 'drizzle-orm';

export const business: NonNullable<QueryResolvers['business']> = async (_parent, { id }, _ctx) => {
    const rows = await db
        .select()
        .from(businessTable)
        .where(eq(businessTable.id, Number(id)));

    const b = rows[0];
    if (!b) return null;

    return {
        id: b.id,
        name: b.name,
        imageUrl: b.imageUrl,
        businessType: b.businessType,
        isActive: b.isActive ?? true,
        createdAt: b.createdAt!,
        updatedAt: b.updatedAt!,
    };
};
