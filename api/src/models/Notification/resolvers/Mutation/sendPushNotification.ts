import type { MutationResolvers } from './../../../../generated/types.generated';

export const sendPushNotification: NonNullable<MutationResolvers['sendPushNotification']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw new Error('Only admins can send push notifications');
    }

    const payload = {
        title: input.title,
        body: input.body,
        data: input.data ? Object.fromEntries(
            Object.entries(input.data as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        ) : undefined,
    };

    const result = await notificationService.sendToUsers(input.userIds, payload, 'ADMIN_ALERT');

    return {
        success: result.failureCount === 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
    };
};