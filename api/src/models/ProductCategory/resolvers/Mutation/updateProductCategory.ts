import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productCategories as categoryTable } from '../../../../../database/schema/productCategories';
import { eq } from 'drizzle-orm';

export const updateProductCategory: NonNullable<MutationResolvers['updateProductCategory']> = async (_parent, { id, input }) => {
    const updateData: {
        name?: string;
        isActive?: boolean;
        updatedAt?: string;
    } = {
        updatedAt: new Date().toISOString(),
    };

    if (input.name !== null && input.name !== undefined) updateData.name = input.name;
    if (input.isActive !== null && input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
        .update(categoryTable)
        .set(updateData)
        .where(eq(categoryTable.id, Number(id)))
        .returning();

    if (!updated) {
        throw new Error('ProductCategory not found');
    }

    return {
        id: updated.id,
        businessId: updated.businessId,
        name: updated.name,
        isActive: updated.isActive!,
        createdAt: updated.createdAt!,
        updatedAt: updated.updatedAt!,
    };
};
