import type { MutationResolvers } from '@/generated/types.generated';
import { AppError } from '@/lib/errors';

export const driverRegister: NonNullable<MutationResolvers['driverRegister']> = async (
    _parent,
    { input },
    { driverAuthService }
) => {
    if (!driverAuthService) {
        throw new AppError('Driver authentication service not available', 'SERVICE_UNAVAILABLE');
    }

    try {
        const result = await driverAuthService.register(
            input.email,
            input.password,
            input.firstName,
            input.lastName,
            input.phoneNumber
        );

        return {
            token: result.token,
            refreshToken: result.refreshToken,
            driver: {
                id: result.driver.id,
                email: result.driver.email,
                firstName: result.driver.firstName,
                lastName: result.driver.lastName,
                phoneNumber: result.driver.phoneNumber,
                onlinePreference: result.driver.onlinePreference,
                connectionStatus: result.driver.connectionStatus,
                lastHeartbeatAt: result.driver.lastHeartbeatAt,
                lastLocationUpdate: result.driver.lastLocationUpdate,
                driverLat: result.driver.driverLat,
                driverLng: result.driver.driverLng,
            },
            message: result.message,
        };
    } catch (error) {
        throw AppError.badInput(error instanceof Error ? error.message : 'Registration failed');
    }
};
