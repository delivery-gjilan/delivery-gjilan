import type { MutationResolvers } from './../../../../generated/types.generated';

export const createOptionGroup: NonNullable<MutationResolvers['createOptionGroup']> = async (
    _parent,
    { input },
    { productService },
) => {
    const created = await productService.createOptionGroup(input);
    return {
        id: created.id,
        productId: created.productId,
        name: created.name,
        minSelections: created.minSelections,
        maxSelections: created.maxSelections,
        displayOrder: created.displayOrder,
        options: [], // resolved by OptionGroup.options field resolver
    };
};
