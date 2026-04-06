import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { eq, and, gte, lte, sql, isNull } from 'drizzle-orm';
import { settlements, settlementRules, drivers as driversTable } from '@/database/schema';
import { isPlatformAdmin } from '@/lib/utils/permissions';

export const settlementBreakdown: NonNullable<QueryResolvers['settlementBreakdown']> = async (
    _parent,
    { type, businessId, driverId, isSettled, startDate, endDate },
    { db, userData },
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    let resolvedType = type;
    let resolvedBusinessId = businessId;
    let resolvedDriverId = driverId;

    // Auto-scope for non-admins
    if (!isPlatformAdmin(userData.role)) {
        if (userData.role === 'DRIVER') {
            const driverRecord = await db.query.drivers.findFirst({
                where: eq(driversTable.userId, userData.userId),
            });
            if (!driverRecord) {
                throw new GraphQLError('Driver record not found', { extensions: { code: 'NOT_FOUND' } });
            }
            resolvedType = 'DRIVER';
            resolvedDriverId = driverRecord.id;
        } else if (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') {
            if (!userData.businessId) {
                throw new GraphQLError('Business context missing', { extensions: { code: 'FORBIDDEN' } });
            }
            resolvedType = 'BUSINESS';
            resolvedBusinessId = userData.businessId;
        }
    }

    const conditions = [];
    if (resolvedType) conditions.push(eq(settlements.type, resolvedType));
    if (resolvedBusinessId) conditions.push(eq(settlements.businessId, resolvedBusinessId));
    if (resolvedDriverId) conditions.push(eq(settlements.driverId, resolvedDriverId));
    if (isSettled !== undefined && isSettled !== null) conditions.push(eq(settlements.isSettled, isSettled));
    if (startDate) conditions.push(gte(settlements.createdAt, startDate as any));
    if (endDate) conditions.push(lte(settlements.createdAt, endDate as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Group by ruleId + direction, then enrich with rule names
    const rows = await db
        .select({
            ruleId: settlements.ruleId,
            direction: settlements.direction,
            totalAmount: sql<number>`SUM(CAST(${settlements.amount} AS NUMERIC))::FLOAT`,
            count: sql<number>`COUNT(*)::INT`,
            // Grab rule info via left join
            ruleName: settlementRules.name,
            ruleType: settlementRules.type,
            promotionId: settlementRules.promotionId,
        })
        .from(settlements)
        .leftJoin(settlementRules, eq(settlements.ruleId, settlementRules.id))
        .where(whereClause)
        .groupBy(settlements.ruleId, settlements.direction, settlementRules.name, settlementRules.type, settlementRules.promotionId);

    return rows.map((row) => {
        let category: string;
        let label: string;

        if (!row.ruleId) {
            // Auto-remittances (markup, priority surcharge)
            category = 'AUTO_REMITTANCE';
            label = row.direction === 'RECEIVABLE' ? 'Markup & Surcharge' : 'Platform Payment';
        } else if (row.promotionId) {
            category = 'PROMOTION_COST';
            label = row.ruleName ?? 'Promotion Cost';
        } else if (row.ruleType === 'DELIVERY_PRICE') {
            category = 'DELIVERY_COMMISSION';
            label = row.ruleName ?? 'Delivery Commission';
        } else {
            category = 'PLATFORM_COMMISSION';
            label = row.ruleName ?? 'Platform Commission';
        }

        return {
            category,
            label,
            totalAmount: row.totalAmount ?? 0,
            count: row.count ?? 0,
            direction: row.direction as 'RECEIVABLE' | 'PAYABLE',
        };
    });
};