import { orders as ordersTable } from '@/database/schema';
import type { SettlementCalculationEngine } from '@/services/SettlementCalculationEngine';

export type DriverTakeHomePreviewOrderSnapshot = Pick<
    typeof ordersTable.$inferSelect,
    'actualPrice' | 'deliveryPrice' | 'prioritySurcharge' | 'driverTip' | 'businessPrice' | 'basePrice' | 'paymentCollection'
>;

export function calculateDriverTakeHomePreview(
    dbOrder: DriverTakeHomePreviewOrderSnapshot,
    calculations: Awaited<ReturnType<SettlementCalculationEngine['calculateOrderSettlements']>>,
): number {
    const totalPrice =
        Number(dbOrder.actualPrice ?? 0) +
        Number(dbOrder.deliveryPrice ?? 0) +
        Number(dbOrder.prioritySurcharge ?? 0) +
        Number(dbOrder.driverTip ?? 0);
    const businessPrice = Number(dbOrder.businessPrice ?? dbOrder.basePrice ?? dbOrder.actualPrice ?? 0);
    const cashCollected = dbOrder.paymentCollection === 'CASH_TO_DRIVER'
        ? totalPrice - businessPrice
        : 0;

    const driverSettlements = calculations.filter((entry) => entry.type === 'DRIVER');
    const youOwePlatform = driverSettlements
        .filter((entry) => entry.direction === 'RECEIVABLE')
        .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const platformOwesYou = driverSettlements
        .filter((entry) => entry.direction === 'PAYABLE')
        .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

    return Number((cashCollected + (platformOwesYou - youOwePlatform)).toFixed(2));
}
