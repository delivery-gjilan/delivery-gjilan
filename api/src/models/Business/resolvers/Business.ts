import type { BusinessResolvers } from './../../../generated/types.generated';

/**
 * Parse a working hours time string like "08:00" into total minutes from midnight.
 */
function parseTimeToMinutes(t: string): number {
    const parts = t.split(':');
    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    return h * 60 + m;
}

export const Business: BusinessResolvers = {
    isOpen: (parent) => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const opensAt = parseTimeToMinutes(parent.workingHours.opensAt);
        const closesAt = parseTimeToMinutes(parent.workingHours.closesAt);

        if (closesAt <= opensAt) {
            // Schedule crosses midnight (e.g. 22:00 – 02:00)
            return currentMinutes >= opensAt || currentMinutes < closesAt;
        }
        return currentMinutes >= opensAt && currentMinutes < closesAt;
    },
};
