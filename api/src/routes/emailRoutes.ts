import { Router, Request, Response } from 'express';
import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDB } from '@/database';
import { users as usersTable } from '@/database/schema/users';
import logger from '@/lib/logger';

const log = logger.child({ service: 'EmailUnsubscribe' });
const router = Router();

// ---------------------------------------------------------------------------
// Signed-token helpers (HMAC-SHA256, stateless)
// ---------------------------------------------------------------------------

function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return secret;
}

/** Create an unsubscribe token for `userId`. */
export function createUnsubscribeToken(userId: string): string {
    const hmac = createHmac('sha256', getSecret() + ':email-unsub');
    hmac.update(userId);
    return Buffer.from(`${userId}:${hmac.digest('hex')}`).toString('base64url');
}

/** Verify & extract userId from token. Returns null if invalid. */
function verifyUnsubscribeToken(token: string): string | null {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const sep = decoded.indexOf(':');
        if (sep === -1) return null;
        const userId = decoded.substring(0, sep);
        const sig = decoded.substring(sep + 1);

        const hmac = createHmac('sha256', getSecret() + ':email-unsub');
        hmac.update(userId);
        const expected = hmac.digest('hex');

        // Constant-time comparison
        if (sig.length !== expected.length) return null;
        const { timingSafeEqual } = require('crypto');
        if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

        return userId;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// GET /api/email/unsubscribe?token=xxx
// ---------------------------------------------------------------------------

router.get('/unsubscribe', async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;

    if (!token) {
        res.status(400).send(renderPage('Invalid link', 'The unsubscribe link is missing or malformed.', false));
        return;
    }

    const userId = verifyUnsubscribeToken(token);
    if (!userId) {
        res.status(400).send(renderPage('Invalid link', 'The unsubscribe link is invalid or has been tampered with.', false));
        return;
    }

    try {
        const db = await getDB();
        await db.update(usersTable).set({ emailOptOut: true }).where(eq(usersTable.id, userId));
        log.info({ userId }, 'email:unsubscribe:success');
        res.send(renderPage(
            'Unsubscribed',
            'You have been unsubscribed from receipt emails. You can re-enable them anytime from your profile settings in the app.',
            true,
        ));
    } catch (err) {
        log.error({ err, userId }, 'email:unsubscribe:failed');
        res.status(500).send(renderPage('Something went wrong', 'Please try again later or use the app to manage your email preferences.', false));
    }
});

// ---------------------------------------------------------------------------
// Simple HTML response page (no external assets)
// ---------------------------------------------------------------------------

function renderPage(title: string, message: string, success: boolean): string {
    const icon = success ? '&#10003;' : '&#10007;';
    const iconBg = success ? '#22C55E' : '#EF4444';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title} — Zipp Go</title>
    <style>
        body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F5F3FF;display:flex;align-items:center;justify-content:center;min-height:100vh}
        .card{background:#fff;border-radius:16px;padding:48px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(124,58,237,.1)}
        .icon{width:56px;height:56px;border-radius:50%;background:${iconBg};color:#fff;font-size:28px;line-height:56px;margin:0 auto 20px}
        h1{margin:0 0 12px;color:#1f2937;font-size:22px;font-weight:700}
        p{margin:0;color:#64748b;font-size:15px;line-height:1.5}
        .brand{margin-top:32px;font-size:13px;color:#A78BFA;font-weight:600}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <p class="brand">Zipp Go</p>
    </div>
</body>
</html>`;
}

export default router;
