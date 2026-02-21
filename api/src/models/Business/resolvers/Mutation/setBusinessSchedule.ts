
import type { MutationResolvers } from './../../../../generated/types.generated';

export const setBusinessSchedule: NonNullable<MutationResolvers['setBusinessSchedule']> = async (
    _parent,
    { businessId, schedule },
    ctx,
) => {
    return ctx.businessService.setBusinessSchedule(businessId, schedule);
};