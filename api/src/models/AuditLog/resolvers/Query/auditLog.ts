import type { QueryResolvers } from './../../../../generated/types.generated';
import { AuditLogRepository } from '@/repositories/AuditLogRepository';

export const auditLog: NonNullable<QueryResolvers['auditLog']> = async (_parent, { id }, { db }) => {
    const repo = new AuditLogRepository(db);
    return repo.getAuditLogById(id);
};