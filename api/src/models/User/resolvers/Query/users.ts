import type { QueryResolvers } from '@/generated/types.generated';

export const users: NonNullable<QueryResolvers['users']> = async (_parent, _arg, { authService }) => {
    const allUsers = await authService.getAllUsers();
    return allUsers.map((user) => ({
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
    }));
};
