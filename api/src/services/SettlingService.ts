import type { DbType } from '@/database';
type Database = DbType;
import { settlements, settlementPayments } from '@/database/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';

const log = logger.child({ service: 'SettlingService' });

export interface SettleResult {
    paymentId: string;
    settledCount: number;
    netAmount: number;
    direction: 'ENTITY_TO_PLATFORM' | 'PLATFORM_TO_ENTITY';
    remainderAmount: number;
    remainderSettlementId: string | null;
}

/**
 * SettlingService handles the core money-exchange workflow:
 *
 *  1. Gather all unsettled settlements for an entity.
 *  2. Calculate the net balance (RECEIVABLE − PAYABLE).
 *  3. Create a settlement_payment record for the money exchanged.
 *  4. Mark every unsettled settlement as is_settled = true.
 *  5. If the payment was partial (business only), create a carry-forward
 *     settlement for the remainder.
 */
export class SettlingService {
    constructor(private db: Database) {}

    /**
     * Settle unsettled settlements for a driver.
     * If paymentAmount is provided and less than net balance, a carry-forward
     * settlement is created for the remainder (same as business flow).
     */
    async settleWithDriver(
        driverId: string,
        createdByUserId: string,
        paymentAmount?: number,
        _paymentMethod?: string,
        _paymentReference?: string,
        note?: string,
    ): Promise<SettleResult> {
        return this.db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${driverId}))`);

            const unsettled = await tx
                .select()
                .from(settlements)
                .where(
                    and(
                        eq(settlements.driverId, driverId),
                        eq(settlements.type, 'DRIVER'),
                        eq(settlements.isSettled, false),
                    ),
                );

            if (unsettled.length === 0) {
                throw new Error('No unsettled settlements found for this driver');
            }

            // positive = entity owes platform, negative = platform owes entity
            let netCents = 0;
            for (const s of unsettled) {
                const amountCents = Math.round(Number(s.amount) * 100);
                if (s.direction === 'RECEIVABLE') {
                    netCents += amountCents;
                } else {
                    netCents -= amountCents;
                }
            }

            const direction: 'ENTITY_TO_PLATFORM' | 'PLATFORM_TO_ENTITY' =
                netCents >= 0 ? 'ENTITY_TO_PLATFORM' : 'PLATFORM_TO_ENTITY';
            const absNet = Math.abs(netCents);

            // If paymentAmount provided, use it; otherwise settle fully
            const paymentCents = paymentAmount != null
                ? Math.round(paymentAmount * 100)
                : absNet;

            if (paymentCents <= 0) {
                throw new Error('Payment amount must be a positive number');
            }
            if (paymentCents > absNet) {
                throw new Error(
                    `Payment amount (${(paymentCents / 100).toFixed(2)}) exceeds net balance (${(absNet / 100).toFixed(2)})`,
                );
            }

            const actualPayment = Number((paymentCents / 100).toFixed(2));
            const now = new Date().toISOString();

            const [payment] = await tx
                .insert(settlementPayments)
                .values({
                    entityType: 'DRIVER',
                    driverId,
                    amount: actualPayment,
                    note: note ?? null,
                    createdByUserId,
                })
                .returning();

            const unsettledIds = unsettled.map((s) => s.id);
            await tx
                .update(settlements)
                .set({
                    isSettled: true,
                    settlementPaymentId: payment.id,
                    updatedAt: now,
                })
                .where(inArray(settlements.id, unsettledIds))
                .execute();

            // If partial payment, create carry-forward settlement for the remainder
            let remainderAmount = 0;
            let remainderSettlementId: string | null = null;

            const remainderCents = absNet - paymentCents;
            if (remainderCents > 0) {
                remainderAmount = Number((remainderCents / 100).toFixed(2));
                const remainderDirection = netCents >= 0 ? 'RECEIVABLE' : 'PAYABLE';

                const [remainderSettlement] = await tx
                    .insert(settlements)
                    .values({
                        type: 'DRIVER',
                        direction: remainderDirection as any,
                        driverId,
                        orderId: null,
                        amount: remainderAmount,
                        isSettled: false,
                        sourcePaymentId: payment.id,
                    })
                    .returning();

                remainderSettlementId = remainderSettlement.id;
            }

            log.info(
                {
                    driverId,
                    paymentId: payment.id,
                    settledCount: unsettled.length,
                    netAmount: actualPayment,
                    remainderAmount,
                    direction,
                },
                'settling:driver:completed',
            );

            return {
                paymentId: payment.id,
                settledCount: unsettled.length,
                netAmount: actualPayment,
                direction,
                remainderAmount,
                remainderSettlementId,
            };
        });
    }

    /**
     * Settle all unsettled settlements for a business.
     * Supports partial payment — if paymentAmount < net balance,
     * a carry-forward settlement is created for the difference.
     */
    async settleWithBusiness(
        businessId: string,
        paymentAmount: number,
        createdByUserId: string,
        _paymentMethod?: string,
        _paymentReference?: string,
        note?: string,
    ): Promise<SettleResult> {
        const paymentCents = Math.round(paymentAmount * 100);
        if (!Number.isFinite(paymentCents) || paymentCents <= 0) {
            throw new Error('Payment amount must be a positive number');
        }

        return this.db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${businessId}))`);

            const unsettled = await tx
                .select()
                .from(settlements)
                .where(
                    and(
                        eq(settlements.businessId, businessId),
                        eq(settlements.type, 'BUSINESS'),
                        eq(settlements.isSettled, false),
                    ),
                );

            if (unsettled.length === 0) {
                throw new Error('No unsettled settlements found for this business');
            }

            // positive = entity owes platform (RECEIVABLE > PAYABLE)
            let netCents = 0;
            for (const s of unsettled) {
                const amountCents = Math.round(Number(s.amount) * 100);
                if (s.direction === 'RECEIVABLE') {
                    netCents += amountCents;
                } else {
                    netCents -= amountCents;
                }
            }

            const absNet = Math.abs(netCents);
            if (paymentCents > absNet) {
                throw new Error(
                    `Payment amount (${paymentAmount}) exceeds net balance (${(absNet / 100).toFixed(2)})`,
                );
            }

            const direction: 'ENTITY_TO_PLATFORM' | 'PLATFORM_TO_ENTITY' =
                netCents >= 0 ? 'ENTITY_TO_PLATFORM' : 'PLATFORM_TO_ENTITY';
            const now = new Date().toISOString();

            const [payment] = await tx
                .insert(settlementPayments)
                .values({
                    entityType: 'BUSINESS',
                    businessId,
                    amount: paymentAmount,
                    note: note ?? null,
                    createdByUserId,
                })
                .returning();

            // Mark ALL unsettled settlements as settled
            const unsettledIds = unsettled.map((s) => s.id);
            await tx
                .update(settlements)
                .set({
                    isSettled: true,
                    settlementPaymentId: payment.id,
                    updatedAt: now,
                })
                .where(inArray(settlements.id, unsettledIds))
                .execute();

            // If partial payment, create carry-forward settlement for the remainder
            let remainderAmount = 0;
            let remainderSettlementId: string | null = null;

            const remainderCents = absNet - paymentCents;
            if (remainderCents > 0) {
                remainderAmount = Number((remainderCents / 100).toFixed(2));
                const remainderDirection = netCents >= 0 ? 'RECEIVABLE' : 'PAYABLE';

                const [remainderSettlement] = await tx
                    .insert(settlements)
                    .values({
                        type: 'BUSINESS',
                        direction: remainderDirection as any,
                        businessId,
                        orderId: null,
                        amount: remainderAmount,
                        isSettled: false,
                        sourcePaymentId: payment.id,
                    })
                    .returning();

                remainderSettlementId = remainderSettlement.id;
            }

            log.info(
                {
                    businessId,
                    paymentId: payment.id,
                    settledCount: unsettled.length,
                    paymentAmount,
                    remainderAmount,
                    direction,
                },
                'settling:business:completed',
            );

            return {
                paymentId: payment.id,
                settledCount: unsettled.length,
                netAmount: paymentAmount,
                direction,
                remainderAmount,
                remainderSettlementId,
            };
        });
    }
}
