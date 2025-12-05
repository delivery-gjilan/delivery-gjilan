import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { categories as categoryTable } from '../../../../../database/schema/categories';

export const createCategory: NonNullable<MutationResolvers['createCategory']> = async (_parent, { input }, _ctx) => {
    const [created] = await db
        .insert(categoryTable)
        .values({
            businessId: Number(input.businessId),
            name: input.name,
            isActive: true,
        })
        .returning();

    return {
        id: created.id,
        businessId: created.businessId,
        name: created.name,
        isActive: created.isActive!,
        createdAt: created.createdAt!,
        updatedAt: created.updatedAt!,
    };
};
