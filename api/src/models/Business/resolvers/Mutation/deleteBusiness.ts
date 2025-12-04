import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { businesses as businessTable } from '../../../../../database/schema/businesses';
import { eq } from 'drizzle-orm';

export const deleteBusiness: NonNullable<MutationResolvers['deleteBusiness']> = async (_parent, { id }, _ctx) => {
    const deleted = await db
        .delete(businessTable)
        .where(eq(businessTable.id, Number(id)))
        .returning();

    return deleted.length > 0;
};
