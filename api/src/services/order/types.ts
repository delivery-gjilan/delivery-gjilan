import type { DbType } from '@/database';
import type { OrderRepository } from '@/repositories/OrderRepository';
import type { AuthRepository } from '@/repositories/AuthRepository';
import type { ProductRepository } from '@/repositories/ProductRepository';
import type { PubSub } from '@/lib/pubsub';

/**
 * Shared dependency bag for all OrderService domain modules.
 * Avoids repeating the same 5 constructor parameters across every module.
 */
export interface OrderServiceDeps {
    orderRepository: OrderRepository;
    authRepository: AuthRepository;
    productRepository: ProductRepository;
    pubsub: PubSub;
    db: DbType;
}
