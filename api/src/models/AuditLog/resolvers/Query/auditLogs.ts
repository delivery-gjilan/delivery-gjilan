import type { QueryResolvers } from './../../../../generated/types.generated';
import { AuditLogRepository } from '@/repositories/AuditLogRepository';

export const auditLogs: NonNullable<QueryResolvers['auditLogs']> = async (_parent, args, { db }) => {
    const repo = new AuditLogRepository(db);
    const { logs, total } = await repo.getAuditLogs({
        actorId: args.actorId || undefined,
        actorType: args.actorType as any,
        action: args.action as any,
        entityType: args.entityType as any,
        entityId: args.entityId || undefined,
        startDate: args.startDate || undefined,
        endDate: args.endDate || undefined,
        limit: args.limit || 50,
        offset: args.offset || 0,
    });

    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const hasMore = total > offset + logs.length;

    return {
        logs,
        total,
        hasMore,
    };
};