import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateOption: NonNullable<MutationResolvers['updateOption']> = async (
    _parent,
    { id, input },
    { productService },
) => {
    const updated = await productService.updateOption(id, input);
    return {
        id: updated.id,
        optionGroupId: updated.optionGroupId,
        name: updated.name,
        extraPrice: updated.extraPrice,
        imageUrl: updated.imageUrl ?? undefined,
        linkedProductId: updated.linkedProductId ?? undefined,
        displayOrder: updated.displayOrder,
    };
};
