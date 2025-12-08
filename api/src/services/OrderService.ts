import { OrderRepository, orderRepository } from '@/repositories/OrderRepository';
import { getDB } from '@/database';
import {
    orderItems as orderItemsTable,
    products as productsTable,
    businesses as businessesTable,
} from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { Order, OrderBusiness, OrderItem, OrderStatus } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';

export class OrderService {
    constructor(private orderRepository: OrderRepository) {}

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
}

export const orderService = new OrderService(orderRepository);
