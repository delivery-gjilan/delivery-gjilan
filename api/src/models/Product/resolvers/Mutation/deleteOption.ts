import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteOption: NonNullable<MutationResolvers['deleteOption']> = async (
    _parent,
    { id },
    { productService },
) => {
    return productService.deleteOption(id);
};
