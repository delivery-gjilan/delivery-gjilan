/**
 * Unit tests for SettlingService net balance calculation logic.
 *
 * The core of settling is: sum all RECEIVABLE amounts, subtract all PAYABLE
 * amounts, and determine the direction of payment. This is pure arithmetic
 * (no DB needed) and worth locking down precisely because a signed-integer
 * mistake can reverse the direction of a real money transfer.
 *
 * The settlement records represented here mirror DbSettlement shape but only
 * carry the fields the balance calculation reads.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror of the net-balance calculation from SettlingService.ts
// If the source changes, update this too.
// ---------------------------------------------------------------------------

type MinimalSettlement = {
    amount: number | string;
    direction: 'RECEIVABLE' | 'PAYABLE';
};

function calculateNetBalance(settlements: MinimalSettlement[]): {
    netAmount: number;
    direction: 'ENTITY_TO_PLATFORM' | 'PLATFORM_TO_ENTITY';
} {
    let netCents = 0;
    for (const s of settlements) {
        const amountCents = Math.round(Number(s.amount) * 100);
        if (s.direction === 'RECEIVABLE') {
            netCents += amountCents;
        } else {
            netCents -= amountCents;
        }
    }
    const direction: 'ENTITY_TO_PLATFORM' | 'PLATFORM_TO_ENTITY' =
        netCents >= 0 ? 'ENTITY_TO_PLATFORM' : 'PLATFORM_TO_ENTITY';
    const netAmount = Number((Math.abs(netCents) / 100).toFixed(2));
    return { netAmount, direction };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateNetBalance — direction', () => {
    it('all RECEIVABLE → entity owes platform (ENTITY_TO_PLATFORM)', () => {
        const { direction } = calculateNetBalance([
            { amount: 10, direction: 'RECEIVABLE' },
            { amount: 5,  direction: 'RECEIVABLE' },
        ]);
        expect(direction).toBe('ENTITY_TO_PLATFORM');
    });

    it('all PAYABLE → platform owes entity (PLATFORM_TO_ENTITY)', () => {
        const { direction } = calculateNetBalance([
            { amount: 8, direction: 'PAYABLE' },
        ]);
        expect(direction).toBe('PLATFORM_TO_ENTITY');
    });

    it('RECEIVABLE > PAYABLE → entity still owes platform', () => {
        const { direction } = calculateNetBalance([
            { amount: 20, direction: 'RECEIVABLE' },
            { amount: 5,  direction: 'PAYABLE' },
        ]);
        expect(direction).toBe('ENTITY_TO_PLATFORM');
    });

    it('PAYABLE > RECEIVABLE → platform owes entity', () => {
        const { direction } = calculateNetBalance([
            { amount: 5,  direction: 'RECEIVABLE' },
            { amount: 20, direction: 'PAYABLE' },
        ]);
        expect(direction).toBe('PLATFORM_TO_ENTITY');
    });

    it('exactly zero net → treated as ENTITY_TO_PLATFORM (no money changes hands)', () => {
        const { direction, netAmount } = calculateNetBalance([
            { amount: 10, direction: 'RECEIVABLE' },
            { amount: 10, direction: 'PAYABLE' },
        ]);
        expect(direction).toBe('ENTITY_TO_PLATFORM');
        expect(netAmount).toBe(0);
    });
});

describe('calculateNetBalance — amount precision', () => {
    it('returns correct net for simple values', () => {
        const { netAmount } = calculateNetBalance([
            { amount: 30, direction: 'RECEIVABLE' },
            { amount: 12, direction: 'PAYABLE' },
        ]);
        expect(netAmount).toBe(18);
    });

    it('handles fractional amounts without floating-point drift', () => {
        // 0.1 + 0.2 = 0.30000000000000004 in JS floats — the cent rounding must
        // prevent this from producing 0.30 vs 0.30 drift
        const { netAmount } = calculateNetBalance([
            { amount: 0.1, direction: 'RECEIVABLE' },
            { amount: 0.2, direction: 'RECEIVABLE' },
        ]);
        expect(netAmount).toBe(0.3);
    });

    it('rounds to 2 decimal places', () => {
        // 1/3 of a dinar — driver commission edge case
        const { netAmount } = calculateNetBalance([
            { amount: '0.333', direction: 'RECEIVABLE' },
        ]);
        expect(netAmount).toBe(0.33);
    });

    it('handles string amount (Postgres numeric comes back as string)', () => {
        const { netAmount } = calculateNetBalance([
            { amount: '15.50', direction: 'RECEIVABLE' },
            { amount: '3.00', direction: 'PAYABLE' },
        ]);
        expect(netAmount).toBe(12.5);
    });

    it('handles many mixed settlements', () => {
        const settlements: MinimalSettlement[] = [
            { amount: 100, direction: 'RECEIVABLE' }, // driver commission
            { amount: 20,  direction: 'PAYABLE' },    // refund
            { amount: 15,  direction: 'RECEIVABLE' }, // another order
            { amount: 5,   direction: 'PAYABLE' },    // correction
        ];
        // net = 100 - 20 + 15 - 5 = 90
        const { netAmount, direction } = calculateNetBalance(settlements);
        expect(netAmount).toBe(90);
        expect(direction).toBe('ENTITY_TO_PLATFORM');
    });
});
