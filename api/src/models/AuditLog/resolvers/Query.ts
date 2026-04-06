import { QueryResolvers } from '@/generated/types.generated';
import { AuditLogRepository } from '@/repositories/AuditLogRepository';

export const Query: QueryResolvers<any> = {
    auditLogs: async (_, args, { db }) => {
        const repo = new AuditLogRepository(db);
        const { logs, total } = await repo.getAuditLogs({
            actorId: args.actorId || undefined,
            actorType: args.actorType as any,
            action: args.action as any,
            entityType: args.entityType as any,
            entityId: args.entityId || undefined,
            startDate: args.startDate as any || undefined,
            endDate: args.endDate as any || undefined,
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
    },

    auditLog: async (_, { id }, { db }) => {
        const repo = new AuditLogRepository(db);
        return repo.getAuditLogById(id);
    },
};
