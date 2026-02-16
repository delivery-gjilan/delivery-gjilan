import type { MutationResolvers } from './../../../../generated/types.generated';

export const createPromotion: NonNullable<MutationResolvers['createPromotion']> = async (
        _parent,
        { input },
        { userData, promotionService },
) => {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
                throw new Error('Forbidden');
        }

        const promotion = await promotionService.createPromotion({
                code: input.code,
                name: input.name,
                description: input.description ?? null,
                type: input.type,
                value: input.value ?? 0,
                maxRedemptions: input.maxRedemptions ?? null,
                maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? null,
                freeDeliveryCount: input.freeDeliveryCount ?? null,
                firstOrderOnly: input.firstOrderOnly ?? false,
                isActive: input.isActive ?? true,
                autoApply: input.autoApply ?? false,
                startsAt: input.startsAt ?? null,
                endsAt: input.endsAt ?? null,
                referrerUserId: input.referrerUserId ?? null,
        }, input.targetUserIds ?? []);

        return promotion;
};