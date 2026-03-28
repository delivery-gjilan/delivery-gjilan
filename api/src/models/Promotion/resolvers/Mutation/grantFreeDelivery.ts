import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions, userPromotions, orders } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';

export const grantFreeDelivery: NonNullable<MutationResolvers['grantFreeDelivery']> = async (
    _parent,
    { userId, orderId },
    context,
) => {
    const { userData, db: contextDb } = context;

    if (!userData.userId) {
        throw AppError.unauthorized();
    }
    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw AppError.forbidden();
    }

    const db = await getDB();

    // Resolve order display ID for the promo name
    const [order] = await db.select({ displayId: orders.displayId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    const label = order?.displayId ? `#${order.displayId}` : `order ${orderId.slice(0, 8)}`;

    const [promo] = await db.insert(promotions).values({
        name: `Courtesy free delivery – ${label}`,
        description: `Granted by admin as a courtesy for a delayed order (${label}).`,
        code: null,
        type: 'FREE_DELIVERY',
        target: 'SPECIFIC_USERS',
        discountValue: null,
        maxDiscountCap: null,
        minOrderAmount: null,
        spendThreshold: null,
        thresholdReward: null,
        maxGlobalUsage: 1,
        maxUsagePerUser: 1,
        isStackable: false,
        priority: 10,
        isActive: true,
        startsAt: null,
        endsAt: null,
    }).returning();

    await db.insert(userPromotions).values({
        userId,
        promotionId: promo.id,
    });

    logger.info({ adminId: userData.userId, userId, orderId, promoId: promo.id }, 'promotion:grantFreeDelivery');

    const auditLogger = createAuditLogger(contextDb, context);
    await auditLogger.log({
        action: 'FREE_DELIVERY_GRANTED' as any,
        entityType: 'ORDER',
        entityId: orderId,
        metadata: {
            orderId,
            userId,
            promoId: promo.id,
            grantedByAdmin: userData.userId,
        },
    });

    return true;
};