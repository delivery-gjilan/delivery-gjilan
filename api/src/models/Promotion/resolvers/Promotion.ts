import type { PromotionResolvers } from './../../../generated/types.generated';

export const Promotion: PromotionResolvers = {
    targetUserIds: async (parent, _args, { promotionService }) => {
        return promotionService.getTargetUserIds(parent.id);
    },
};