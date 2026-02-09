import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { getDB } from '@/database';
import {
    orderItems as orderItemsTable,
    products as productsTable,
    businesses as businessesTable,
} from '@/database/schema';
import { eq, inArray } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus, CreateOrderInput } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { PubSub, publish, subscribe, topics } from '@/lib/pubsub';
import { GraphQLError } from 'graphql';

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
            console.log(price, itemInput.quantity);
            calculatedItemsTotal += price * itemInput.quantity;

            itemsToCreate.push({
                productId: itemInput.productId,
                quantity: itemInput.quantity,
                price: price, // Store the price at time of purchase
            });
        }

        console.log('prices,', calculatedItemsTotal, input.deliveryPrice);
        // 3. Create Order
        const totalOrderPrice = calculatedItemsTotal + input.deliveryPrice;

        // Verify total price matches client input (allow small float error)
        if (Math.abs(totalOrderPrice - input.totalPrice) > 0.01) {
            throw new Error(`Price mismatch: Calculated ${totalOrderPrice}, provided ${input.totalPrice}`);
        }

        const orderData = {
            price: calculatedItemsTotal,
            userId,
            deliveryPrice: input.deliveryPrice,
            status: 'PENDING' as const,
            dropoffLat: input.dropOffLocation.latitude,
            dropoffLng: input.dropOffLocation.longitude,
            dropoffAddress: input.dropOffLocation.address,
        };

        const createdOrder = await this.orderRepository.create(orderData, itemsToCreate);

        if (!createdOrder) {
            throw new GraphQLError('Fix the error messages');
        }

        return this.mapToOrder(createdOrder);
    }

    private async mapToOrder(dbOrder: DbOrder): Promise<Order> {
        const db = await getDB();

        // Get all items for this order
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, dbOrder.id));

        // Group items by business
        const businessMap = new Map<string, OrderItem[]>();

        for (const item of items) {
            const product = await db
                .select()
                .from(productsTable)
                .where(eq(productsTable.id, item.productId))
                .then((rows) => rows[0] || null);

            if (!product) continue;

            if (!businessMap.has(product.businessId)) {
                businessMap.set(product.businessId, []);
            }

            businessMap.get(product.businessId)!.push({
                productId: item.productId,
                name: product.name,
                imageUrl: product.imageUrl || undefined,
                quantity: item.quantity,
                price: item.price,
            });
        }

        // Get business details for each group
        const businessOrderList: OrderBusiness[] = [];

        for (const [businessId, orderItems] of businessMap) {
            const business = await db
                .select()
                .from(businessesTable)
                .where(eq(businessesTable.id, businessId))
                .then((rows) => rows[0] || null);

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
                        createdAt: new Date(business.createdAt),
                        updatedAt: new Date(business.updatedAt),
                        isOpen: true,
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
            status: dbOrder.status as OrderStatus,
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
        const updated = await this.orderRepository.updateStatus(id, status);
        if (!updated) {
            throw new Error('Order not found');
        }
        return this.mapToOrder(updated);
    }

    async updateOrderStatusWithDriver(id: string, status: OrderStatus, driverId: string): Promise<Order> {
        const updated = await this.orderRepository.updateStatusAndDriver(id, status, driverId);
        if (!updated) {
            throw new Error('Order not found');
        }
        return this.mapToOrder(updated);
    }

    async cancelOrder(id: string): Promise<Order> {
        return this.updateOrderStatus(id, 'CANCELLED');
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
            console.error('[OrderService] Error filtering orders by businessId:', error);
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
            console.error('[OrderService] Error checking if order contains business:', error);
            return false;
        }
    }
}

// export const orderService = new OrderService(orderRepository);
