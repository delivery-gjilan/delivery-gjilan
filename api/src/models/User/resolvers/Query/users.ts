import type { QueryResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const users: NonNullable<QueryResolvers['users']> = async (_parent, _arg, { authService, userData }) => {
    if (!userData.userId || !userData.role) {
        throw new GraphQLError('Unauthorized: You must be logged in to view users', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const allUsers = await authService.getAllUsers();

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

    return visibleUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address || null,
        phoneNumber: user.phoneNumber || null,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        signupStep: user.signupStep,
        role: user.role,
        preferredLanguage: (user as any).preferredLanguage === 'al' ? 'AL' : 'EN',
        permissions: [],
        isOnline: (user as any).isOnline ?? false,
        businessId: user.businessId || null,
        adminNote: user.adminNote || null,
        flagColor: user.flagColor || 'yellow',
    }));
};
