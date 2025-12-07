import type { QueryResolvers } from './../../../../generated/types.generated';
export const business: NonNullable<QueryResolvers['business']> = async (_parent, { id }, { businessService }) => {
    return businessService.getBusiness(id);
};
