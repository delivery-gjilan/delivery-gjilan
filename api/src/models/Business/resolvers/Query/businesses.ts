import type { QueryResolvers } from './../../../../generated/types.generated';
export const businesses: NonNullable<QueryResolvers['businesses']> = async (_parent, _arg, { businessService }) => {
    return businessService.getBusinesses();
};
