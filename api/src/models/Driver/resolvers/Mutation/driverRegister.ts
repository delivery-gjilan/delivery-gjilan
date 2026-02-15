import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const driverRegister: NonNullable<MutationResolvers['driverRegister']> = async (
    _parent,
    { input },
    { driverAuthService }
) => {
    if (!driverAuthService) {
        throw new GraphQLError('Driver authentication service not available');
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
        throw new GraphQLError(error instanceof Error ? error.message : 'Registration failed');
    }
};
