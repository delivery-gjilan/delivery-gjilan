import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { getDB } from '@/database';
import {
    orderItems as orderItemsTable,
    products as productsTable,
    businesses as businessesTable,
    businessHours as businessHoursTable,
    userBehaviors as userBehaviorsTable,
    productStocks as productStocksTable,
    orderPromotions as orderPromotionsTable,
} from '@/database/schema';
import { userPromoMetadata } from '@/database/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus, CreateOrderInput } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { PubSub, publish, subscribe, topics } from '@/lib/pubsub';
import { GraphQLError } from 'graphql';
import { PromotionEngine } from '@/services/PromotionEngine';
import { FinancialService } from '@/services/FinancialService';
import logger from '@/lib/logger';

const log = logger.child({ service: 'OrderService' });

export class OrderService {
    public orderRepository: OrderRepository; // Made public for resolver access

    constructor(
        orderRepository: OrderRepository,
        private authRepository: AuthRepository,
        private productRepository: ProductRepository,
        private pubsub: PubSub,
    ) {
        this.orderRepository = orderRepository;
    }

    async createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
        // 1. Validate User
        const user = await this.authRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.signupStep !== 'COMPLETED') {
            throw new Error('User has not completed signup process');
        }

        // 2. Validate Products and Calculate Totals
        let calculatedItemsTotal = 0;
        const itemsToCreate = [];
        const cartItems = [] as Array<{ productId: string; businessId: string; quantity: number; price: number }>;
        const businessIds = new Set<string>();

        for (const itemInput of input.items) {
            const product = await this.productRepository.findById(itemInput.productId);
            if (!product) {
                throw new Error(`Product with ID ${itemInput.productId} not found`);
            }
            if (!product.isAvailable) {
                throw new Error(`Product ${product.name} is currently unavailable`);
            }

            // Use DB price for security, or validate input price
            // Here taking DB price to be safe
            const price = Number(product.isOnSale && product.salePrice ? product.salePrice : product.price);
            log.debug({ price, quantity: itemInput.quantity, productId: itemInput.productId }, 'order:item:price');
            calculatedItemsTotal += price * itemInput.quantity;

            itemsToCreate.push({
                productId: itemInput.productId,
                quantity: itemInput.quantity,
                price: price, // Store the price at time of purchase
            });

            cartItems.push({
                productId: itemInput.productId,
                businessId: product.businessId,
                quantity: itemInput.quantity,
                price: price,
            });

            businessIds.add(product.businessId);
        }

        log.debug({ itemsTotal: calculatedItemsTotal, deliveryPrice: input.deliveryPrice }, 'order:totals');

        // 2b. Check that all businesses are currently open
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const db = await getDB();

        for (const bizId of businessIds) {
            const hoursRows = await db
                .select()
                .from(businessHoursTable)
                .where(
                    sql`${businessHoursTable.businessId} = ${bizId} AND ${businessHoursTable.dayOfWeek} = ${currentDay}`,
                );

            if (hoursRows.length === 0) {
                // No schedule rows for today — check legacy opensAt/closesAt on business row
                const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
                if (biz) {
                    const isOpenLegacy =
                        biz.closesAt <= biz.opensAt
                            ? currentMinutes >= biz.opensAt || currentMinutes < biz.closesAt
                            : currentMinutes >= biz.opensAt && currentMinutes < biz.closesAt;
                    if (!isOpenLegacy) {
                        throw new GraphQLError(`Business "${biz.name}" is currently closed.`);
                    }
                }
            } else {
                const isOpenNow = hoursRows.some((slot) => {
                    if (slot.closesAt <= slot.opensAt) {
                        return currentMinutes >= slot.opensAt || currentMinutes < slot.closesAt;
                    }
                    return currentMinutes >= slot.opensAt && currentMinutes < slot.closesAt;
                });
                if (!isOpenNow) {
                    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
                    throw new GraphQLError(`Business "${biz?.name ?? bizId}" is currently closed.`);
                }
            }
        }

        // 3. Apply PromotionEngine (server-side validation)
        const promotionEngine = new PromotionEngine(await getDB());
        const cartContext = {
            items: cartItems,
            subtotal: calculatedItemsTotal,
            deliveryPrice: input.deliveryPrice,
            businessIds: Array.from(businessIds),
        };

        const promoResult = await promotionEngine.applyPromotions(
            userId,
            cartContext,
            input.promoCode || undefined,
        );

        if (input.promoCode && promoResult.promotions.length === 0) {
            throw new Error('Invalid promo code');
        }

        const effectiveOrderPrice = promoResult.finalSubtotal;
        const effectiveDeliveryPrice = promoResult.finalDeliveryPrice;
        const totalOrderPrice = promoResult.finalTotal;

        // Verify total price matches client input (allow small float error)
        if (Math.abs(totalOrderPrice - input.totalPrice) > 0.01) {
            throw new Error(`Price mismatch: Calculated ${totalOrderPrice}, provided ${input.totalPrice}`);
        }

        const orderData = {
            price: effectiveOrderPrice,
            userId,
            deliveryPrice: effectiveDeliveryPrice,
            originalPrice: calculatedItemsTotal !== effectiveOrderPrice ? calculatedItemsTotal : undefined,
            originalDeliveryPrice: input.deliveryPrice !== effectiveDeliveryPrice ? input.deliveryPrice : undefined,
            status: 'PENDING' as const,
            dropoffLat: input.dropOffLocation.latitude,
            dropoffLng: input.dropOffLocation.longitude,
            dropoffAddress: input.dropOffLocation.address,
        };

        const createdOrder = await this.orderRepository.create(orderData, itemsToCreate);

        if (!createdOrder) {
            throw new GraphQLError('Failed to create order: no items were associated or the database insert failed');
        }

        await this.updateUserBehaviorOnOrderCreated(userId, createdOrder.orderDate || null);

        // Ensure metadata row exists before promo updates
        await this.ensureUserPromoMetadata(userId);

        if (promoResult.promotions.length > 0) {
            const appliedPromotionIds = promoResult.promotions.map((promo) => promo.id);
            const orderBusinessId = businessIds.size === 1 ? Array.from(businessIds)[0] : null;

            await promotionEngine.recordUsage(
                appliedPromotionIds,
                userId,
                createdOrder.id,
                promoResult.totalDiscount,
                promoResult.freeDeliveryApplied,
                promoResult.finalSubtotal,
                orderBusinessId,
            );

            // Store promotions in orderPromotions table
            const db = await getDB();
            for (const promo of promoResult.promotions) {
                const appliesTo = promo.target === 'FIRST_ORDER' || promo.target === 'DISCOUNT' ? 'PRICE' : 'DELIVERY';
                const discountAmount = promo.target === 'FIRST_ORDER' || promo.target === 'DISCOUNT'
                    ? promoResult.totalDiscount
                    : promoResult.freeDeliveryApplied ? effectiveDeliveryPrice : 0;

                if (discountAmount > 0) {
                    await db.insert(orderPromotionsTable).values({
                        orderId: createdOrder.id,
                        promotionId: promo.id,
                        appliesTo,
                        discountAmount,
                    }).onConflictDoNothing();
                }
            }

            const hasFirstOrderPromo = promoResult.promotions.some((promo) => promo.target === 'FIRST_ORDER');
            if (hasFirstOrderPromo) {
                await promotionEngine.markFirstOrderUsed(userId);
            }
        }

        // Decrement stock for ordered products (ensure it doesn't go below 0)
        for (const item of itemsToCreate) {
            // Check if productStock entry exists
            const existingStock = await db.select().from(productStocksTable)
                .where(eq(productStocksTable.productId, item.productId))
                .then(rows => rows[0]);

            if (existingStock) {
                // Update existing stock
                await db.update(productStocksTable)
                    .set({ stock: sql`GREATEST(0, ${productStocksTable.stock} - ${item.quantity})` })
                    .where(eq(productStocksTable.productId, item.productId));
            } else {
                // Create stock entry (assume starting at 0 and going negative if oversold)
                await db.insert(productStocksTable).values({
                    productId: item.productId,
                    stock: Math.max(0, 0 - item.quantity),
                }).onConflictDoNothing();
            }
        }

        return this.mapToOrder(createdOrder);
    }

    private async ensureUserPromoMetadata(userId: string): Promise<void> {
        const db = await getDB();
        await db
            .insert(userPromoMetadata)
            .values({ userId })
            .onConflictDoNothing();
    }

    private async mapToOrder(dbOrder: DbOrder): Promise<Order> {
        const db = await getDB();

        // Fetch all items for this order (1 query)
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, dbOrder.id));

        // Batch-fetch all products for those items (1 query)
        const productIds = [...new Set(items.map(i => i.productId))];
        const productsRows = productIds.length > 0
            ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
            : [];
        const productById = new Map(productsRows.map(p => [p.id, p]));

        // Batch-fetch all stock records (1 query)
        const stockRows = productIds.length > 0
            ? await db.select().from(productStocksTable).where(inArray(productStocksTable.productId, productIds))
            : [];
        const stockByProductId = new Map(stockRows.map(s => [s.productId, s]));

        // Build businessMap in memory — zero per-item queries
        const businessMap = new Map<string, OrderItem[]>();

        for (const item of items) {
            const product = productById.get(item.productId);
            if (!product) continue;

            if (!businessMap.has(product.businessId)) {
                businessMap.set(product.businessId, []);
            }

            const stockRecord = stockByProductId.get(product.id);
            const currentStock = stockRecord?.stock ?? 0;
            const originalStock = Math.max(0, currentStock + item.quantity);
            businessMap.get(product.businessId)!.push({
                productId: item.productId,
                name: product.name,
                imageUrl: product.imageUrl || undefined,
                quantity: item.quantity,
                price: item.price,
                quantityInStock: Math.min(item.quantity, originalStock),
                quantityNeeded: Math.max(0, item.quantity - originalStock),
            });
        }

        // Batch-fetch all businesses (1 query)
        const businessIds = [...businessMap.keys()];
        const businessRows = businessIds.length > 0
            ? await db.select().from(businessesTable).where(inArray(businessesTable.id, businessIds))
            : [];
        const businessById = new Map(businessRows.map(b => [b.id, b]));

        // Build businessOrderList in memory — zero per-business queries
        const businessOrderList: OrderBusiness[] = [];

        for (const [businessId, orderItems] of businessMap) {
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
                        createdAt: new Date(business.createdAt),
                        updatedAt: new Date(business.updatedAt),
                        isOpen: true, // field-level resolver on Business type computes the real value
                    },
                    items: orderItems,
                });
            }
        }

        const driverUser = dbOrder.driverId ? await this.authRepository.findById(dbOrder.driverId) : null;

        return {
            id: dbOrder.id,
            userId: dbOrder.userId,
            orderPrice: dbOrder.price,
            deliveryPrice: dbOrder.deliveryPrice,
            totalPrice: dbOrder.price + dbOrder.deliveryPrice,
            orderDate: new Date(dbOrder.orderDate || new Date()),
            updatedAt: new Date(dbOrder.updatedAt),
            status: dbOrder.status as OrderStatus,
            preparationMinutes: dbOrder.preparationMinutes ?? undefined,
            estimatedReadyAt: dbOrder.estimatedReadyAt ? new Date(dbOrder.estimatedReadyAt) : undefined,
            preparingAt: dbOrder.preparingAt ? new Date(dbOrder.preparingAt) : undefined,
            readyAt: dbOrder.readyAt ? new Date(dbOrder.readyAt) : undefined,
            outForDeliveryAt: dbOrder.outForDeliveryAt ? new Date(dbOrder.outForDeliveryAt) : undefined,
            deliveredAt: dbOrder.deliveredAt ? new Date(dbOrder.deliveredAt) : undefined,
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
                  }
                : undefined,
            dropOffLocation: {
                latitude: dbOrder.dropoffLat,
                longitude: dbOrder.dropoffLng,
                address: dbOrder.dropoffAddress,
            },
            businesses: businessOrderList,
        };
    }

    // Public method for resolvers to map orders after authorization
    async mapToOrderPublic(dbOrder: DbOrder): Promise<Order> {
        return this.mapToOrder(dbOrder);
    }

    private minutesToTimeString(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    async getAllOrders(): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findAll();
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getUncompletedOrders(): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findUncompleted();
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async getOrderById(id: string): Promise<Order | null> {
        const dbOrder = await this.orderRepository.findById(id);
        if (!dbOrder) return null;
        return this.mapToOrder(dbOrder);
    }

    async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.orderRepository.findByStatus(status);
        return Promise.all(dbOrders.map((order) => this.mapToOrder(order)));
    }

    async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
        // Set timestamp based on status transition
        const timestampMap: Record<string, 'readyAt' | 'outForDeliveryAt' | 'deliveredAt'> = {
            READY: 'readyAt',
            OUT_FOR_DELIVERY: 'outForDeliveryAt',
            DELIVERED: 'deliveredAt',
        };
        const tsField = timestampMap[status];
        let updated;
        if (tsField) {
            updated = await this.orderRepository.updateStatusWithTimestamp(id, status, tsField);
        } else {
            updated = await this.orderRepository.updateStatus(id, status);
        }
        if (!updated) {
            throw new Error('Order not found');
        }
        return this.mapToOrder(updated);
    }

    async startPreparing(id: string, preparationMinutes: number): Promise<Order> {
        const updated = await this.orderRepository.startPreparing(id, preparationMinutes);
        if (!updated) {
            throw new Error('Order not found or not in PENDING status');
        }
        return this.mapToOrder(updated);
    }

    async updatePreparationTime(id: string, preparationMinutes: number): Promise<Order> {
        const updated = await this.orderRepository.updatePreparationTime(id, preparationMinutes);
        if (!updated) {
            throw new Error('Order not found or not in PREPARING status');
        }
        return this.mapToOrder(updated);
    }

    async updateOrderStatusWithDriver(id: string, status: OrderStatus, driverId: string): Promise<Order> {
        let updated = await this.orderRepository.updateStatusAndDriver(id, status, driverId, 'READY');
        if (!updated) {
            updated = await this.orderRepository.updateStatusAndDriver(id, status, driverId, 'PREPARING');
        }
        if (!updated) {
            throw new Error('Order already assigned or not ready');
        }
        return this.mapToOrder(updated);
    }

    async assignDriverToOrder(id: string, driverId: string | null): Promise<Order> {
        const updated = await this.orderRepository.assignDriver(id, driverId);
        if (!updated) {
            throw new Error('Order not found');
        }
        return this.mapToOrder(updated);
    }

    async cancelOrder(id: string): Promise<Order> {
        // Get the order to retrieve its items
        const dbOrder = await this.orderRepository.findById(id);
        if (!dbOrder) {
            throw new Error('Order not found');
        }

        // Get order items
        const db = await getDB();
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));

        // Restore stock for cancelled order items
        for (const item of items) {
            const existingStock = await db.select().from(productStocksTable)
                .where(eq(productStocksTable.productId, item.productId))
                .then(rows => rows[0]);

            if (existingStock) {
                // Update existing stock entry
                await db.update(productStocksTable)
                    .set({ stock: sql`${productStocksTable.stock} + ${item.quantity}` })
                    .where(eq(productStocksTable.productId, item.productId));
            } else {
                // Create stock entry with restored quantity
                await db.insert(productStocksTable).values({
                    productId: item.productId,
                    stock: item.quantity,
                }).onConflictDoNothing();
            }
        }

        const order = await this.updateOrderStatus(id, 'CANCELLED');

        // Void any pending financial settlements for this order
        const financialService = new FinancialService(db);
        await financialService.cancelOrderSettlements(id);

        await this.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            dbOrder.status as OrderStatus,
            'CANCELLED',
            dbOrder.price + dbOrder.deliveryPrice,
            dbOrder.orderDate || null,
        );
        return order;
    }

    async updateUserBehaviorOnStatusChange(
        userId: string,
        fromStatus: OrderStatus,
        toStatus: OrderStatus,
        orderTotal: number,
        orderDate: string | null,
    ): Promise<void> {
        if (fromStatus === toStatus) return;

        if (toStatus === 'DELIVERED') {
            await this.updateUserBehaviorOnDelivered(userId, orderTotal, orderDate);
            return;
        }

        if (toStatus === 'CANCELLED') {
            await this.updateUserBehaviorOnCancelled(userId, orderDate);
        }
    }

    private async updateUserBehaviorOnOrderCreated(userId: string, orderDate: string | null): Promise<void> {
        const db = await getDB();
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                totalOrders: 1,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    totalOrders: sql`${userBehaviorsTable.totalOrders} + 1`,
                    lastOrderAt: orderTimestamp,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    private async updateUserBehaviorOnDelivered(
        userId: string,
        orderTotal: number,
        orderDate: string | null,
    ): Promise<void> {
        const db = await getDB();
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                deliveredOrders: 1,
                totalSpend: orderTotal,
                avgOrderValue: orderTotal,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
                lastDeliveredAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    deliveredOrders: sql`${userBehaviorsTable.deliveredOrders} + 1`,
                    totalSpend: sql`${userBehaviorsTable.totalSpend} + ${orderTotal}`,
                    avgOrderValue: sql`CASE WHEN ${userBehaviorsTable.deliveredOrders} + 1 = 0 THEN 0 ELSE (${userBehaviorsTable.totalSpend} + ${orderTotal}) / (${userBehaviorsTable.deliveredOrders} + 1) END`,
                    lastDeliveredAt: orderTimestamp,
                    lastOrderAt: sql`GREATEST(COALESCE(${userBehaviorsTable.lastOrderAt}, ${orderTimestamp}), ${orderTimestamp})`,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    private async updateUserBehaviorOnCancelled(userId: string, orderDate: string | null): Promise<void> {
        const db = await getDB();
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                cancelledOrders: 1,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    cancelledOrders: sql`${userBehaviorsTable.cancelledOrders} + 1`,
                    lastOrderAt: sql`GREATEST(COALESCE(${userBehaviorsTable.lastOrderAt}, ${orderTimestamp}), ${orderTimestamp})`,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    subscribeToOrderUpdates(userId: string): ReturnType<typeof subscribe> {
        return subscribe(this.pubsub, topics.ordersByUserChanged(userId));
    }

    subscribeToAllOrders(): ReturnType<typeof subscribe> {
        return subscribe(this.pubsub, topics.allOrdersChanged());
    }

    async publishUserOrders(userId: string) {
        const userOrders = await this.orderRepository.findByUserId(userId);
        const orders: Order[] = [];
        for (const dbOrder of userOrders) {
            const order = await this.mapToOrder(dbOrder);
            orders.push(order);
        }
        publish(this.pubsub, topics.ordersByUserChanged(userId), {
            userId,
            orders,
        });
    }

    async publishAllOrders() {
        // Fetch ALL orders (not just uncompleted) to show both active and completed
        const allOrders = await this.orderRepository.findAll();
        const orders: Order[] = [];
        for (const dbOrder of allOrders) {
            const order = await this.mapToOrder(dbOrder);
            orders.push(order);
        }
        publish(this.pubsub, topics.allOrdersChanged(), {
            orders,
        });
    }

    async getUserUncompletedOrders(userId: string) {
        const userOrders = await this.orderRepository.findUncompletedOrdersByUserId(userId);
        const orders: Order[] = [];
        for (const dbOrder of userOrders) {
            const order = await this.mapToOrder(dbOrder);
            orders.push(order);
        }
        return orders;
    }

    async getOrdersByBusinessId(businessId: string): Promise<Order[]> {
        try {
            // Get all orders
            const allOrders = await this.getAllOrders();
            
            // Filter orders that contain at least one item from this business
            const filteredOrders: Order[] = [];
            
            for (const order of allOrders) {
                // Check if any business in the order matches the businessId
                const hasBusinessItems = order.businesses.some(
                    orderBusiness => orderBusiness.business.id === businessId
                );
                
                if (hasBusinessItems) {
                    filteredOrders.push(order);
                }
            }
            
            return filteredOrders;
        } catch (error) {
            log.error({ err: error, businessId }, 'order:filterByBusiness:error');
            throw error;
        }
    }

    async orderContainsBusiness(orderId: string, businessId: string): Promise<boolean> {
        try {
            const order = await this.getOrderById(orderId);
            if (!order) return false;
            
            // Check if any business in the order matches the businessId
            return order.businesses.some(
                orderBusiness => orderBusiness.business.id === businessId
            );
        } catch (error) {
            log.error({ err: error, orderId, businessId }, 'order:containsBusiness:error');
            return false;
        }
    }
}

// export const orderService = new OrderService(orderRepository);
