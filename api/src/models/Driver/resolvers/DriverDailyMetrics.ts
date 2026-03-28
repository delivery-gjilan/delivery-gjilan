import type { DriverDailyMetricsResolvers } from './../../../generated/types.generated';

export const DriverDailyMetrics: DriverDailyMetricsResolvers = {
    activeOrdersCount: (parent) => parent.activeOrdersCount,
    maxActiveOrders: (parent) => parent.maxActiveOrders,
    deliveredTodayCount: (parent) => parent.deliveredTodayCount,
    grossEarningsToday: (parent) => parent.grossEarningsToday,
    commissionPercentage: (parent) => parent.commissionPercentage,
    netEarningsToday: (parent) => parent.netEarningsToday,
    isOnline: (parent) => parent.isOnline,
    connectionStatus: (parent) => parent.connectionStatus,
};