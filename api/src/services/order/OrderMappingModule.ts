import {
    orders as ordersTable,
} from '@/database/schema';
import { asc, inArray, and } from 'drizzle-orm';
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
        const userIds = [...new Set(dbOrders.map((order) => order.userId))];
        const driverIds = [...new Set(dbOrders.map((order) => order.driverId).filter((id): id is string => Boolean(id)))];

        // Single relational query fetches items + options + option-group/option names + products + businesses + promotions
        // in one DB round-trip (Drizzle issues sub-selects, not N+1).
        // driverUsers and firstOrderRows are independent and run in parallel.
        const [ordersWithRelations, driverUsers, firstOrderRows] = await Promise.all([
            db.query.orders.findMany({
                where: inArray(ordersTable.id, orderIds),
                with: {
                    orderItems: {
                        with: {
                            orderItemOptions: {
                                with: {
                                    optionGroup: true,
                                    option: true,
                                },
                            },
                            product: {
                                with: { business: true },
                            },
                            childOrderItems: {
                                with: {
                                    orderItemOptions: {
                                        with: {
                                            optionGroup: true,
                                            option: true,
                                        },
                                    },
                                    product: true,
                                },
                            },
                        },
                    },
                    orderPromotions: true,
                },
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

        const driverUserById = new Map(driverUsers.map((u) => [u.id, u]));
        const firstOrderIdByUserId = new Map(firstOrderRows.map((row) => [row.userId, row.id]));
        // Index the rich relational results by orderId to preserve original order
        const richOrderById = new Map(ordersWithRelations.map((o) => [o.id, o]));

        // Type alias for the relational order item shape coming back from Drizzle
        type RichOrderItem = NonNullable<(typeof ordersWithRelations)[0]['orderItems'][0]>;

        const buildOrderItem = (item: RichOrderItem): OrderItem => {
            const selectedOptions = (item.orderItemOptions ?? []).map((oio) => ({
                id: oio.id,
                optionGroupId: oio.optionGroupId,
                optionGroupName: oio.optionGroup?.name ?? '',
                optionId: oio.optionId,
                optionName: oio.option?.name ?? '',
                priceAtOrder: oio.priceAtOrder,
            }));

            const children = (item.childOrderItems ?? []).map((child) => buildOrderItem(child as RichOrderItem));

            return {
                id: item.id,
                productId: item.productId,
                name: item.product?.name ?? '',
                imageUrl: item.product?.imageUrl || undefined,
                quantity: item.quantity,
                unitPrice: Number(item.finalAppliedPrice),
                notes: item.notes || undefined,
                selectedOptions,
                childItems: children,
                parentOrderItemId: item.parentOrderItemId || undefined,
            };
        };

        return dbOrders.map((dbOrder) => {
            const richOrder = richOrderById.get(dbOrder.id);
            const allItems = richOrder?.orderItems ?? [];
            const topLevelItems = allItems.filter((item) => !item.parentOrderItemId);
            const businessMap = new Map<string, OrderItem[]>();

            for (const item of topLevelItems) {
                const businessId = item.product?.businessId;
                if (!businessId) continue;
                const rows = businessMap.get(businessId) ?? [];
                rows.push(buildOrderItem(item));
                businessMap.set(businessId, rows);
            }

            const businessOrderList: OrderBusiness[] = [];

            for (const [businessId, businessItems] of businessMap) {
                // Derive business from any item's product.business (all items share the same business)
                const business = topLevelItems.find((i) => i.product?.businessId === businessId)?.product?.business;
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
                            ratingAverage: 0,
                            ratingCount: 0,
                        },
                        items: businessItems,
                    });
                }
            }

            const isFirstOrder = firstOrderIdByUserId.get(dbOrder.userId) === dbOrder.id;
            const driverUser = dbOrder.driverId ? driverUserById.get(dbOrder.driverId) : undefined;
            const orderPromotions = richOrder?.orderPromotions ?? [];

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
