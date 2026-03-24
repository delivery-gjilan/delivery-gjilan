import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
import type { NotificationPayload } from '@/services/NotificationService';

export const sendPushNotification: NonNullable<MutationResolvers['sendPushNotification']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw AppError.forbidden('Only admins can send push notifications');
    }

    const rawData = input.data
        ? Object.fromEntries(
            Object.entries(input.data as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        )
        : undefined;

    const localeContent =
        input.titleAl && input.bodyAl
            ? {
                en: { title: input.title, body: input.body },
                al: { title: input.titleAl, body: input.bodyAl },
            }
            : undefined;

    const payload: NotificationPayload = {
        title: input.title,
        body: input.body,
        localeContent,
        data: rawData,
        imageUrl: input.imageUrl || undefined,
        timeSensitive: input.timeSensitive || false,
        category: input.category || undefined,
        relevanceScore: input.relevanceScore || undefined,
    };

    const result = await notificationService.sendToUsers(input.userIds, payload, 'ADMIN_ALERT');

    return {
        success: result.failureCount === 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
    };
};