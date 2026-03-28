import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteOptionGroup: NonNullable<MutationResolvers['deleteOptionGroup']> = async (
    _parent,
    { id },
    { productService },
) => {
    return productService.deleteOptionGroup(id);
};
