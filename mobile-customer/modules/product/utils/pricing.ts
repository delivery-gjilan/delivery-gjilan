const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 6;

function isNightHours(timestamp: Date = new Date()): boolean {
    const hour = timestamp.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

type ProductPriceLike = {
    price?: number | null;
    salePrice?: number | null;
    isOnSale?: boolean | null;
    markupPrice?: number | null;
    nightMarkedupPrice?: number | null;
};

export function getEffectiveProductPrice(product: ProductPriceLike, timestamp: Date = new Date()): number {
    if (product.isOnSale && product.salePrice != null) {
        return Number(product.salePrice);
    }

    if (isNightHours(timestamp) && product.nightMarkedupPrice != null) {
        return Number(product.nightMarkedupPrice);
    }

    if (product.markupPrice != null) {
        return Number(product.markupPrice);
    }

    return Number(product.price ?? 0);
}
