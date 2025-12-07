import type { MutationResolvers } from './../../../../generated/types.generated';
export const deleteBusiness: NonNullable<MutationResolvers['deleteBusiness']> = async (
    _parent,
    { id },
    { businessService },
) => {
    return businessService.deleteBusiness(id);
};
