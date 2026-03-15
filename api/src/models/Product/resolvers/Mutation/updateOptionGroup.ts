import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateOptionGroup: NonNullable<MutationResolvers['updateOptionGroup']> = async (
    _parent,
    { id, input },
    { productService },
) => {
    const updated = await productService.updateOptionGroup(id, input);
    return {
        id: updated.id,
        productId: updated.productId,
        name: updated.name,
        minSelections: updated.minSelections,
        maxSelections: updated.maxSelections,
        displayOrder: updated.displayOrder,
        options: [], // resolved by field resolver
    };
};
