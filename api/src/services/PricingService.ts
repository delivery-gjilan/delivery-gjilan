import { type DbType } from '@/database';
import { products } from '@/database/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

const log = logger.child({ service: 'PricingService' });

/** Night hours: 23:00 – 05:59 */
const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 6;

type Database = DbType;

export interface PriceCalculationResult {
    productId: string;
    basePrice: number;
    markupPrice: number | null;
    nightMarkedupPrice: number | null;
    salePrice: number | null;
    isNightHours: boolean;
    finalAppliedPrice: number;
}

function isNightHours(timestamp: Date = new Date()): boolean {
    const hour = timestamp.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * PricingService – resolves the correct price for a product from the products table.
 *
 * Price precedence:
 *   1. salePrice  – when isOnSale is true and salePrice is set
 *   2. nightMarkedupPrice – when current time is in the night window and nightMarkedupPrice is set
 *   3. markupPrice – when set outside night window
 *   4. basePrice   – fallback
 */
export class PricingService {
    constructor(private db: Database) {}

    async calculateProductPrice(
        productId: string,
        context: { timestamp?: Date } = {}
    ): Promise<PriceCalculationResult> {
        const product = await this.db.query.products.findFirst({
            where: eq(products.id, productId),
            columns: {
                id: true,
                basePrice: true,
                markupPrice: true,
                nightMarkedupPrice: true,
                salePrice: true,
                isOnSale: true,
            },
        });

        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        const basePrice = Number(product.basePrice);
        const markupPrice = product.markupPrice != null ? Number(product.markupPrice) : null;
        const nightMarkedupPrice = product.nightMarkedupPrice != null ? Number(product.nightMarkedupPrice) : null;
        const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
        const nightHours = isNightHours(context.timestamp);

        let finalAppliedPrice: number;
        if (product.isOnSale && salePrice != null) {
            finalAppliedPrice = salePrice;
        } else if (nightHours && nightMarkedupPrice != null) {
            finalAppliedPrice = nightMarkedupPrice;
        } else if (markupPrice != null) {
            finalAppliedPrice = markupPrice;
        } else {
            finalAppliedPrice = basePrice;
        }

        log.debug({ productId, basePrice, markupPrice, nightMarkedupPrice, salePrice, nightHours, finalAppliedPrice }, 'pricing:calculated');

        return {
            productId,
            basePrice,
            markupPrice,
            nightMarkedupPrice,
            salePrice,
            isNightHours: nightHours,
            finalAppliedPrice: Number(finalAppliedPrice.toFixed(2)),
        };
    }

    async calculateProductPrices(
        productIds: string[],
        context: { timestamp?: Date } = {}
    ): Promise<Map<string, PriceCalculationResult>> {
        const results = new Map<string, PriceCalculationResult>();
        for (const productId of productIds) {
            try {
                results.set(productId, await this.calculateProductPrice(productId, context));
            } catch (error) {
                log.error({ err: error, productId }, 'pricing:calculate:error');
            }
        }
        return results;
    }
}
