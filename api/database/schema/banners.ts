import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { products } from './products';
import { promotions } from './promotions';
import { relations } from 'drizzle-orm';

export const bannerMediaTypeEnum = pgEnum('banner_media_type', ['IMAGE', 'GIF', 'VIDEO']);
export const bannerDisplayContextEnum = pgEnum('banner_display_context', [
  'HOME',           // Home page carousel
  'BUSINESS',       // Business detail page
  'CATEGORY',       // Category page
  'PRODUCT',        // Product detail page
  'CART',           // Cart page
  'ALL',            // All pages
]);

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  subtitle: text('subtitle'),
  imageUrl: text('image_url').notNull(),
  mediaType: bannerMediaTypeEnum('media_type').notNull().default('IMAGE'),
  
  // Relationships
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  promotionId: uuid('promotion_id').references(() => promotions.id, { onDelete: 'set null' }),
  
  // Link configuration (legacy - kept for backward compatibility)
  linkType: text('link_type'), // 'business', 'product', 'category', 'promotion', 'external', 'none'
  linkTarget: text('link_target'), // business ID, product ID, category name, promotion ID, or URL
  
  // Display configuration
  displayContext: bannerDisplayContextEnum('display_context').notNull().default('HOME'),
  
  // Scheduling
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  
  // Ordering and status
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bannersRelations = relations(banners, ({ one }) => ({
  business: one(businesses, {
    fields: [banners.businessId],
    references: [businesses.id],
  }),
  product: one(products, {
    fields: [banners.productId],
    references: [products.id],
  }),
  promotion: one(promotions, {
    fields: [banners.promotionId],
    references: [promotions.id],
  }),
}));

export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
