import type { MutationResolvers } from './../../../../generated/types.generated';

export const createOption: NonNullable<MutationResolvers['createOption']> = async (
    _parent,
    { optionGroupId, input },
    { productService },
) => {
    const created = await productService.createOption(optionGroupId, input);
    return {
        id: created.id,
        optionGroupId: created.optionGroupId,
        name: created.name,
        extraPrice: created.extraPrice,
        linkedProductId: created.linkedProductId ?? undefined,
        displayOrder: created.displayOrder,
    };
};
