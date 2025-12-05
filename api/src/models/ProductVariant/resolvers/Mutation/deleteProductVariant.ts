import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productVariants as productVariantTable } from '../../../../../database/schema/productVariants';
import { eq } from 'drizzle-orm';

export const deleteProductVariant: NonNullable<MutationResolvers['deleteProductVariant']> = async (
    _parent,
    { id },
    _ctx,
) => {
    const deleted = await db
        .delete(productVariantTable)
        .where(eq(productVariantTable.id, Number(id)))
        .returning();

    return deleted.length > 0;
};
