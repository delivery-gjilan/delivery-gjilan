import type { Order } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { PubSub, publish, subscribe, topics } from '@/lib/pubsub';
import type { OrderServiceDeps } from './types';
import type { OrderMappingModule } from './OrderMappingModule';

export class OrderPublishingModule {
    constructor(
        private deps: OrderServiceDeps,
        private mapping: OrderMappingModule,
        private queryGetUserUncompletedOrders: (userId: string) => Promise<Order[]>,
    ) {}

    subscribeToOrderUpdates(userId: string): ReturnType<typeof subscribe> {
        return subscribe(this.deps.pubsub, topics.ordersByUserChanged(userId));
    }

    subscribeToAllOrders(): ReturnType<typeof subscribe> {
        return subscribe(this.deps.pubsub, topics.allOrdersChanged());
    }

    async publishOrderById(orderId: string) {
        const dbOrder = await this.deps.orderRepository.findById(orderId);
        if (!dbOrder) return;
        const order = await this.mapping.mapToOrder(dbOrder);
        publish(this.deps.pubsub, topics.orderByIdUpdated(orderId), order);
    }

    async publishUserOrders(userId: string) {
        const orders = await this.queryGetUserUncompletedOrders(userId);
        publish(this.deps.pubsub, topics.ordersByUserChanged(userId), {
            userId,
            orders,
        });
    }

    async publishSingleUserOrder(userId: string, orderId: string) {
        const dbOrder = await this.deps.orderRepository.findById(orderId);
        if (!dbOrder) return;
        const order = await this.mapping.mapToOrder(dbOrder);
        publish(this.deps.pubsub, topics.ordersByUserChanged(userId), {
            userId,
            orders: [order],
        });
    }

    async publishAllOrders() {
        const dbOrders = await this.deps.orderRepository.findUncompleted();
        const orders = await Promise.all(dbOrders.map((o) => this.mapping.mapToOrder(o)));
        publish(this.deps.pubsub, topics.allOrdersChanged(), { orders });
    }
}
