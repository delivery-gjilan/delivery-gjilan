import { DbType } from '@/database';
import { DbBusiness, NewDbBusiness, businesses } from '@/database/schema/businesses';
import { eq, and, isNull, sql, asc } from 'drizzle-orm';

export class BusinessRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbBusiness): Promise<DbBusiness> {
        const [createdBusiness] = await this.db.insert(businesses).values(data).returning();
        return createdBusiness;
    }

    async findById(id: string): Promise<DbBusiness | undefined> {
        const [business] = await this.db.select().from(businesses).where(and(eq(businesses.id, id), isNull(businesses.deletedAt)));
        return business;
    }

    async findAll(): Promise<DbBusiness[]> {
        return this.db.select().from(businesses).where(isNull(businesses.deletedAt));
    }

    async findFeatured(): Promise<DbBusiness[]> {
        return this.db
            .select()
            .from(businesses)
            .where(and(eq(businesses.isFeatured, true), isNull(businesses.deletedAt)))
            .orderBy(asc(businesses.featuredSortOrder));
    }

    async setFeatured(id: string, isFeatured: boolean, sortOrder: number): Promise<DbBusiness | undefined> {
        const [updated] = await this.db
            .update(businesses)
            .set({ isFeatured, featuredSortOrder: sortOrder })
            .where(and(eq(businesses.id, id), isNull(businesses.deletedAt)))
            .returning();
        return updated;
    }

    async update(id: string, data: Partial<NewDbBusiness>): Promise<DbBusiness | undefined> {
        const [updatedBusiness] = await this.db.update(businesses).set(data).where(eq(businesses.id, id)).returning();
        return updatedBusiness;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db
            .update(businesses)
            .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(businesses.id, id), isNull(businesses.deletedAt)))
            .returning();
        return result.length > 0;
    }
}
