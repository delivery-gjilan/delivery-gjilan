import type { MutationResolvers } from './../../../../generated/types.generated';
export const updateBusiness: NonNullable<MutationResolvers['updateBusiness']> = async (
    _parent,
    { id, input },
    { businessService },
) => {
    return businessService.updateBusiness(id, input);
};
