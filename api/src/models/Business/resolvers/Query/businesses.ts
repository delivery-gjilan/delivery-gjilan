import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { businesses as businessTable } from '../../../../../database/schema/businesses';

export const businesses: NonNullable<QueryResolvers['businesses']> = async () => {
    const rows = await db.select().from(businessTable);

    return rows.map((b) => ({
        id: b.id,
        name: b.name,
        imageUrl: b.imageUrl,
        businessType: b.businessType,
        isActive: b.isActive ?? true,
        createdAt: b.createdAt!,
        updatedAt: b.updatedAt!,
    }));
};
