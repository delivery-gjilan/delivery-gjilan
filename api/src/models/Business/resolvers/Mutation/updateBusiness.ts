import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { businesses as businessTable } from '../../../../../database/schema/businesses';
import { eq } from 'drizzle-orm';

export const updateBusiness: NonNullable<MutationResolvers['updateBusiness']> = async (_parent, { id, input }) => {
    const updateData: {
        name?: string;
        imageUrl?: string | null;
        businessType?: 'RESTAURANT' | 'MARKET' | 'PHARMACY';
        isActive?: boolean;
        updatedAt?: string;
    } = {
        updatedAt: new Date().toISOString(),
    };

    if (input.name !== null && input.name !== undefined) updateData.name = input.name;
    if (input.imageUrl !== null && input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.businessType !== null && input.businessType !== undefined) updateData.businessType = input.businessType;
    if (input.isActive !== null && input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
        .update(businessTable)
        .set(updateData)
        .where(eq(businessTable.id, Number(id)))
        .returning();

    if (!updated) {
        throw new Error('Business not found');
    }

    return {
        id: updated.id,
        name: updated.name,
        imageUrl: updated.imageUrl,
        businessType: updated.businessType,
        isActive: updated.isActive!,
        createdAt: updated.createdAt!,
        updatedAt: updated.updatedAt!,
    };
};
