import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { getDB } from '@/database';
import {
    orderItems as orderItemsTable,
    products as productsTable,
    businesses as businessesTable,
} from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus, CreateOrderInput } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { PubSub, publish, subscribe, topics } from '@/lib/pubsub';
import { GraphQLError } from 'graphql';

export class OrderService {
    constructor(
        private orderRepository: OrderRepository,
        private authRepository: AuthRepository,
        private productRepository: ProductRepository,
        private pubsub: PubSub,
    ) {}

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

        return {
            id: dbOrder.id,
            orderPrice: dbOrder.price,
            deliveryPrice: dbOrder.deliveryPrice,
            totalPrice: dbOrder.price + dbOrder.deliveryPrice,
            orderDate: new Date(dbOrder.orderDate || new Date()),
            status: dbOrder.status as OrderStatus,
            dropOffLocation: {
                latitude: dbOrder.dropoffLat,
                longitude: dbOrder.dropoffLng,
                address: dbOrder.dropoffAddress,
            },
            businesses: businessOrderList,
        };
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

    async cancelOrder(id: string): Promise<Order> {
        return this.updateOrderStatus(id, 'CANCELLED');
    }

    subscribeToOrderUpdates(userId: string): ReturnType<typeof subscribe> {
        return subscribe(this.pubsub, topics.ordersByUserChanged(userId));
    }

    async publishUserOrders(userId: string) {
        const userOrders = await this.orderRepository.findUncompletedOrdersByUserId(userId);
        const orders: Order[] = [];
        for (const dbOrder of userOrders) {
            const order = await this.mapToOrder(dbOrder);
            orders.push(order);
        }
        console.log(
            'haha orders haha',
            orders.map((o) => ({
                id: o.id,
                status: o.status,
            })),
        );
        publish(this.pubsub, topics.ordersByUserChanged(userId), {
            userId,
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
}

// export const orderService = new OrderService(orderRepository);
