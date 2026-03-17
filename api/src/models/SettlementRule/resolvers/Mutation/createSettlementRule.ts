import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';

function toNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function assertPercentage(value: unknown, context: string): number {
    const parsed = toNumber(value);
    if (parsed === null || parsed < 0 || parsed > 100) {
        throw new GraphQLError(`${context} must be between 0 and 100`, {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }
    return parsed;
}

function assertAmount(value: unknown, context: string): number {
    const parsed = toNumber(value);
    if (parsed === null || parsed < 0) {
        throw new GraphQLError(`${context} must be a positive number`, {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }
    return parsed;
}

export const createSettlementRule: NonNullable<MutationResolvers['createSettlementRule']> = async (
    _parent,
    { input },
    { db, userData },
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Authentication required', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only platform admins can manage settlement rules', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const repo = new SettlementRuleRepository(db);
    const now = new Date().toISOString();

    const normalizedConfig = { ...(input.config as Record<string, unknown>) };

    if (input.entityType === 'BUSINESS') {
        if (input.ruleType !== 'PERCENTAGE' && input.ruleType !== 'PRODUCT_MARKUP') {
            throw new GraphQLError('Business rules support only PERCENTAGE or PRODUCT_MARKUP', {
                extensions: { code: 'BAD_USER_INPUT' },
            });
        }

        if (input.ruleType === 'PERCENTAGE') {
            const appliesTo = String(normalizedConfig.appliesTo || 'ORDER_SUBTOTAL');
            if (appliesTo !== 'ORDER_SUBTOTAL' && appliesTo !== 'DELIVERY_FEE') {
                throw new GraphQLError('Business percentage can apply only to ORDER_SUBTOTAL or DELIVERY_FEE', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }

            normalizedConfig.appliesTo = appliesTo;
            normalizedConfig.percentage = assertPercentage(normalizedConfig.percentage, 'Percentage');
        }

        if (input.ruleType === 'PRODUCT_MARKUP') {
            normalizedConfig.appliesTo = 'PRODUCT_MARKUP';
            normalizedConfig.source = 'PRODUCT_PRICING_MARKUP';
        }
    }

    if (input.entityType === 'DRIVER') {
        if (
            input.ruleType !== 'PERCENTAGE' &&
            input.ruleType !== 'FIXED_PER_ORDER' &&
            input.ruleType !== 'DRIVER_VEHICLE_BONUS'
        ) {
            throw new GraphQLError('Driver rules support only PERCENTAGE, FIXED_PER_ORDER, or DRIVER_VEHICLE_BONUS', {
                extensions: { code: 'BAD_USER_INPUT' },
            });
        }

        if (input.ruleType === 'PERCENTAGE') {
            normalizedConfig.appliesTo = 'DELIVERY_FEE';
            normalizedConfig.percentage = assertPercentage(normalizedConfig.percentage, 'Driver commission percentage');
        }

        if (input.ruleType === 'FIXED_PER_ORDER') {
            normalizedConfig.appliesTo = 'FREE_DELIVERY';
            normalizedConfig.amount = assertAmount(normalizedConfig.amount, 'Free-delivery compensation amount');
        }

        if (input.ruleType === 'DRIVER_VEHICLE_BONUS') {
            normalizedConfig.amount = assertAmount(normalizedConfig.amount, 'Vehicle bonus amount');
            normalizedConfig.condition = normalizedConfig.condition || 'HAS_OWN_VEHICLE';
        }
    }

    let resolvedEntityId = input.entityId;
    if (input.entityType === 'DRIVER') {
        const directDriver = await db.query.drivers.findFirst({
            where: (drivers, { eq }) => eq(drivers.id, input.entityId),
        });

        if (!directDriver) {
            const byUserId = await db.query.drivers.findFirst({
                where: (drivers, { eq }) => eq(drivers.userId, input.entityId),
            });

            if (!byUserId) {
                throw new GraphQLError('Driver not found for selected target', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            resolvedEntityId = byUserId.id;
        }
    }

    const rule = await repo.createRule({
        id: randomUUID(),
        ...input,
        config: normalizedConfig,
        entityId: resolvedEntityId,
        canStackWith: input.canStackWith || [],
        priority: input.priority || 0,
        isActive: false,
        activatedAt: undefined,
        activatedBy: undefined,
        createdAt: now,
        updatedAt: now,
    });

    return rule;
};
