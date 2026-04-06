import { DbType } from '@/database';
import { auditLogs } from '@/database/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { DbAuditLog, NewDbAuditLog, ActionType, EntityType, ActorType } from '@/database/schema/auditLogs';

export interface AuditLogFilters {
    actorId?: string;
    actorType?: ActorType;
    action?: ActionType;
    entityType?: EntityType;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface CreateAuditLogInput {
    actorId?: string;
    actorType: ActorType;
    action: ActionType;
    entityType: EntityType;
    entityId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditLogRepository {
    constructor(private db: DbType) {}

    /**
     * Create a new audit log entry
     */
    async createLog(input: CreateAuditLogInput): Promise<DbAuditLog> {
        const newLog: NewDbAuditLog = {
            actorId: input.actorId || null,
            actorType: input.actorType,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId || null,
            metadata: input.metadata || null,
            ipAddress: input.ipAddress || null,
            userAgent: input.userAgent || null,
        };

        const result = await this.db.insert(auditLogs).values(newLog).returning();
        return result[0]!;
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(filters: AuditLogFilters): Promise<{ logs: DbAuditLog[]; total: number }> {
        const conditions = [];

        if (filters.actorId) {
            conditions.push(eq(auditLogs.actorId, filters.actorId));
        }

        if (filters.actorType) {
            conditions.push(eq(auditLogs.actorType, filters.actorType));
        }

        if (filters.action) {
            conditions.push(eq(auditLogs.action, filters.action));
        }

        if (filters.entityType) {
            conditions.push(eq(auditLogs.entityType, filters.entityType));
        }

        if (filters.entityId) {
            conditions.push(eq(auditLogs.entityId, filters.entityId));
        }

        if (filters.startDate) {
            conditions.push(gte(auditLogs.createdAt, filters.startDate));
        }

        if (filters.endDate) {
            conditions.push(lte(auditLogs.createdAt, filters.endDate));
        }

        // Build query for logs
        let query: any = this.db.select().from(auditLogs);

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        query = query.orderBy(desc(auditLogs.createdAt));

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        if (filters.offset) {
            query = query.offset(filters.offset);
        }

        const logs = await query;

        // Get total count for pagination
        let countQuery: any = this.db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);

        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }

        const countResult = await countQuery;
        const total = countResult[0]?.count || 0;

        return { logs, total };
    }

    /**
     * Get a single audit log by ID
     */
    async getAuditLogById(id: string): Promise<DbAuditLog | null> {
        const result = await this.db.select().from(auditLogs).where(eq(auditLogs.id, id));
        return result[0] || null;
    }

    /**
     * Get recent activity for an entity
     */
    async getEntityActivity(entityType: EntityType, entityId: string, limit = 20): Promise<DbAuditLog[]> {
        return this.db
            .select()
            .from(auditLogs)
            .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit);
    }

    /**
     * Get recent activity by an actor
     */
    async getActorActivity(actorId: string, limit = 20): Promise<DbAuditLog[]> {
        return this.db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.actorId, actorId))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit);
    }
}
