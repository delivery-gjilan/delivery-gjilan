import type { OrderResolvers } from './../../../generated/types.generated';
import { SettlementCalculationEngine } from '@/services/SettlementCalculationEngine';
import { orderItems as orderItemsTable, orderReviews, orders as ordersTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

export const Order: OrderResolvers = {
    userId: (parent) => {
        // parent.userId is set from DbOrder.userId in OrderService.mapToOrder
        return (parent as any).userId ?? '';
    },

    pickupLocations: (parent) => {
        return (parent.businesses ?? []).map(b => b.business.location);
    },

    user: async (parent, _args, { loaders }): Promise<any> => {
        if (!parent.userId) {
            return null;
        }
        
        try {
            return await loaders.userLoader.load(String(parent.userId));
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:resolveUser failed');
            return null;
        }
    },
    
    orderPromotions: async (parent, _args, { loaders }) => {
        try {
            return await loaders.orderPromotionsLoader.load(String(parent.id));
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:resolvePromotions failed');
            return [];
        }
    },

    review: async (parent, _args, { db, userData }) => {
        if (!userData.userId) return null;

        const role = userData.role;
        const canViewAsCustomer = role === 'CUSTOMER' && String((parent as any).userId || '') === userData.userId;
        const canViewAsBusiness =
            (role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE') &&
            !!userData.businessId &&
            String((parent as any).businessId || '') === userData.businessId;

        if (!canViewAsCustomer && !canViewAsBusiness) {
            return null;
        }

        const row = await db.query.orderReviews.findFirst({
            where: eq(orderReviews.orderId, String(parent.id)),
        });

        if (!row) return null;

        return {
            ...row,
            comment: row.comment ?? null,
            quickFeedback: row.quickFeedback ?? [],
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        };
    },

    settlementPreview: async (parent, _args, { db, userData }) => {
        // Only SUPER_ADMIN and ADMIN can see settlement previews
        if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'ADMIN') {
            return null;
        }

        try {
            const orderId = String(parent.id);

            // Fetch the raw DbOrder and its items in parallel
            const [[dbOrder], items] = await Promise.all([
                db.select().from(ordersTable).where(eq(ordersTable.id, orderId)),
                db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId)),
            ]);
            if (!dbOrder) return null;

            const engine = new SettlementCalculationEngine(db);
            const calculations = await engine.calculateOrderSettlements(dbOrder, items, dbOrder.driverId);

            let totalReceivable = 0;
            let totalPayable = 0;
            const lineItems = calculations.map((c) => {
                if (c.direction === 'RECEIVABLE') totalReceivable += c.amount;
                else totalPayable += c.amount;

                return {
                    type: c.type,
                    direction: c.direction,
                    amount: c.amount,
                    reason: c.reason,
                    businessId: c.businessId,
                    driverId: c.driverId,
                    ruleId: c.ruleId,
                };
            });

            return {
                lineItems,
                totalReceivable: Number(totalReceivable.toFixed(2)),
                totalPayable: Number(totalPayable.toFixed(2)),
                netMargin: Number((totalReceivable - totalPayable).toFixed(2)),
                driverAssigned: Boolean(dbOrder.driverId),
            };
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:settlementPreview failed');
            return null;
        }
    },
};
