import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { settlements } from '@/database/schema';
import { businesses, orderItems, products } from '@/database/schema';
import { and, eq, inArray } from 'drizzle-orm';

const log = logger.child({ resolver: 'orderQuery' });

export const order: NonNullable<QueryResolvers['order']> = async (_parent, { id }, { orderService, userData, db }) => {
    log.info({ orderId: id, requesterId: userData.userId, role: userData.role }, 'order:query:requested');

    // Check authentication
    if (!userData.userId) {
        log.warn({ orderId: id }, 'order:query:unauthorized-no-user');
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const dbOrder = await orderService.orderRepository.findById(id);

    if (!dbOrder) {
        log.warn({ orderId: id, requesterId: userData.userId, role: userData.role }, 'order:query:not-found');
        throw new GraphQLError('Order not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    let settlementFallbackUsed = false;

    // Check authorization based on role BEFORE mapping (using dbOrder.userId)
    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'DRIVER':
            // Super admins and drivers can see any order
            break;

        case 'CUSTOMER':
            // Customers can only see their own orders
            if (dbOrder.userId !== userData.userId) {
                log.warn({ orderId: id, requesterId: userData.userId, orderUserId: dbOrder.userId }, 'order:query:forbidden-customer');
                throw new GraphQLError('Forbidden: You can only view your own orders', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            break;

        case 'BUSINESS_OWNER':
        case 'BUSINESS_EMPLOYEE':
            // Business users can only see orders that contain their items, or orders with an explicit settlement for their business.
            if (!userData.businessId) {
                throw new GraphQLError('Business admin must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const hasBusinessItems = await orderService.orderContainsBusiness(dbOrder.id, userData.businessId);
            if (!hasBusinessItems) {
                const businessSettlement = await db.query.settlements.findFirst({
                    columns: { id: true },
                    where: and(
                        eq(settlements.orderId, dbOrder.id),
                        eq(settlements.type, 'BUSINESS'),
                        eq(settlements.businessId, userData.businessId),
                    ),
                });

                if (businessSettlement) {
                    settlementFallbackUsed = true;
                    break;
                }

                log.warn({ orderId: id, requesterId: userData.userId, businessId: userData.businessId }, 'order:query:forbidden-business');
                throw new GraphQLError('Forbidden: You can only view orders from your business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            break;

        default:
            log.warn({ orderId: id, requesterId: userData.userId, role: userData.role }, 'order:query:forbidden-invalid-role');
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }

    log.info({ orderId: id, requesterId: userData.userId, role: userData.role, status: dbOrder.status }, 'order:query:success');

    // Authorization passed, now map and return the order
    const mappedOrder: any = await orderService.mapToOrderPublic(dbOrder);

    if (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') {
        const scopedBusinesses = (mappedOrder.businesses || []).filter((entry: any) => entry?.business?.id === userData.businessId);

        if (scopedBusinesses.length > 0) {
            mappedOrder.businesses = scopedBusinesses;
            return mappedOrder;
        }

        // Historical edge-case: product-to-business ownership changed after settlement generation.
        // If access was granted through settlement fallback, construct a business-scoped item view from order_items.
        if (settlementFallbackUsed && userData.businessId) {
            const dbOrderItems = await db.query.orderItems.findMany({
                where: eq(orderItems.orderId, dbOrder.id),
            });

            const productIds = [...new Set(dbOrderItems.map((item: any) => item.productId))];
            const productRows =
                productIds.length > 0
                    ? await db
                          .select({ id: products.id, name: products.name, imageUrl: products.imageUrl })
                          .from(products)
                          .where(inArray(products.id, productIds))
                    : [];

            const productById = new Map(productRows.map((p: any) => [p.id, p]));
            const topLevelItems = dbOrderItems.filter((item: any) => !item.parentOrderItemId);

            const fallbackItems = topLevelItems.map((item: any) => {
                const productRow = productById.get(item.productId);
                return {
                    id: item.id,
                    productId: item.productId,
                    name: productRow?.name ?? 'Order item',
                    imageUrl: productRow?.imageUrl || undefined,
                    quantity: item.quantity,
                    unitPrice: Number(item.finalAppliedPrice),
                    notes: item.notes || undefined,
                    selectedOptions: [],
                    childItems: [],
                    parentOrderItemId: item.parentOrderItemId || undefined,
                };
            });

            const businessRow = await db.query.businesses.findFirst({
                where: eq(businesses.id, userData.businessId),
            });

            if (businessRow) {
                mappedOrder.businesses = [
                    {
                        business: {
                            id: businessRow.id,
                            name: businessRow.name,
                            businessType: businessRow.businessType,
                            imageUrl: businessRow.imageUrl || undefined,
                            isActive: businessRow.isActive ?? true,
                            location: {
                                latitude: businessRow.locationLat,
                                longitude: businessRow.locationLng,
                                address: businessRow.locationAddress,
                            },
                            workingHours: {
                                opensAt: `${Math.floor(businessRow.opensAt / 60)
                                    .toString()
                                    .padStart(2, '0')}:${(businessRow.opensAt % 60).toString().padStart(2, '0')}`,
                                closesAt: `${Math.floor(businessRow.closesAt / 60)
                                    .toString()
                                    .padStart(2, '0')}:${(businessRow.closesAt % 60).toString().padStart(2, '0')}`,
                            },
                            avgPrepTimeMinutes: businessRow.avgPrepTimeMinutes,
                            commissionPercentage: Number(businessRow.commissionPercentage),
                            createdAt: new Date(businessRow.createdAt),
                            updatedAt: new Date(businessRow.updatedAt),
                            isOpen: true,
                        },
                        items: fallbackItems,
                    },
                ];
                return mappedOrder;
            }
        }

        mappedOrder.businesses = [];
    }

    return mappedOrder;
};
