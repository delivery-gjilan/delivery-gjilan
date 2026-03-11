import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, index, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { drivers } from './drivers';
import { businesses } from './businesses';
import { orders } from './orders';
import { users } from './users';

const settlementTypeValues = ['DRIVER', 'BUSINESS'] as const;
export const settlementType = pgEnum('settlement_type', settlementTypeValues);

const settlementDirectionValues = ['RECEIVABLE', 'PAYABLE'] as const;
export const settlementDirection = pgEnum('settlement_direction', settlementDirectionValues);

const settlementStatusValues = ['PENDING', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED'] as const;
export const settlementStatus = pgEnum('settlement_status', settlementStatusValues);

/**
 * Settlements table - Enhanced version with full audit trail
 * 
 * RECEIVABLE: Business/driver owes platform
 * PAYABLE: Platform owes business/driver (e.g., free delivery coupons)
 * 
 * Stores complete calculation breakdown and rule snapshots for auditing
 */
export const settlements = pgTable('settlements', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    // Type and direction
    type: settlementType('type').notNull(),
    direction: settlementDirection('direction').notNull(),
    
    // Who this settlement is for
    driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    
    // Which order
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    
    /**
     * Snapshot of rules applied at time of calculation
     * Preserves exact configuration for audit/dispute purposes
     */
    ruleSnapshot: jsonb('rule_snapshot').$type<{
        appliedRules: Array<{
            ruleId: string;
            ruleType: string;
            config: any;
            activeSince: string;
            capturedAt: string;
        }>;
    }>(),
    
    /**
     * Detailed calculation breakdown
     * Shows exactly how the settlement amount was derived
     */
    calculationDetails: jsonb('calculation_details').$type<{
        orderSubtotal?: number;
        deliveryFee?: number;
        itemsBreakdown?: Array<{
            orderItemId: string;
            productId: string;
            productName: string;
            quantity: number;
            businessPrice: number;
            platformMarkup: number;
            customerPrice: number;
            dynamicAdjustments?: Array<{
                ruleId: string;
                ruleName: string;
                adjustmentType: string;
                adjustmentValue: number;
            }>;
            totalBusinessRevenue: number;
            totalPlatformMarkup: number;
            totalCustomerPaid: number;
        }>;
        rulesApplied?: Array<{
            ruleType: string;
            description: string;
            baseAmount?: number;
            percentage?: number;
            amount: number;
            direction: 'RECEIVABLE' | 'PAYABLE';
        }>;
        totalReceivable: number;
        totalPayable: number;
        netAmount: number;
        currency: string;
    }>(),
    
    // Final amount (always positive, direction indicates if we receive or pay)
    amount: numeric('amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
    
    // Payment status
    status: settlementStatus('status').default('PENDING').notNull(),
    
    // Payment tracking
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    paidBy: uuid('paid_by').references(() => users.id, { onDelete: 'set null' }),
    paymentReference: varchar('payment_reference', { length: 100 }),
    paymentMethod: varchar('payment_method', { length: 50 }),
    
    /**
     * Metadata for special cases (coupons, bonuses, etc.)
     */
    metadata: jsonb('metadata').$type<{
        couponApplied?: {
            code: string;
            type: string;
            originalDeliveryFee: number;
            driverCommissionRate: number;
            platformPaysDriver: number;
        };
        driverBonus?: {
            type: string;
            amount: number;
            reason: string;
        };
        notes?: string;
        [key: string]: any;
    }>(),
    
    // Audit trail
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
}, (t) => ([
    index('idx_settlements_order_id').on(t.orderId),
    index('idx_settlements_driver_id').on(t.driverId),
    index('idx_settlements_business_id').on(t.businessId),
    index('idx_settlements_status').on(t.status),
    index('idx_settlements_type_direction').on(t.type, t.direction),
]));

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
    paidByUser: one(users, {
        fields: [settlements.paidBy],
        references: [users.id],
    }),
    createdByUser: one(users, {
        fields: [settlements.createdBy],
        references: [users.id],
    }),
}));

export type DbSettlement = typeof settlements.$inferSelect;
export type NewDbSettlement = typeof settlements.$inferInsert;
