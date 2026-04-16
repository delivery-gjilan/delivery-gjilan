import { describe, expect, it } from 'vitest';
import { calculateDriverTakeHomePreview, type DriverTakeHomePreviewOrderSnapshot } from '../driverTakeHomePreview';

type SettlementCalculation = {
    type: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    amount: number;
};

function makeOrder(overrides: Partial<DriverTakeHomePreviewOrderSnapshot> = {}): DriverTakeHomePreviewOrderSnapshot {
    return {
        actualPrice: 20,
        deliveryPrice: 3,
        prioritySurcharge: 0,
        driverTip: 0,
        businessPrice: 15,
        basePrice: 15,
        paymentCollection: 'CASH_TO_DRIVER',
        ...overrides,
    };
}

describe('calculateDriverTakeHomePreview', () => {
    it('returns delivery cut after receivable settlements on cash orders', () => {
        const order = makeOrder();
        const calculations: SettlementCalculation[] = [
            { type: 'DRIVER', direction: 'RECEIVABLE', amount: 5 },
            { type: 'DRIVER', direction: 'RECEIVABLE', amount: 0.45 },
        ];

        expect(calculateDriverTakeHomePreview(order, calculations as any)).toBe(2.55);
    });

    it('returns fixed promo-funded payout even when delivery price is zero', () => {
        const order = makeOrder({
            deliveryPrice: 0,
            actualPrice: 20,
            businessPrice: 20,
            basePrice: 20,
        });
        const calculations: SettlementCalculation[] = [
            { type: 'DRIVER', direction: 'PAYABLE', amount: 2 },
        ];

        expect(calculateDriverTakeHomePreview(order, calculations as any)).toBe(2);
    });

    it('returns prepaid tip passthrough when driver collects no cash', () => {
        const order = makeOrder({
            deliveryPrice: 0,
            actualPrice: 20,
            businessPrice: 20,
            basePrice: 20,
            paymentCollection: 'PREPAID_TO_PLATFORM',
        });
        const calculations: SettlementCalculation[] = [
            { type: 'DRIVER', direction: 'PAYABLE', amount: 2 },
        ];

        expect(calculateDriverTakeHomePreview(order, calculations as any)).toBe(2);
    });
});
