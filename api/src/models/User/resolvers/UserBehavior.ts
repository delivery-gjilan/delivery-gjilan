import type { UserBehaviorResolvers } from '@/generated/types.generated';

const normalizeDateValue = (value: string | Date | null | undefined): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;

    const normalized = value
        .replace(' ', 'T')
        .replace(/\+00\.?$/, 'Z')
        .replace(/Z\.$/, 'Z');
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const UserBehavior: UserBehaviorResolvers = {
    firstOrderAt: (behavior) => normalizeDateValue(behavior.firstOrderAt),
    lastOrderAt: (behavior) => normalizeDateValue(behavior.lastOrderAt),
    lastDeliveredAt: (behavior) => normalizeDateValue(behavior.lastDeliveredAt),
    createdAt: (behavior) => normalizeDateValue(behavior.createdAt) ?? new Date(),
    updatedAt: (behavior) => normalizeDateValue(behavior.updatedAt) ?? new Date(),
};
