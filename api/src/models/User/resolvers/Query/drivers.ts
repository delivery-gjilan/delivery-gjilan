// @ts-nocheck
import type { QueryResolvers } from '@/generated/types.generated';

export const drivers: NonNullable<QueryResolvers['drivers']> = async (_parent, _arg, { authService }) => {
    const driverUsers = await authService.getDrivers();
    return driverUsers;
};
