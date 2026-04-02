import { type DbType } from '@/database';
import {
    settlementRequests,
    settlements,
    users,
    businesses,
} from '@/database/schema';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import type { DbSettlementRequest } from '@/database/schema/settlementRequests';

export interface SettlementRequestAcceptanceResult {
    settledCount: number;
    settledAmount: number;
    remainingAmount: number;
}

export interface CreateSettlementRequestInput {
    businessId: string;
    requestedByUserId?: string | null;
    amount: number;
    periodStart: string;
    periodEnd: string;
    note?: string | null;
    /** Defaults to 48 h from now */
    expiresAt?: string;
}

export class SettlementRequestRepository {
    constructor(private db: DbType) {}

    async getById(id: string): Promise<DbSettlementRequest | null> {
        const result = await this.db
            .select()
            .from(settlementRequests)
            .where(eq(settlementRequests.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async getMany(filters: {
        businessId?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<DbSettlementRequest[]> {
        let query: any = this.db.select().from(settlementRequests);
        const conditions = [];

        if (filters.businessId) {
            conditions.push(eq(settlementRequests.businessId, filters.businessId));
        }
        if (filters.status) {
            conditions.push(eq(settlementRequests.status, filters.status as any));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        query = query.orderBy(sql`${settlementRequests.createdAt} DESC`);

        if (filters.limit) query = query.limit(filters.limit);
        if (filters.offset) query = query.offset(filters.offset);

        return query;
    }

    async create(input: CreateSettlementRequestInput): Promise<DbSettlementRequest> {
        const expiresAt =
            input.expiresAt ??
            (() => {
                const d = new Date();
                d.setHours(d.getHours() + 48);
                return d.toISOString();
            })();

        const result = await this.db
            .insert(settlementRequests)
            .values({
                businessId: input.businessId,
                requestedByUserId: input.requestedByUserId,
                amount: String(input.amount),
                periodStart: input.periodStart,
                periodEnd: input.periodEnd,
                note: input.note ?? null,
                status: 'PENDING_APPROVAL',
                expiresAt,
            })
            .returning();

        return result[0]!;
    }

    async accept(
        requestId: string,
        respondedByUserId: string,
    ): Promise<DbSettlementRequest> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlementRequests)
            .set({
                status: 'ACCEPTED',
                respondedAt: now,
                respondedByUserId,
                updatedAt: now,
            })
            .where(eq(settlementRequests.id, requestId))
            .returning();
        return result[0]!;
    }

    async dispute(
        requestId: string,
        respondedByUserId: string,
        disputeReason?: string | null,
    ): Promise<DbSettlementRequest> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlementRequests)
            .set({
                status: 'DISPUTED',
                respondedAt: now,
                respondedByUserId,
                disputeReason: disputeReason ?? null,
                updatedAt: now,
            })
            .where(eq(settlementRequests.id, requestId))
            .returning();
        return result[0]!;
    }

    async cancel(requestId: string): Promise<DbSettlementRequest> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlementRequests)
            .set({ status: 'CANCELLED', updatedAt: now })
            .where(eq(settlementRequests.id, requestId))
            .returning();
        return result[0]!;
    }

    /**
     * Settle only the requested amount, walking oldest receivable settlements first.
     * Full rows are marked PAID; a partial row is split into a paid row plus remaining pending row.
     */
    async settlePendingReceivableForPeriod(
        businessId: string,
        periodStart: string,
        periodEnd: string,
        requestedAmount: number,
    ): Promise<SettlementRequestAcceptanceResult> {
        const requestedCents = Math.round(Number(requestedAmount) * 100);
        if (!Number.isFinite(requestedCents) || requestedCents <= 0) {
            return { settledCount: 0, settledAmount: 0, remainingAmount: 0 };
        }

        return this.db.transaction(async (tx) => {
            const now = new Date().toISOString();
            let remainingCents = requestedCents;
            let settledCents = 0;
            let settledCount = 0;

            const candidates = await tx
                .select()
                .from(settlements)
                .where(
                    and(
                        eq(settlements.businessId, businessId),
                        eq(settlements.type, 'BUSINESS'),
                        eq(settlements.direction, 'RECEIVABLE'),
                        eq(settlements.isSettled, false),
                        gte(settlements.createdAt, periodStart),
                        lte(settlements.createdAt, periodEnd),
                    ),
                )
                .orderBy(sql`${settlements.createdAt} ASC, ${settlements.id} ASC`);

            for (const candidate of candidates) {
                if (remainingCents <= 0) break;

                const candidateCents = Math.round(Number(candidate.amount ?? 0) * 100);
                if (!Number.isFinite(candidateCents) || candidateCents <= 0) continue;

                if (remainingCents >= candidateCents) {
                    await tx
                        .update(settlements)
                        .set({
                            isSettled: true,
                            updatedAt: now,
                        })
                        .where(eq(settlements.id, candidate.id))
                        .execute();

                    remainingCents -= candidateCents;
                    settledCents += candidateCents;
                    settledCount += 1;
                    continue;
                }

                const partialCents = remainingCents;
                const leftoverCents = candidateCents - partialCents;
                const partialAmount = Number((partialCents / 100).toFixed(2));
                const leftoverAmount = Number((leftoverCents / 100).toFixed(2));

                await tx
                    .update(settlements)
                    .set({
                        amount: leftoverAmount,
                        updatedAt: now,
                    })
                    .where(eq(settlements.id, candidate.id))
                    .execute();

                await tx
                    .insert(settlements)
                    .values({
                        type: candidate.type,
                        direction: candidate.direction,
                        driverId: candidate.driverId,
                        businessId: candidate.businessId,
                        orderId: candidate.orderId,
                        ruleId: candidate.ruleId,
                        amount: partialAmount,
                        isSettled: true,
                    })
                    .execute();

                settledCount += 1;
                settledCents += partialCents;
                remainingCents = 0;
            }

            return {
                settledCount,
                settledAmount: Number((settledCents / 100).toFixed(2)),
                remainingAmount: Number((remainingCents / 100).toFixed(2)),
            };
        });
    }

    /** Find all users with BUSINESS_OWNER role for a given businessId */
    async findBusinessOwnerUserIds(businessId: string): Promise<string[]> {
        const rows = await this.db
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    eq(users.businessId, businessId),
                    eq(users.role, 'BUSINESS_OWNER'),
                ),
            );
        return rows.map((r) => r.id);
    }
}
