import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { orders as ordersTable, drivers as driversTable, settlements } from '@/database/schema';

export const driverCashSummary: NonNullable<QueryResolvers['driverCashSummary']> = async (
    _parent,
    { startDate, endDate },
    { db, userData },
) => {
    if (!userData?.userId || userData.role !== 'DRIVER') {
        throw new GraphQLError('Only drivers can access cash summary', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    // Look up driver record
    const driverRecord = await db.query.drivers.findFirst({
        where: eq(driversTable.userId, userData.userId),
    });
    if (!driverRecord) {
        throw new GraphQLError('Driver record not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    const driverId = driverRecord.id;

    // ── Cash collected from delivered CASH_TO_DRIVER orders ──
    const orderConditions = [
        eq(ordersTable.driverId, userData.userId), // orders.driverId is the user ID
        eq(ordersTable.status, 'DELIVERED'),
        eq(ordersTable.paymentCollection, 'CASH_TO_DRIVER'),
    ];
    if (startDate) orderConditions.push(gte(ordersTable.orderDate, startDate));
    if (endDate) orderConditions.push(lte(ordersTable.orderDate, endDate));

    const cashResult = await db
        .select({
            cashCollected: sql<number>`
                COALESCE(SUM(
                    CAST(${ordersTable.actualPrice} AS NUMERIC)
                    + CAST(${ordersTable.deliveryPrice} AS NUMERIC)
                    + CAST(${ordersTable.prioritySurcharge} AS NUMERIC)
                    - COALESCE(CAST(${ordersTable.businessPrice} AS NUMERIC), CAST(${ordersTable.basePrice} AS NUMERIC))
                ), 0)::FLOAT
            `,
            totalDeliveries: sql<number>`COUNT(*)::INT`,
        })
        .from(ordersTable)
        .where(and(...orderConditions))
        .then((rows) => rows[0]);

    // ── Unsettled settlement breakdown ──
    const settlementConditions = [
        eq(settlements.type, 'DRIVER'),
        eq(settlements.driverId, driverId),
        eq(settlements.isSettled, false),
    ];
    if (startDate) settlementConditions.push(gte(settlements.createdAt, startDate));
    if (endDate) settlementConditions.push(lte(settlements.createdAt, endDate));

    const balanceResult = await db
        .select({
            youOwePlatform: sql<number>`
                COALESCE(SUM(CASE WHEN ${settlements.direction} = 'RECEIVABLE'
                    THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END), 0)::FLOAT
            `,
            platformOwesYou: sql<number>`
                COALESCE(SUM(CASE WHEN ${settlements.direction} = 'PAYABLE'
                    THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END), 0)::FLOAT
            `,
        })
        .from(settlements)
        .where(and(...settlementConditions))
        .then((rows) => rows[0]);

    const cashCollected = cashResult?.cashCollected ?? 0;
    const totalDeliveries = cashResult?.totalDeliveries ?? 0;
    const youOwePlatform = balanceResult?.youOwePlatform ?? 0;
    const platformOwesYou = balanceResult?.platformOwesYou ?? 0;
    const netSettlement = platformOwesYou - youOwePlatform;
    const takeHome = cashCollected + netSettlement;

    return {
        cashCollected,
        totalDeliveries,
        youOwePlatform,
        platformOwesYou,
        netSettlement,
        takeHome,
    };
};