import type { MutationResolvers } from '@/generated/types.generated';

export const createBusiness: NonNullable<MutationResolvers['createBusiness']> = async (
    _parent,
    { input },
    { businessService },
) => {
    return businessService.createBusiness(input);
};
