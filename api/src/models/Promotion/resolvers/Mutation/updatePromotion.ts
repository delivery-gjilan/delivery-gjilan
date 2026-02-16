import type { MutationResolvers } from './../../../../generated/types.generated';

export const updatePromotion: NonNullable<MutationResolvers['updatePromotion']> = async (
        _parent,
        { id, input },
        { userData, promotionService },
) => {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
                throw new Error('Forbidden');
        }

        const updated = await promotionService.updatePromotion(id, {
                code: input.code ?? undefined,
                name: input.name ?? undefined,
                description: input.description ?? undefined,
                type: input.type ?? undefined,
                value: input.value ?? undefined,
                maxRedemptions: input.maxRedemptions ?? undefined,
                maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? undefined,
                freeDeliveryCount: input.freeDeliveryCount ?? undefined,
                firstOrderOnly: input.firstOrderOnly ?? undefined,
                isActive: input.isActive ?? undefined,
                autoApply: input.autoApply ?? undefined,
                startsAt: input.startsAt ?? undefined,
                endsAt: input.endsAt ?? undefined,
                referrerUserId: input.referrerUserId ?? undefined,
        }, input.targetUserIds ?? undefined);

        if (!updated) {
                throw new Error('Promotion not found');
        }

        return updated;
};