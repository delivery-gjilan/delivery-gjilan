import { Router, Request, Response } from 'express';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { getDB } from '@/database';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { NotificationService } from '@/services/NotificationService';
import logger from '@/lib/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
    userId?: string;
}

function requireAuth(req: Request, res: Response, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    try {
        const token = authHeader.substring(7);
        const decoded = decodeJwtToken(token);
        (req as AuthenticatedRequest).userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * POST /api/debug/test-push
 * Sends a test Firebase push notification to the calling user's registered devices.
 * Returns the raw Firebase result so you can see success/failure/error codes.
 * Only available when NODE_ENV !== 'production'.
 */
router.post('/test-push', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).userId!;
    logger.info({ userId }, 'debug:test-push — triggered');

    try {
        const db = await getDB();
        const repo = new NotificationRepository(db);
        const service = new NotificationService(repo);

        const tokens = await repo.getTokensByUserId(userId);
        if (tokens.length === 0) {
            res.json({
                success: false,
                message: 'No device tokens registered for this user. Open the app and let it register a token first.',
                tokens: [],
            });
            return;
        }

        const result = await service.sendToUser(
            userId,
            {
                title: '🔔 Test Push Notification',
                body: 'Firebase delivery works! Your push notifications are configured correctly.',
                data: { test: 'true', screen: 'debug-notifications' },
                timeSensitive: false,
            },
            'ADMIN_ALERT',
        );

        logger.info({ userId, result }, 'debug:test-push — result');

        res.json({
            success: result.successCount > 0,
            successCount: result.successCount,
            failureCount: result.failureCount,
            staleTokens: result.staleTokens,
            registeredTokens: tokens.map(t => ({
                platform: t.platform,
                appType: t.appType,
                deviceId: t.deviceId,
                tokenPreview: t.token.substring(0, 30) + '...',
            })),
            message: result.successCount > 0
                ? '✅ Push sent successfully — you should receive it on your device!'
                : `❌ Push failed. ${result.staleTokens.length > 0 ? 'Token was stale (invalid). Please re-register.' : 'Firebase rejected the send — check APNs credentials in Firebase Console.'}`,
        });
    } catch (error) {
        const err = error as Error;
        logger.error({ err, userId }, 'debug:test-push — error');
        res.status(500).json({
            success: false,
            error: err.message,
            message: 'Firebase Admin SDK error. Check API logs for details.',
        });
    }
});

export default router;
