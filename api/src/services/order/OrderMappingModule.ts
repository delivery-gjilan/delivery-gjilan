import {
    orderItems as orderItemsTable,
    orders as ordersTable,
    products as productsTable,
    businesses as businessesTable,
    orderPromotions as orderPromotionsTable,
    orderItemOptions as orderItemOptionsTable,
    optionGroups as optionGroupsTable,
    options as optionsDbTable,
} from '@/database/schema';
import { asc, inArray, ne, and } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus, OrderPaymentCollection } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { parseDbTimestamp } from '@/lib/dateTime';
import logger from '@/lib/logger';
import type { OrderServiceDeps } from './types';

const log = logger.child({ module: 'OrderMappingModule' });

export class OrderMappingModule {
    constructor(private deps: OrderServiceDeps) {}

    async mapOrders(dbOrders: DbOrder[]): Promise<Order[]> {
        if (dbOrders.length === 0) {
            return [];
        }

        const db = this.deps.db;
        const orderIds = dbOrders.map((order) => order.id);

        const allItems = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds));

        const itemsByOrderId = new Map<string, typeof allItems>();
        for (const item of allItems) {
            const rows = itemsByOrderId.get(item.orderId) ?? [];
            rows.push(item);
            itemsByOrderId.set(item.orderId, rows);
        }

        const allItemIds = allItems.map((i) => i.id);
        const productIds = [...new Set(allItems.map((i) => i.productId))];
        const userIds = [...new Set(dbOrders.map((order) => order.userId))];
        const driverIds = [...new Set(dbOrders.map((order) => order.driverId).filter((driverId): driverId is string => Boolean(driverId)))];

        const [allItemOptionRows, productsRows, dbPromotions, driverUsers, firstOrderRows] = await Promise.all([
            allItemIds.length > 0
                ? db
                      .select()
                      .from(orderItemOptionsTable)
                      .where(inArray(orderItemOptionsTable.orderItemId, allItemIds))
                : Promise.resolve([]),
            productIds.length > 0
                ? db.select().from(productsTable).where(inArray(productsTable.id, productIds))
                : Promise.resolve([]),
            db
                .select()
                .from(orderPromotionsTable)
                .where(inArray(orderPromotionsTable.orderId, orderIds))
                .catch((err) => {
                    log.error({ err, orderIds }, 'order:promotions:fetch_failed');
                    return [];
                }),
            driverIds.length > 0 ? this.deps.authRepository.findDriversByIds(driverIds) : Promise.resolve([]),
            userIds.length > 0
                ? db
                      .selectDistinctOn([ordersTable.userId], {
                          userId: ordersTable.userId,
                          id: ordersTable.id,
                      })
                      .from(ordersTable)
                      .where(inArray(ordersTable.userId, userIds))
                      .orderBy(ordersTable.userId, asc(ordersTable.orderDate), asc(ordersTable.createdAt))
                : Promise.resolve([]),
        ]);

        // Batch-fetch option groups and options for names
        const ogIds = [...new Set(allItemOptionRows.map((r) => r.optionGroupId))];
        const optIds = [...new Set(allItemOptionRows.map((r) => r.optionId))];
        const [ogRows, optRows] = await Promise.all([
            ogIds.length > 0
                ? db.select().from(optionGroupsTable).where(inArray(optionGroupsTable.id, ogIds))
                : Promise.resolve([]),
            optIds.length > 0
                ? db.select().from(optionsDbTable).where(inArray(optionsDbTable.id, optIds))
                : Promise.resolve([]),
        ]);
        const ogNameById = new Map(ogRows.map((og) => [og.id, og.name]));
        const optNameById = new Map(optRows.map((o) => [o.id, o.name]));

        const promotionsByOrderId = new Map<string, typeof dbPromotions>();
        for (const promotion of dbPromotions) {
            const rows = promotionsByOrderId.get(promotion.orderId) ?? [];
            rows.push(promotion);
            promotionsByOrderId.set(promotion.orderId, rows);
        }

        const itemOptionsMap = new Map<string, typeof allItemOptionRows>();
        for (const row of allItemOptionRows) {
            const arr = itemOptionsMap.get(row.orderItemId) ?? [];
            arr.push(row);
            itemOptionsMap.set(row.orderItemId, arr);
        }

        const productById = new Map(productsRows.map((p) => [p.id, p]));

        const driverUserById = new Map(driverUsers.map((driverUser) => [driverUser.id, driverUser]));
        const firstOrderIdByUserId = new Map(firstOrderRows.map((row) => [row.userId, row.id]));

        const childItemsMap = new Map<string, typeof allItems>();
        for (const item of allItems) {
            if (item.parentOrderItemId) {
                const arr = childItemsMap.get(item.parentOrderItemId) ?? [];
                arr.push(item);
                childItemsMap.set(item.parentOrderItemId, arr);
            }
        }
        
        // Helper to build an OrderItem from a DB row
        const buildOrderItem = (item: (typeof allItems)[0]): OrderItem => {
            const product = productById.get(item.productId);

            const selectedOptions = (itemOptionsMap.get(item.id) ?? []).map((oio) => ({
                id: oio.id,
                optionGroupId: oio.optionGroupId,
                optionGroupName: ogNameById.get(oio.optionGroupId) ?? '',
                optionId: oio.optionId,
                optionName: optNameById.get(oio.optionId) ?? '',
                priceAtOrder: oio.priceAtOrder,
            }));

            const children = (childItemsMap.get(item.id) ?? []).map(buildOrderItem);

            return {
                id: item.id,
                productId: item.productId,
                name: product?.name ?? '',
                imageUrl: product?.imageUrl || undefined,
                quantity: item.quantity,
                unitPrice: Number(item.finalAppliedPrice), // DB: finalAppliedPrice → GraphQL: unitPrice
                notes: item.notes || undefined,
                selectedOptions,
                childItems: children,
                parentOrderItemId: item.parentOrderItemId || undefined,
            };
        };

        const businessIds = [...new Set(productsRows.map((product) => product.businessId))];
        const businessRows = await (businessIds.length > 0
            ? db.select().from(businessesTable).where(inArray(businessesTable.id, businessIds))
            : Promise.resolve([]));
        const businessById = new Map(businessRows.map((b) => [b.id, b]));

        return dbOrders.map((dbOrder) => {
            const orderItems = itemsByOrderId.get(dbOrder.id) ?? [];
            const topLevelItems = orderItems.filter((item) => !item.parentOrderItemId);
            const businessMap = new Map<string, OrderItem[]>();

            for (const item of topLevelItems) {
                const product = productById.get(item.productId);
                if (!product) continue;

                const rows = businessMap.get(product.businessId) ?? [];
                rows.push(buildOrderItem(item));
                businessMap.set(product.businessId, rows);
            }

            const businessOrderList: OrderBusiness[] = [];

            for (const [businessId, businessItems] of businessMap) {
                const business = businessById.get(businessId);
                if (business) {
                    businessOrderList.push({
                        business: {
                            id: business.id,
                            name: business.name,
                            businessType: business.businessType,
                            imageUrl: business.imageUrl || undefined,
                            isActive: business.isActive ?? true,
                            location: {
                                latitude: business.locationLat,
                                longitude: business.locationLng,
                                address: business.locationAddress,
                            },
                            workingHours: {
                                opensAt: this.minutesToTimeString(business.opensAt),
                                closesAt: this.minutesToTimeString(business.closesAt),
                            },
                            avgPrepTimeMinutes: business.avgPrepTimeMinutes,
                            commissionPercentage: Number(business.commissionPercentage),
                            minOrderAmount: Number(business.minOrderAmount ?? 0),
                            isFeatured: business.isFeatured ?? false,
                            featuredSortOrder: business.featuredSortOrder ?? 0,
                            createdAt: new Date(business.createdAt),
                            updatedAt: new Date(business.updatedAt),
                            isOpen: true,
                            isTemporarilyClosed: business.isTemporarilyClosed ?? false,
                            schedule: [],
                            prepTimeOverrideMinutes: (business as any).prepTimeOverrideMinutes ?? null,
                            temporaryClosureReason: (business as any).temporaryClosureReason ?? null,
                        },
                        items: businessItems,
                    });
                }
            }

            const isFirstOrder = firstOrderIdByUserId.get(dbOrder.userId) === dbOrder.id;
            const driverUser = dbOrder.driverId ? driverUserById.get(dbOrder.driverId) : undefined;
            const orderPromotions = promotionsByOrderId.get(dbOrder.id) ?? [];

            return {
                id: dbOrder.id,
                displayId: dbOrder.displayId,
                userId: dbOrder.userId,
                businessId: dbOrder.businessId,
                deliveryPrice: Number(dbOrder.deliveryPrice),
                totalPrice:
                    Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
                orderPrice: Number(dbOrder.actualPrice),
                originalPrice: dbOrder.originalPrice != null ? Number(dbOrder.originalPrice) : undefined,
                orderDate: parseDbTimestamp(dbOrder.orderDate) ?? new Date(),
                updatedAt: parseDbTimestamp(dbOrder.updatedAt) ?? new Date(),
                status: dbOrder.status as OrderStatus,
                paymentCollection: dbOrder.paymentCollection as OrderPaymentCollection,
                preparationMinutes: dbOrder.preparationMinutes ?? undefined,
                estimatedReadyAt: parseDbTimestamp(dbOrder.estimatedReadyAt) ?? undefined,
                preparingAt: parseDbTimestamp(dbOrder.preparingAt) ?? undefined,
                readyAt: parseDbTimestamp(dbOrder.readyAt) ?? undefined,
                outForDeliveryAt: parseDbTimestamp(dbOrder.outForDeliveryAt) ?? undefined,
                deliveredAt: parseDbTimestamp(dbOrder.deliveredAt) ?? undefined,
                cancelledAt: parseDbTimestamp(dbOrder.cancelledAt) ?? undefined,
                cancellationReason: dbOrder.cancellationReason ?? undefined,
                adminNote: (dbOrder as any).adminNote ?? undefined,
                driver: driverUser
                    ? {
                          id: driverUser.id,
                          email: driverUser.email,
                          firstName: driverUser.firstName,
                          lastName: driverUser.lastName,
                          address: driverUser.address || undefined,
                          phoneNumber: driverUser.phoneNumber || undefined,
                          emailVerified: driverUser.emailVerified,
                          phoneVerified: driverUser.phoneVerified,
                          signupStep: driverUser.signupStep,
                          role: driverUser.role,
                          businessId: driverUser.businessId || undefined,
                          business: undefined,
                          adminNote: driverUser.adminNote || undefined,
                          flagColor: driverUser.flagColor || undefined,
                          isDemoAccount: (driverUser as any).isDemoAccount ?? false,
                          totalOrders: 0,
                          isTrustedCustomer: false,
                          isOnline: (driverUser as any).isOnline ?? false,
                          permissions: [],
                          preferredLanguage: ((driverUser as any).preferredLanguage === 'en' ? 'EN' : 'AL') as any,
                      }
                    : undefined,
                dropOffLocation: {
                    latitude: dbOrder.dropoffLat,
                    longitude: dbOrder.dropoffLng,
                    address: dbOrder.dropoffAddress,
                },
                pickupLocations: businessOrderList.map((bo) => bo.business.location),
                driverNotes: dbOrder.driverNotes || undefined,
                needsApproval: dbOrder.status === 'AWAITING_APPROVAL',
                locationFlagged: (dbOrder as any).locationFlagged ?? false,
                approvalReasons: (() => {
                    const reasons: Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> = [];
                    const locationFlagged = (dbOrder as any).locationFlagged ?? false;
                    const totalPrice = Number(dbOrder.actualPrice ?? 0) + Number(dbOrder.deliveryPrice ?? 0);
                    if (isFirstOrder) reasons.push('FIRST_ORDER');
                    if (locationFlagged) reasons.push('OUT_OF_ZONE');
                    if (totalPrice > 20) reasons.push('HIGH_VALUE');
                    return reasons;
                })(),
                prioritySurcharge: Number((dbOrder as any).prioritySurcharge ?? 0),
                businesses: businessOrderList,
                orderPromotions: orderPromotions.map((promotion) => ({
                    id: promotion.id,
                    promotionId: promotion.promotionId,
                    appliesTo: promotion.appliesTo as any,
                    discountAmount: Number(promotion.discountAmount),
                })),
            } as any;
        });
    }

    async mapToOrder(dbOrder: DbOrder): Promise<Order> {
        const [order] = await this.mapOrders([dbOrder]);
        return order!;
    }

    async mapToOrderPublic(dbOrder: DbOrder): Promise<Order> {
        return this.mapToOrder(dbOrder);
    }

    minutesToTimeString(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
}
