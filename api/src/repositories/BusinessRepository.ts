import { DbType } from '@/database';
import { DbBusiness, NewDbBusiness, businesses } from '@/database/schema/businesses';
import { eq } from 'drizzle-orm';

export class BusinessRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbBusiness): Promise<DbBusiness> {
        const [createdBusiness] = await this.db.insert(businesses).values(data).returning();
        return createdBusiness;
    }

    async findById(id: string): Promise<DbBusiness | undefined> {
        const [business] = await this.db.select().from(businesses).where(eq(businesses.id, id));
        return business;
    }

    async findAll(): Promise<DbBusiness[]> {
        return this.db.select().from(businesses);
    }

    async update(id: string, data: Partial<NewDbBusiness>): Promise<DbBusiness | undefined> {
        const [updatedBusiness] = await this.db.update(businesses).set(data).where(eq(businesses.id, id)).returning();
        return updatedBusiness;
    }

    async delete(id: string): Promise<boolean> {
        const [deletedBusiness] = await this.db.delete(businesses).where(eq(businesses.id, id)).returning();
        return !!deletedBusiness;
    }
}
