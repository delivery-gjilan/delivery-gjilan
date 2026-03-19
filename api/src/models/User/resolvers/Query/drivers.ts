import type { QueryResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const drivers: NonNullable<QueryResolvers['drivers']> = async (_parent, _arg, { authService, userData }) => {
    if (!userData.userId || !userData.role) {
        throw new GraphQLError('Unauthorized: You must be logged in to view drivers', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const driverUsers = await authService.getDrivers();

    if (userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN') {
        return driverUsers;
    }

    if (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') {
        if (!userData.businessId) {
            throw new GraphQLError('Business user must be associated with a business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        return driverUsers.filter((driver) => driver.businessId === userData.businessId);
    }

    throw new GraphQLError('Forbidden: You do not have access to driver data', {
        extensions: { code: 'FORBIDDEN' },
    });
};
