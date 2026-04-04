import { AuditLogRepository, CreateAuditLogInput } from '@/repositories/AuditLogRepository';
import { type DbType as Database } from '@/database';
import { ActionType, EntityType, ActorType } from '@/database/schema/auditLogs';
import { GraphQLContext } from '@/graphql/context';
import logger from '@/lib/logger';

const log = logger.child({ service: 'AuditLogger' });

/**
 * AuditLogger - Utility service for creating audit logs
 */
export class AuditLogger {
    private repo: AuditLogRepository;
    private context: GraphQLContext;

    constructor(db: Database, context: GraphQLContext) {
        this.repo = new AuditLogRepository(db);
        this.context = context;
    }

    /**
     * Log an action performed by a user
     */
    async log(params: {
        action: ActionType;
        entityType: EntityType;
        entityId?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            const actorType = this.getActorType();
            const actorId = this.context.userData?.userId;

            await this.repo.createLog({
                actorId,
                actorType,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                metadata: params.metadata,
                ipAddress: this.context.request?.headers?.get('x-forwarded-for') || 
                           this.context.request?.headers?.get('x-real-ip') ||
                           undefined,
                userAgent: this.context.request?.headers?.get('user-agent') || undefined,
            });
        } catch (error) {
            // Log the error but don't fail the main operation
            log.error({ err: error, action: params.action, entityType: params.entityType }, 'audit:log:failed');
        }
    }

    /**
     * Determine actor type from current user context
     */
    private getActorType(): ActorType {
        const userData = this.context.userData;
        
        if (!userData || !userData.role) {
            return 'SYSTEM';
        }

        switch (userData.role) {
            case 'ADMIN':
            case 'SUPER_ADMIN':
                return 'ADMIN';
            case 'BUSINESS':
                return 'BUSINESS';
            case 'DRIVER':
                return 'DRIVER';
            case 'CUSTOMER':
                return 'CUSTOMER';
            default:
                return 'SYSTEM';
        }
    }
}

/**
 * Helper function to create an audit logger instance
 */
export function createAuditLogger(db: Database, context: GraphQLContext): AuditLogger {
    return new AuditLogger(db, context);
}

/**
 * Quick helper to log changes with before/after values
 */
export function createChangeMetadata(
    oldValue: any,
    newValue: any,
    changedFields?: string[]
): Record<string, any> {
    return {
        oldValue,
        newValue,
        changedFields: changedFields || Object.keys(newValue || {}),
        timestamp: new Date().toISOString(),
    };
}
