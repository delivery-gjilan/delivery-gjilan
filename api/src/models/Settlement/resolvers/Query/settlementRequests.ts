import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { GraphQLError } from 'graphql';

export const settlementRequests: NonNullable<QueryResolvers['settlementRequests']> = async (
    _parent,
    { businessId, status, limit, offset },
    { db, userData },
) => {
    if (!userData?.role) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const repo = new SettlementRequestRepository(db);

    // Business users are scoped to their own businessId automatically
    const resolvedBusinessId =
        userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE'
            ? (userData.businessId ?? businessId ?? undefined)
            : (businessId ?? undefined);

    return repo.getMany({
        businessId: resolvedBusinessId,
        status: status ?? undefined,
        limit: limit ?? 50,
        offset: offset ?? 0,
    });
};
