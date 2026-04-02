import type { MutationResolvers } from './../../../../generated/types.generated';

export const approveOrder: NonNullable<MutationResolvers['approveOrder']> = async (
    _parent,
    { id },
    context,
) => {
    return await context.orderService.approveOrderWithSideEffects(id, context);
};
