const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 6;

function isNightHours(timestamp: Date = new Date()): boolean {
    const hour = timestamp.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

type ProductPriceLike = {
    price?: number | null;
    basePrice?: number | null;
    effectivePrice?: number | null;
    isOnSale?: boolean | null;
    saleDiscountPercentage?: number | null;
    markupPrice?: number | null;
    nightMarkedupPrice?: number | null;
};

function normalizeMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

export function getEffectiveProductPrice(product: ProductPriceLike, timestamp: Date = new Date()): number {
    if (product.effectivePrice != null) {
        return Number(product.effectivePrice);
    }

    if (isNightHours(timestamp) && product.nightMarkedupPrice != null) {
        return Number(product.nightMarkedupPrice);
    }

    if (product.markupPrice != null) {
        return Number(product.markupPrice);
    }

    return Number(product.price ?? product.basePrice ?? 0);
}

export function getPreDiscountProductPrice(product: ProductPriceLike, timestamp: Date = new Date()): number | null {
    const effective = getEffectiveProductPrice(product, timestamp);
    const discount = product.saleDiscountPercentage != null ? Number(product.saleDiscountPercentage) : null;

    if (!product.isOnSale || discount == null || discount <= 0 || discount >= 100) {
        return null;
    }

    return normalizeMoney(effective / (1 - discount / 100));
}
