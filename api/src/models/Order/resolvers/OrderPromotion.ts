import type { OrderPromotionResolvers } from './../../../generated/types.generated';

export const OrderPromotion: OrderPromotionResolvers = {
    promoCode: (parent) => (parent as any).promoCode ?? null,
};