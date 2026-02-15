import { pgTable, uuid, varchar, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { drivers } from './drivers';
import { businesses } from './businesses';
import { orders } from './orders';

const settlementTypeValues = ['DRIVER_PAYMENT', 'BUSINESS_PAYMENT'] as const;
export const settlementType = pgEnum('settlement_type', settlementTypeValues);

const settlementStatusValues = ['PENDING', 'PAID', 'OVERDUE'] as const;
export const settlementStatus = pgEnum('settlement_status', settlementStatusValues);

/**
 * Settlements table - tracks money owed between market owner, drivers, and businesses
 * 
 * DRIVER_PAYMENT: Driver owes market owner for products ordered
 * BUSINESS_PAYMENT: Business owes market owner for products/commission
 */
export const settlements = pgTable('settlements', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    // Type of settlement (driver owes vs business owes)
    type: settlementType('type').notNull(),
    
    // Who owes money (one of these will be set)
    driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    
    // Which order this settlement is for
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    
    // Amount owed in numeric format
    amount: numeric('amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    
    // Payment status
    status: settlementStatus('status').default('PENDING').notNull(),
    
    // When it was paid
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const settlementsRelations = relations(settlements, ({ one }) => ({
    driver: one(drivers, {
        fields: [settlements.driverId],
        references: [drivers.id],
    }),
    business: one(businesses, {
        fields: [settlements.businessId],
        references: [businesses.id],
    }),
    order: one(orders, {
        fields: [settlements.orderId],
        references: [orders.id],
    }),
}));

export type DbSettlement = typeof settlements.$inferSelect;
export type NewDbSettlement = typeof settlements.$inferInsert;
