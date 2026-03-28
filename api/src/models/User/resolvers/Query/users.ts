import type { QueryResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { toUserParent } from '../utils/toUserParent';

export const users: NonNullable<QueryResolvers['users']> = async (_parent, { limit, offset }, { authService, userData }) => {
    if (!userData.userId || !userData.role) {
        throw new GraphQLError('Unauthorized: You must be logged in to view users', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const allUsers = await authService.getAllUsers(limit ?? undefined, offset ?? undefined);

    let visibleUsers = allUsers;
    if (userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN') {
        visibleUsers = allUsers;
    } else if (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') {
        if (!userData.businessId) {
            throw new GraphQLError('Business user must be associated with a business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        visibleUsers = allUsers.filter(
            (user) => user.businessId === userData.businessId || user.id === userData.userId,
        );
    } else {
        throw new GraphQLError('Forbidden: You do not have access to users data', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    return visibleUsers.map((user) => toUserParent(user));
};
