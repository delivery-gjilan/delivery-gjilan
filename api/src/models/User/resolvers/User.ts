import type { UserResolvers } from './../../../generated/types.generated';
export const User: UserResolvers = {
    business: async (parent, _args, { businessService }) => {
        if (!parent.businessId) {
            return null;
        }
        return businessService.getBusinessById(parent.businessId);
    },
};
