import type { MutationResolvers } from './../../../../generated/types.generated';
import { UserQueryService } from '@/services/UserQueryService';
import { AppError } from '@/lib/errors';
import type { NotificationPayload } from '@/services/NotificationService';

export const sendCampaign: NonNullable<MutationResolvers['sendCampaign']> = async (
    _parent,
    { id },
    { userData, notificationService, db },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw AppError.forbidden('Only admins can send campaigns');
    }

    const campaign = await notificationService.repo.getCampaignById(id);
    if (!campaign) throw AppError.notFound('Campaign');
    if (campaign.status !== 'DRAFT') throw AppError.conflict('Campaign has already been sent or is sending');

    // Mark as sending
    await notificationService.repo.updateCampaign(id, { status: 'SENDING' });

    try {
        // Resolve target users from query
        const queryService = new UserQueryService(db);
        const userIds = await queryService.resolveUserIds(campaign.query as Record<string, unknown>);

        const rawData = campaign.data
            ? Object.fromEntries(Object.entries(campaign.data).map(([k, v]) => [k, String(v)]))
            : undefined;

        const localeContent =
            campaign.titleAl && campaign.bodyAl
                ? {
                    en: { title: campaign.title, body: campaign.body },
                    al: { title: campaign.titleAl, body: campaign.bodyAl },
                }
                : undefined;

        const payload: NotificationPayload = {
            title: campaign.title,
            body: campaign.body,
            localeContent,
            data: rawData,
            imageUrl: campaign.imageUrl || undefined,
            timeSensitive: campaign.timeSensitive,
            category: campaign.category || undefined,
            relevanceScore: campaign.relevanceScore ?? undefined,
        };

        const result = await notificationService.sendToUsers(userIds, payload, 'PROMOTIONAL');

        const updated = await notificationService.repo.updateCampaign(id, {
            status: 'SENT',
            targetCount: userIds.length,
            sentCount: result.successCount,
            failedCount: result.failureCount,
            sentAt: new Date().toISOString(),
        });

        return { ...updated!, sender: null };
    } catch (error) {
        await notificationService.repo.updateCampaign(id, { status: 'FAILED' });
        throw error;
    }
};