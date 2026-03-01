import type { QueryResolvers } from './../../../../generated/types.generated';
import { drivers as driversTable, orders as ordersTable, settlements as settlementsTable } from '@/database/schema';
import { eq, and, gte, notInArray } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const myDriverMetrics: NonNullable<QueryResolvers['myDriverMetrics']> = async (_parent, _arg, { userData, db }) => {
    if (!userData.userId || userData.role !== 'DRIVER') {
        throw AppError.unauthorized();
    }

    const driverId = userData.userId;

    // Get driver record for commission & maxActiveOrders
    const driverRecord = await db.query.drivers.findFirst({
        where: eq(driversTable.userId, driverId),
    });

    const commissionPercentage = Number(driverRecord?.commissionPercentage ?? 0);
    const maxActiveOrders = Number(driverRecord?.maxActiveOrders ?? 2);
    const isOnline = driverRecord?.onlinePreference ?? false;
    const connectionStatus = driverRecord?.connectionStatus ?? 'DISCONNECTED';

    // Active orders (all non-terminal orders assigned to this driver)
    const activeOrders = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(
            and(
                eq(ordersTable.driverId, driverId),
                notInArray(ordersTable.status, ['DELIVERED', 'CANCELLED']),
            ),
        );

    // Today's delivered orders
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deliveredToday = await db
        .select({ id: ordersTable.id, price: ordersTable.price, deliveryPrice: ordersTable.deliveryPrice })
        .from(ordersTable)
        .where(
            and(
                eq(ordersTable.driverId, driverId),
                eq(ordersTable.status, 'DELIVERED'),
                gte(ordersTable.updatedAt, todayStart.toISOString()),
            ),
        );

    // Gross earnings = sum of deliveryPrice on delivered orders today
    // (drivers earn based on delivery fee, not order price)
    const grossEarningsToday = deliveredToday.reduce(
        (sum, o) => sum + Number(o.deliveryPrice),
        0,
    );

    // Net = gross minus commission percentage taken by platform
    const commissionAmount = (grossEarningsToday * commissionPercentage) / 100;
    const netEarningsToday = grossEarningsToday - commissionAmount;

    return {
        activeOrdersCount: activeOrders.length,
        maxActiveOrders,
        deliveredTodayCount: deliveredToday.length,
        grossEarningsToday: Math.round(grossEarningsToday * 100) / 100,
        commissionPercentage,
        netEarningsToday: Math.round(netEarningsToday * 100) / 100,
        isOnline,
        connectionStatus: connectionStatus as any,
    };
};