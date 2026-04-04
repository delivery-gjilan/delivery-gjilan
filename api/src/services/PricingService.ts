import { type DbType } from '@/database';
import { products } from '@/database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { applyPercentageDiscount, normalizeMoney } from '@/lib/utils/money';

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
    /** Discount percentage (0–100) that was applied, or null if not on sale. */
    saleDiscountPercentage: number | null;
    isNightHours: boolean;
    finalAppliedPrice: number;
}

type ProductPricingRow = {
    id: string;
    basePrice: number;
    markupPrice: number | null;
    nightMarkedupPrice: number | null;
    saleDiscountPercentage: number | null;
    isOnSale: boolean;
};

function isNightHours(timestamp: Date = new Date()): boolean {
    const hour = timestamp.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * PricingService – resolves the correct price for a product from the products table.
 *
 * Price precedence:
 *   1. Context tier selection:
 *      - nightMarkedupPrice – during night hours (23:00–05:59) when set
 *      - markupPrice        – during day hours when set
 *      - basePrice          – fallback always available
 *   2. Discount application:
 *      - If isOnSale && saleDiscountPercentage != null:
 *          finalPrice = contextPrice * (1 - saleDiscountPercentage / 100), rounded to 2dp
 *      Discount applies uniformly to whichever tier is active.
 */
export class PricingService {
    constructor(private db: Database) {}

    private buildPriceResult(
        product: ProductPricingRow,
        context: { timestamp?: Date } = {}
    ): PriceCalculationResult {
        const basePrice = Number(product.basePrice);
        const markupPrice = product.markupPrice != null ? Number(product.markupPrice) : null;
        const nightMarkedupPrice = product.nightMarkedupPrice != null ? Number(product.nightMarkedupPrice) : null;
        const saleDiscountPercentage = product.saleDiscountPercentage != null ? Number(product.saleDiscountPercentage) : null;
        const nightHours = isNightHours(context.timestamp);

        // Step 1: pick the context-appropriate tier price
        const contextPrice = (nightHours && nightMarkedupPrice != null)
            ? nightMarkedupPrice
            : (markupPrice != null)
                ? markupPrice
                : basePrice;

        // Step 2: apply discount if on sale
        const finalAppliedPrice = (product.isOnSale && saleDiscountPercentage != null)
            ? applyPercentageDiscount(contextPrice, saleDiscountPercentage)
            : normalizeMoney(contextPrice);

        return {
            productId: product.id,
            basePrice: normalizeMoney(basePrice),
            markupPrice: markupPrice != null ? normalizeMoney(markupPrice) : null,
            nightMarkedupPrice: nightMarkedupPrice != null ? normalizeMoney(nightMarkedupPrice) : null,
            saleDiscountPercentage,
            isNightHours: nightHours,
            finalAppliedPrice,
        };
    }

    async calculateProductPrice(
        productId: string,
        context: { timestamp?: Date } = {}
    ): Promise<PriceCalculationResult> {
        const product = await this.db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.isDeleted, false)),
            columns: {
                id: true,
                basePrice: true,
                markupPrice: true,
                nightMarkedupPrice: true,
                saleDiscountPercentage: true,
                isOnSale: true,
            },
        });

        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        const result = this.buildPriceResult(product, context);
        log.debug({ ...result, productId }, 'pricing:calculated');
        return result;
    }

    async calculateProductPrices(
        productIds: string[],
        context: { timestamp?: Date } = {}
    ): Promise<Map<string, PriceCalculationResult>> {
        const results = new Map<string, PriceCalculationResult>();

        const uniqueProductIds = Array.from(new Set(productIds));
        if (uniqueProductIds.length === 0) {
            return results;
        }

        const rows = await this.db.query.products.findMany({
            where: and(inArray(products.id, uniqueProductIds), eq(products.isDeleted, false)),
            columns: {
                id: true,
                basePrice: true,
                markupPrice: true,
                nightMarkedupPrice: true,
                saleDiscountPercentage: true,
                isOnSale: true,
            },
        });

        const rowsById = new Map(rows.map((row) => [row.id, row]));

        for (const productId of uniqueProductIds) {
            const row = rowsById.get(productId);
            if (!row) {
                log.error({ productId }, 'pricing:calculate:error:product-not-found');
                continue;
            }

            const result = this.buildPriceResult(row, context);
            log.debug({ ...result, productId }, 'pricing:calculated');
            results.set(productId, result);
        }

        return results;
    }
}
