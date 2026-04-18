import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { adjustBusinessInventoryQuantities } from '@/services/order/adjustBusinessInventoryQuantities';
import { buildBusinessGracePeriodFilter } from '@/services/scheduleBusinessNotification';

export const orders: NonNullable<QueryResolvers['orders']> = async (_parent, { limit, offset, statuses, startDate, endDate }, { orderService, userData, db }) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const effectiveLimit = limit ?? 100;
    const effectiveOffset = offset ?? 0;

    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
            return orderService.getOrdersPaginated(effectiveLimit, effectiveOffset, statuses ?? undefined, startDate ?? undefined, endDate ?? undefined);

        case 'DRIVER': {
            if (statuses && statuses.length > 0) {
                const byStatus = await Promise.all(
                    statuses.map((status) => orderService.getOrdersForDriverByStatus(userData.userId, status)),
                );

                const merged = byStatus.flat();
                const uniqueById = Array.from(new Map(merged.map((order) => [order.id, order])).values());

                const filteredByDate = uniqueById.filter((order) => {
                    const orderTime = new Date(order.orderDate).getTime();
                    if (startDate && orderTime < new Date(startDate).getTime()) return false;
                    if (endDate && orderTime > new Date(endDate).getTime()) return false;
                    return true;
                });

                const sorted = filteredByDate.sort(
                    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
                );
                const paginated = sorted.slice(effectiveOffset, effectiveOffset + effectiveLimit);
                const totalCount = sorted.length;
                return { orders: paginated, totalCount, hasMore: effectiveOffset + effectiveLimit < totalCount };
            }

            const orders = await orderService.getOrdersForDriver(userData.userId, effectiveLimit);
            return { orders, totalCount: orders.length, hasMore: false };
        }

        case 'CUSTOMER': {
            const orders = await orderService.getOrdersByUserId(userData.userId, effectiveLimit, effectiveOffset);
            return { orders, totalCount: orders.length, hasMore: orders.length === effectiveLimit };
        }

        case 'BUSINESS_OWNER':
        case 'BUSINESS_EMPLOYEE': {
            if (!userData.businessId) {
                throw new GraphQLError('Business user must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            const orders = await orderService.getOrdersByBusinessId(userData.businessId);
            const withinGrace = await buildBusinessGracePeriodFilter();
            const visible = orders.filter(withinGrace);
            const adjusted = await adjustBusinessInventoryQuantities(db, visible, userData.businessId);
            return { orders: adjusted, totalCount: adjusted.length, hasMore: false };
        }

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
