/**
 * Migration Script: Initialize Product Pricing
 * 
 * This script creates product_pricing records for all existing products
 * that don't have pricing configured yet.
 * 
 * Usage:
 *   npx tsx scripts/initialize-product-pricing.ts
 */

import { getDB } from '../database';
import { products } from '../database/schema/products';
import { PricingService } from '../services/PricingService';
import logger from '../lib/logger';

const log = logger.child({ script: 'initialize-product-pricing' });

// Configuration
const DEFAULT_PLATFORM_MARKUP = 2.50;

const CATEGORY_MARKUPS: Record<string, number> = {
  // Add your category IDs and their specific markups here
  // 'food-category-id': 2.50,
  // 'grocery-category-id': 1.50,
  // 'pharmacy-category-id': 3.00,
};

async function initializeProductPricing() {
  const db = getDB();
  const pricingService = new PricingService(db);

  log.info('Starting product pricing initialization...');

  try {
    // Fetch all products
    const allProducts = await db.select().from(products);
    
    if (allProducts.length === 0) {
      log.info('No products found in database');
      return;
    }

    log.info({ count: allProducts.length }, 'Found products to process');

    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        // Determine markup based on category or use default
        const markup = CATEGORY_MARKUPS[product.categoryId] || DEFAULT_PLATFORM_MARKUP;

        // Use ensureProductPricing which creates only if doesn't exist
        const pricing = await pricingService.ensureProductPricing(
          product.id,
          product.businessId,
          parseFloat(product.price),
          markup
        );

        // Check if it was newly created
        const isNew = new Date(pricing.createdAt).getTime() > Date.now() - 5000;
        
        if (isNew) {
          created++;
          log.info({
            productId: product.id,
            productName: product.name,
            businessPrice: product.price,
            platformMarkup: markup,
          }, 'Created pricing record');
        } else {
          existing++;
        }
      } catch (error) {
        errors++;
        log.error({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to create pricing record');
      }
    }

    log.info({
      total: allProducts.length,
      created,
      existing,
      errors,
    }, 'Product pricing initialization complete');

    console.log('\n=== Summary ===');
    console.log(`Total Products: ${allProducts.length}`);
    console.log(`✓ Created New: ${created}`);
    console.log(`ℹ Already Exists: ${existing}`);
    console.log(`✗ Errors: ${errors}`);
    console.log('\nDone!');

  } catch (error) {
    log.error({ error }, 'Fatal error during migration');
    throw error;
  }
}

// Run the migration
initializeProductPricing()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
