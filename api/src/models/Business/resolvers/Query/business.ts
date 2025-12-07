import type { QueryResolvers } from '../../../../generated/types.generated';
import { eq } from 'drizzle-orm';

export const business: NonNullable<QueryResolvers['business']> = async (_parent, { id }, _ctx) => {
    return {
        id: id,
        name: '',
        imageUrl: '',
        businessType: 'MARKET',
        isActive: true,
        createdAt: '',
        updatedAt: '',
        isOpen: true,
        location: {
            address: '',
            latitude: 0,
            longitude: 0,
        },
        workingHours: {
            closesAt: '',
            opensAt: '',
        },
    };
};
