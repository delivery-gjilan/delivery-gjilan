import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { GraphQLError } from 'graphql';

export const cancelSettlementRequest: NonNullable<
    MutationResolvers['cancelSettlementRequest']
> = async (_parent, { requestId }, { db, userData }) => {
    if (!userData?.role) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!adminRoles.includes(userData.role)) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    const repo = new SettlementRequestRepository(db);

    const existing = await repo.getById(requestId);
    if (!existing) {
        throw new GraphQLError('Settlement request not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    if (!['PENDING_APPROVAL'].includes(existing.status)) {
        throw new GraphQLError(`Cannot cancel a request with status ${existing.status}`, {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    return repo.cancel(requestId);
};
