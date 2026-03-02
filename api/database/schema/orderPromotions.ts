import { relations, sql } from 'drizzle-orm';
import { pgTable, numeric, timestamp, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { promotions } from './promotions';


const promotionAppliesToValues = ['PRICE', 'DELIVERY'] as const;
[...promotionAppliesToValues] satisfies string[];
export const promotionAppliesTo = pgEnum('promotion_applies_to', promotionAppliesToValues);

export const orderPromotions = pgTable('order_promotions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    promotionId: uuid('promotion_id').notNull().references(() => promotions.id, { onDelete: 'cascade' }),
    appliesTo: promotionAppliesTo('applies_to').notNull(),
    discountAmount: numeric('discount_amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (t) => ([
    index('idx_order_promotions_order_id').on(t.orderId),
]));

export const orderPromotionsRelations = relations(orderPromotions, ({ one }) => ({
    order: one(orders, {
        fields: [orderPromotions.orderId],
        references: [orders.id],
    }),
    promotion: one(promotions, {
        fields: [orderPromotions.promotionId],
        references: [promotions.id],
    }),
}));

export type DbOrderPromotion = typeof orderPromotions.$inferSelect;
export type NewDbOrderPromotion = typeof orderPromotions.$inferInsert;
