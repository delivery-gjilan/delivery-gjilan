import { DbType } from '@/database';
import { users } from '@/database/schema/users';
import { userBehaviors } from '@/database/schema/userBehaviors';
import { eq, gt, gte, lt, lte, ne, inArray, and, or, SQL } from 'drizzle-orm';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';

/**
 * Query structure for the notification query builder.
 *
 * Example:
 * {
 *   "operator": "AND",
 *   "rules": [
 *     { "field": "role", "op": "eq", "value": "CUSTOMER" },
 *     { "field": "totalOrders", "op": "gte", "value": 5 },
 *     {
 *       "operator": "OR",
 *       "rules": [
 *         { "field": "totalSpend", "op": "gte", "value": 100 },
 *         { "field": "lastOrderAt", "op": "lt", "value": "2026-01-01" }
 *       ]
 *     }
 *   ]
 * }
 */

type Operator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

interface Rule {
    field: string;
    op: Operator;
    value: unknown;
}

interface Group {
    operator: 'AND' | 'OR';
    rules: (Rule | Group)[];
}

function isGroup(item: Rule | Group): item is Group {
    return 'operator' in item && 'rules' in item;
}

// Maps field names to Drizzle column references
const fieldMap = {
    // User fields
    'role': users.role,
    'email': users.email,
    'firstName': users.firstName,
    'lastName': users.lastName,
    'businessId': users.businessId,
    'createdAt': users.createdAt,
    // User behavior fields
    'totalOrders': userBehaviors.totalOrders,
    'deliveredOrders': userBehaviors.deliveredOrders,
    'cancelledOrders': userBehaviors.cancelledOrders,
    'totalSpend': userBehaviors.totalSpend,
    'avgOrderValue': userBehaviors.avgOrderValue,
    'firstOrderAt': userBehaviors.firstOrderAt,
    'lastOrderAt': userBehaviors.lastOrderAt,
    'lastDeliveredAt': userBehaviors.lastDeliveredAt,
} as const;

type FieldName = keyof typeof fieldMap;

// Fields that come from userBehaviors table (require a join)
const behaviorFields = new Set<string>([
    'totalOrders', 'deliveredOrders', 'cancelledOrders',
    'totalSpend', 'avgOrderValue', 'firstOrderAt',
    'lastOrderAt', 'lastDeliveredAt',
]);

export class UserQueryService {
    constructor(private db: DbType) {}

    /**
     * Resolves a query JSON into an array of matching user IDs.
     */
    async resolveUserIds(query: Record<string, unknown>): Promise<string[]> {
        const group = query as unknown as Group;
        if (!group.rules || !group.operator) {
            throw AppError.badInput('Invalid query structure: must have operator and rules');
        }

        const needsBehaviorJoin = this.checkNeedsBehaviorJoin(group);
        const whereClause = this.buildWhere(group);

        let results: { id: string }[];

        if (needsBehaviorJoin) {
            results = await this.db
                .select({ id: users.id })
                .from(users)
                .leftJoin(userBehaviors, eq(users.id, userBehaviors.userId))
                .where(whereClause);
        } else {
            results = await this.db
                .select({ id: users.id })
                .from(users)
                .where(whereClause);
        }

        logger.info({ matchedUsers: results.length, query }, 'User query resolved');
        return results.map((r) => r.id);
    }

    /**
     * Recursively checks whether any field in the query requires a userBehaviors join.
     */
    private checkNeedsBehaviorJoin(item: Rule | Group): boolean {
        if (isGroup(item)) {
            return item.rules.some((r) => this.checkNeedsBehaviorJoin(r));
        }
        return behaviorFields.has(item.field);
    }

    /**
     * Recursively builds a Drizzle SQL where clause from the query structure.
     */
    private buildWhere(item: Rule | Group): SQL {
        if (isGroup(item)) {
            const conditions = item.rules.map((r) => this.buildWhere(r));
            if (conditions.length === 0) throw AppError.badInput('Empty rule group');
            if (item.operator === 'AND') return and(...conditions)!;
            return or(...conditions)!;
        }

        return this.buildCondition(item);
    }

    private buildCondition(rule: Rule): SQL {
        const column = fieldMap[rule.field as FieldName];
        if (!column) {
            throw AppError.badInput(`Unknown query field: ${rule.field}`);
        }

        switch (rule.op) {
            case 'eq':
                return eq(column, rule.value as string);
            case 'ne':
                return ne(column, rule.value as string);
            case 'gt':
                return gt(column, rule.value as string);
            case 'gte':
                return gte(column, rule.value as string);
            case 'lt':
                return lt(column, rule.value as string);
            case 'lte':
                return lte(column, rule.value as string);
            case 'in':
                if (!Array.isArray(rule.value)) throw AppError.badInput(`'in' operator requires an array value`);
                return inArray(column, rule.value as string[]);
            default:
                throw AppError.badInput(`Unknown operator: ${rule.op}`);
        }
    }
}
