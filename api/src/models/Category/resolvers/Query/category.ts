import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { categories as categoryTable } from '../../../../../database/schema/categories';
import { eq } from 'drizzle-orm';

export const category: NonNullable<QueryResolvers['category']> = async (_parent, { id }, _ctx) => {
    const rows = await db
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, Number(id)));

    const c = rows[0];
    if (!c) return null;

    return {
        id: c.id,
        businessId: c.businessId,
        name: c.name,
        isActive: c.isActive ?? true,
        createdAt: c.createdAt!,
        updatedAt: c.updatedAt!,
    };
};
