import { DbType } from '@/database';
import { banners, Banner, NewBanner } from '@/database/schema/banners';
import { eq, and, asc, lte, gte, or, isNull, sql, type SQL } from 'drizzle-orm';
import { cache } from '@/lib/cache';

/** NOTE: The banners table has an isDeleted column. All queries MUST filter by isDeleted=false.
 *  Deletions MUST set isDeleted=true instead of removing the row. See SOFT_DELETE_CONVENTION.md. */

type BannerDisplayContext = 'HOME' | 'BUSINESS' | 'CATEGORY' | 'PRODUCT' | 'CART' | 'ALL';

export interface BannerFilter {
    activeOnly?: boolean;
    businessId?: string;
    productId?: string;
    promotionId?: string;
    displayContext?: string;
    includeScheduled?: boolean;
}

export class BannerRepository {
    constructor(private db: DbType) {}

    async create(data: NewBanner): Promise<Banner> {
        const [maxOrder] = await this.db
            .select({ max: sql<number>`COALESCE(MAX(${banners.sortOrder}), -1)` })
            .from(banners);

        const [created] = await this.db
            .insert(banners)
            .values({
                ...data,
                sortOrder: data.sortOrder ?? (maxOrder.max + 1),
            })
            .returning();
        return created;
    }

    async findById(id: string): Promise<Banner | undefined> {
        const [banner] = await this.db
            .select()
            .from(banners)
            .where(and(eq(banners.id, id), eq(banners.isDeleted, false)))
            .limit(1);
        return banner;
    }

    /**
     * Find by ID without isDeleted filter — for historical/reference lookups.
     */
    async findByIdIncludingDeleted(id: string): Promise<Banner | undefined> {
        const [banner] = await this.db
            .select()
            .from(banners)
            .where(eq(banners.id, id))
            .limit(1);
        return banner;
    }

    async findAll(filter?: BannerFilter): Promise<Banner[]> {
        const conditions: SQL[] = [eq(banners.isDeleted, false)];

        if (filter?.activeOnly) {
            conditions.push(eq(banners.isActive, true));
        }
        if (filter?.businessId) {
            conditions.push(eq(banners.businessId, filter.businessId));
        }
        if (filter?.productId) {
            conditions.push(eq(banners.productId, filter.productId));
        }
        if (filter?.promotionId) {
            conditions.push(eq(banners.promotionId, filter.promotionId));
        }
        if (filter?.displayContext) {
            conditions.push(
                or(
                    eq(banners.displayContext, filter.displayContext as BannerDisplayContext),
                    eq(banners.displayContext, 'ALL'),
                ) as SQL,
            );
        }
        if (filter?.includeScheduled) {
            const now = new Date();
            conditions.push(
                or(isNull(banners.startsAt), lte(banners.startsAt, now)) as SQL,
                or(isNull(banners.endsAt), gte(banners.endsAt, now)) as SQL,
            );
        }

        return this.db
            .select()
            .from(banners)
            .where(and(...conditions))
            .orderBy(asc(banners.sortOrder));
    }

    async findActive(displayContext?: string): Promise<Banner[]> {
        const cacheContext = displayContext ?? 'ALL';
        const cacheKey = cache.keys.banners(cacheContext);
        const cached = await cache.get<Banner[]>(cacheKey);
        if (cached) return cached;

        const now = new Date();
        const conditions: SQL[] = [
            eq(banners.isActive, true),
            eq(banners.isDeleted, false),
            or(isNull(banners.startsAt), lte(banners.startsAt, now)) as SQL,
            or(isNull(banners.endsAt), gte(banners.endsAt, now)) as SQL,
        ];

        if (displayContext) {
            conditions.push(
                or(
                    eq(banners.displayContext, displayContext as BannerDisplayContext),
                    eq(banners.displayContext, 'ALL'),
                ) as SQL,
            );
        } else {
            conditions.push(eq(banners.displayContext, 'ALL'));
        }

        const result = await this.db
            .select()
            .from(banners)
            .where(and(...conditions))
            .orderBy(asc(banners.sortOrder));

        await cache.set(cacheKey, result, cache.TTL.BANNERS);
        return result;
    }

    async update(id: string, data: Partial<NewBanner>): Promise<Banner | undefined> {
        const [updated] = await this.db
            .update(banners)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(banners.id, id))
            .returning();
        return updated;
    }

    async updateSortOrder(id: string, sortOrder: number): Promise<Banner | undefined> {
        const [updated] = await this.db
            .update(banners)
            .set({ sortOrder, updatedAt: new Date() })
            .where(eq(banners.id, id))
            .returning();
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const [result] = await this.db
            .update(banners)
            .set({ isDeleted: true, isActive: false })
            .where(eq(banners.id, id))
            .returning();
        return !!result;
    }
}
