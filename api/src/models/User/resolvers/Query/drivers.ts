import type { QueryResolvers } from '@/generated/types.generated';

export const drivers: NonNullable<QueryResolvers['drivers']> = async (_parent, _arg, { authService }) => {
    const driverUsers = await authService.getDrivers();
    return driverUsers.map((user) => ({
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
        driverLat: user.driverLat || null,
        driverLng: user.driverLng || null,
        driverLocationUpdatedAt: user.driverLocationUpdatedAt || null,
    }));
};
