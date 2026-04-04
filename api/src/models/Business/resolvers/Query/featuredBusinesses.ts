import type { QueryResolvers } from './../../../../generated/types.generated';
export const featuredBusinesses: NonNullable<QueryResolvers['featuredBusinesses']> = async (_parent, _arg, { businessService }) => {
    return businessService.getFeaturedBusinesses();
};
