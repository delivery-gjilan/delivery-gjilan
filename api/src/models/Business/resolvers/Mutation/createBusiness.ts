import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { businesses as businessTable } from '../../../../../database/schema/businesses';

export const createBusiness: NonNullable<MutationResolvers['createBusiness']> = async (_parent, { input }, _ctx) => {
    const [created] = await db
        .insert(businessTable)
        .values({
            name: input.name,
            imageUrl: input.imageUrl ?? null,
            businessType: input.businessType,
            isActive: true,
        })
        .returning();

    return {
        id: created.id,
        name: created.name,
        imageUrl: created.imageUrl,
        businessType: created.businessType,
        isActive: created.isActive!,
        createdAt: created.createdAt!,
        updatedAt: created.updatedAt!,
    };
};
