import type { UserResolvers } from './../../../generated/types.generated';
export const User: UserResolvers = {
    business: async (parent, _args, { businessService }) => {
        if (!parent.businessId) {
            return null;
        }
        return businessService.getBusiness(parent.businessId);
    },
    driverLocation: (parent) => {
        if (!parent.driverLat || !parent.driverLng) {
            return null;
        }
        return {
            latitude: parent.driverLat,
            longitude: parent.driverLng,
            address: 'Driver location',
        };
    },
    driverLocationUpdatedAt: (parent) => {
        const value = parent.driverLocationUpdatedAt;
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === 'string') {
            const normalized = value
                .replace(' ', 'T')
                .replace(/\+00\.?$/, 'Z')
                .replace(/Z\.$/, 'Z');
            const parsed = new Date(normalized);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    },
};
