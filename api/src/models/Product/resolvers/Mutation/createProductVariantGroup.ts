import type { MutationResolvers } from './../../../../generated/types.generated';

export const createProductVariantGroup: NonNullable<MutationResolvers['createProductVariantGroup']> = async (
    _parent,
    { input },
    { productService },
) => {
    return productService.createVariantGroup(input);
};
