import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productCategories as categoryTable } from '../../../../../database/schema/productCategories';
import { eq } from 'drizzle-orm';

export const productCategories: NonNullable<QueryResolvers['productCategories']> = async (_parent, { businessId }) => {
    let rows;

    if (businessId) {
        rows = await db
            .select()
            .from(categoryTable)
            .where(eq(categoryTable.businessId, Number(businessId)));
    } else {
        rows = await db.select().from(categoryTable);
    }

    return rows.map((c) => ({
        id: c.id,
        businessId: c.businessId,
        name: c.name,
        isActive: c.isActive ?? true,
        createdAt: c.createdAt!,
        updatedAt: c.updatedAt!,
    }));
};
