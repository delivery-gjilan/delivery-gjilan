import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { products as productTable } from '../../../../../database/schema/products';
import { eq } from 'drizzle-orm';

export const deleteProduct: NonNullable<MutationResolvers['deleteProduct']> = async (_parent, { id }, _ctx) => {
    const deleted = await db
        .delete(productTable)
        .where(eq(productTable.id, Number(id)))
        .returning();

    return deleted.length > 0;
};
