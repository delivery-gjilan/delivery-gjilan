import { pgTable, uuid, integer, numeric, timestamp, uniqueIndex, index, boolean } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { products } from './products';

export const personalInventory = pgTable(
    'personal_inventory',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        quantity: integer('quantity').notNull().default(0),
        lowStockThreshold: integer('low_stock_threshold').default(2),
        costPrice: numeric('cost_price', { mode: 'number', precision: 10, scale: 2 }),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (t) => [
        uniqueIndex('uq_personal_inventory_business_product').on(t.businessId, t.productId),
        index('idx_personal_inventory_business_id').on(t.businessId),
    ],
);

export const personalInventoryRelations = relations(personalInventory, ({ one }) => ({
    business: one(businesses, {
        fields: [personalInventory.businessId],
        references: [businesses.id],
    }),
    product: one(products, {
        fields: [personalInventory.productId],
        references: [products.id],
    }),
}));

export type DbPersonalInventory = typeof personalInventory.$inferSelect;
export type NewDbPersonalInventory = typeof personalInventory.$inferInsert;
