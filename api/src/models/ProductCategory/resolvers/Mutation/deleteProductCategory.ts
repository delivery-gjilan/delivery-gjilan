import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productCategories as categoryTable } from '../../../../../database/schema/productCategories';
import { eq } from 'drizzle-orm';

export const deleteProductCategory: NonNullable<MutationResolvers['deleteProductCategory']> = async (
    _parent,
    { id },
    _ctx,
) => {
    const deleted = await db
        .delete(categoryTable)
        .where(eq(categoryTable.id, Number(id)))
        .returning();

    return deleted.length > 0;
};
