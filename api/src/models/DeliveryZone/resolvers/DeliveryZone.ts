import type { DeliveryZoneResolvers } from './../../../generated/types.generated';

const toIsoString = (value: unknown): unknown => {
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'string') {
        let normalized = value.includes('T') ? value : value.replace(' ', 'T');
        normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
        normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');

        const date = new Date(normalized);
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString();
        }
    }

    return value;
};

export const DeliveryZone: DeliveryZoneResolvers = {
    isActive: (parent) => {
        return parent.isActive === 'true' || parent.isActive === true;
    },
    createdAt: (parent) => {
        return toIsoString(parent.createdAt);
    },
    updatedAt: (parent) => {
        return toIsoString(parent.updatedAt);
    },
};
