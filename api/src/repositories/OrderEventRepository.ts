import { getDB } from '@/database';
import { orderEvents } from '@/database/schema/orderEvents';
import type { OrderEventType } from '@/database/schema/orderEvents';
import logger from '@/lib/logger';

const log = logger.child({ service: 'OrderEventRepository' });

export interface EmitOrderEventInput {
    orderId: string;
    eventType: OrderEventType;
    eventTs?: string;
    actorType?: 'SYSTEM' | 'RESTAURANT' | 'DRIVER' | 'CUSTOMER' | 'ADMIN';
    actorId?: string;
    businessId?: string;
    driverId?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Writes a single order lifecycle event.
 * Fire-and-forget: errors are logged but never thrown — event emission
 * must never block or crash the caller's happy path.
 */
export async function emitOrderEvent(input: EmitOrderEventInput): Promise<void> {
    try {
        const db = await getDB();
        await db.insert(orderEvents).values({
            orderId: input.orderId,
            eventType: input.eventType,
            eventTs: input.eventTs ?? new Date().toISOString(),
            actorType: input.actorType ?? 'SYSTEM',
            actorId: input.actorId ?? null,
            businessId: input.businessId ?? null,
            driverId: input.driverId ?? null,
            metadata: input.metadata ?? null,
        });
    } catch (err) {
        log.error({ err, input }, 'orderEvent:emit:error');
    }
}
