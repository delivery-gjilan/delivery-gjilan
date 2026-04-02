import { describe, expect, it } from 'vitest';

type Point = { lat: number; lng: number };
type Zone = { polygon: [number, number][] };

// Mirrors current createOrder behavior: locationFlagged when either selected drop-off
// or optional user context point is outside effective coverage.
function computeLocationFlagged(params: {
    dropoffInside: boolean;
    userContextInside?: boolean;
}): boolean {
    const { dropoffInside, userContextInside } = params;
    const isUserContextInside = userContextInside ?? true;
    return !dropoffInside || !isUserContextInside;
}

// Mirrors mapToOrder re-derivation logic currently in OrderService.
function deriveApprovalReasons(params: {
    isFirstOrder: boolean;
    locationFlagged: boolean;
    actualPrice: number;
    deliveryPrice: number;
}): Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> {
    const reasons: Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> = [];
    const totalPrice = Number(params.actualPrice ?? 0) + Number(params.deliveryPrice ?? 0);

    if (params.isFirstOrder) reasons.push('FIRST_ORDER');
    if (params.locationFlagged) reasons.push('OUT_OF_ZONE');
    if (totalPrice > 20) reasons.push('HIGH_VALUE');

    return reasons;
}

describe('order approval flagging rules', () => {
    it('flags when drop-off is outside even if user context is inside', () => {
        expect(computeLocationFlagged({ dropoffInside: false, userContextInside: true })).toBe(true);
    });

    it('flags when drop-off is inside but user context is outside', () => {
        expect(computeLocationFlagged({ dropoffInside: true, userContextInside: false })).toBe(true);
    });

    it('does not flag when both drop-off and user context are inside', () => {
        expect(computeLocationFlagged({ dropoffInside: true, userContextInside: true })).toBe(false);
    });

    it('falls back to drop-off only when user context is missing', () => {
        expect(computeLocationFlagged({ dropoffInside: false })).toBe(true);
        expect(computeLocationFlagged({ dropoffInside: true })).toBe(false);
    });
});

describe('approval reason re-derivation', () => {
    it('includes FIRST_ORDER and HIGH_VALUE and OUT_OF_ZONE when all conditions are met', () => {
        expect(
            deriveApprovalReasons({
                isFirstOrder: true,
                locationFlagged: true,
                actualPrice: 18,
                deliveryPrice: 3,
            }),
        ).toEqual(['FIRST_ORDER', 'OUT_OF_ZONE', 'HIGH_VALUE']);
    });

    it('includes HIGH_VALUE only when total is strictly greater than 20', () => {
        expect(
            deriveApprovalReasons({
                isFirstOrder: false,
                locationFlagged: false,
                actualPrice: 20,
                deliveryPrice: 0,
            }),
        ).toEqual([]);

        expect(
            deriveApprovalReasons({
                isFirstOrder: false,
                locationFlagged: false,
                actualPrice: 20,
                deliveryPrice: 0.01,
            }),
        ).toEqual(['HIGH_VALUE']);
    });
});
