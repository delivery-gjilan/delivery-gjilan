import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const createSettlementRule: NonNullable<MutationResolvers['createSettlementRule']> = async (
    _parent,
    { input },
    { db, userData },
): Promise<any> => {
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

    if (!input.name || input.name.trim().length === 0) {
        throw new GraphQLError('Name is required', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    if (input.amount < 0) {
        throw new GraphQLError('Amount must be non-negative', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    if (input.amountType === 'PERCENT' && (input.amount > 100)) {
        throw new GraphQLError('Percentage must be between 0 and 100', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    if (input.maxAmount != null && input.amountType !== 'PERCENT') {
        throw new GraphQLError('maxAmount can only be set for PERCENT amount type', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    if (input.maxAmount != null && input.maxAmount <= 0) {
        throw new GraphQLError('maxAmount must be a positive number', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    const repo = new SettlementRuleRepository(db);

    const rule = await repo.createRule({
        name: input.name.trim(),
        type: input.type,
        entityType: input.entityType,
        direction: input.direction,
        amountType: input.amountType,
        amount: input.amount.toString(),
        maxAmount: input.maxAmount != null ? input.maxAmount.toString() : null,
        businessId: input.businessId || null,
        promotionId: input.promotionId || null,
        notes: input.notes || null,
    });

    return rule;
};

