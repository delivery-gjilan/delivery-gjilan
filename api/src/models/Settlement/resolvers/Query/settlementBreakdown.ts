import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { eq, and, gte, lte, sql, isNull } from 'drizzle-orm';
import { settlements, settlementRules, drivers as driversTable, promotions } from '@/database/schema';
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
    // For null-ruleId settlements, also group by whether it's a stock remittance
    // (detected via the reason field) to separate stock items from markup/surcharge.
    const rows = await db
        .select({
            ruleId: settlements.ruleId,
            direction: settlements.direction,
            totalAmount: sql<number>`SUM(CAST(${settlements.amount} AS NUMERIC))::FLOAT`,
            count: sql<number>`COUNT(*)::INT`,
            isStockRemittance: sql<boolean>`BOOL_OR(${settlements.reason} LIKE 'Stock item%')`,
            isDriverTip: sql<boolean>`BOOL_OR(${settlements.reason} LIKE 'Driver tip%')`,
            isCatalogRevenue: sql<boolean>`BOOL_OR(${settlements.reason} LIKE 'Catalog product%')`,
            isDirectCallFixedFee: sql<boolean>`BOOL_OR(${settlements.reason} LIKE 'Direct call fixed payment%')`,
            // Grab rule info via left join
            ruleName: settlementRules.name,
            ruleType: settlementRules.type,
            promotionId: settlementRules.promotionId,
            promotionCreatorType: promotions.creatorType,
        })
        .from(settlements)
        .leftJoin(settlementRules, eq(settlements.ruleId, settlementRules.id))
        .leftJoin(promotions, eq(settlementRules.promotionId, promotions.id))
        .where(whereClause)
        .groupBy(
            settlements.ruleId,
            settlements.direction,
            settlementRules.name,
            settlementRules.type,
            settlementRules.promotionId,
            promotions.creatorType,
            sql`(${settlements.reason} LIKE 'Stock item%')`,
            sql`(${settlements.reason} LIKE 'Driver tip%')`,
            sql`(${settlements.reason} LIKE 'Catalog product%')`,
            sql`(${settlements.reason} LIKE 'Direct call fixed payment%')`,
        );

    return rows.map((row) => {
        let category: string;
        let label: string;

        if (!row.ruleId) {
            if (row.isStockRemittance) {
                category = 'STOCK_REMITTANCE';
                label = 'Stock Item Remittance';
            } else if (row.isDriverTip) {
                category = 'DRIVER_TIP';
                label = 'Driver Tip';
            } else if (row.isCatalogRevenue) {
                category = 'CATALOG_REVENUE';
                label = 'Catalog Product Revenue';
            } else if (row.isDirectCallFixedFee) {
                category = 'DIRECT_CALL_FIXED_FEE';
                label = 'Direct Call Fixed Payment';
            } else {
                // Auto-remittances (markup, priority surcharge)
                category = 'AUTO_REMITTANCE';
                label = row.direction === 'RECEIVABLE' ? 'Markup & Surcharge' : 'Platform Payment';
            }
        } else if (row.isDirectCallFixedFee) {
            category = 'DIRECT_CALL_FIXED_FEE';
            label = row.ruleName ?? 'Direct Call Fixed Payment';
        } else if (row.promotionId) {
            category = 'PROMOTION_COST';
            label = row.ruleName ?? (row.promotionCreatorType === 'BUSINESS' ? 'Business Promotion Cost' : 'Promotion Cost');
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