import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { categories as categoryTable } from '../../../../../database/schema/categories';
import { eq } from 'drizzle-orm';

export const deleteCategory: NonNullable<MutationResolvers['deleteCategory']> = async (_parent, { id }, _ctx) => {
    const deleted = await db
        .delete(categoryTable)
        .where(eq(categoryTable.id, Number(id)))
        .returning();

    return deleted.length > 0;
};
