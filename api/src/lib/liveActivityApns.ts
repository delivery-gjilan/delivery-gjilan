import { connect } from 'node:http2';
import jwt from 'jsonwebtoken';
import logger from '@/lib/logger';

export interface LiveActivityApnsConfig {
    keyId: string;
    teamId: string;
    privateKey: string;
    bundleId: string;
    useSandbox: boolean;
}

export interface LiveActivityApnsPushResult {
    ok: boolean;
    status: number;
    reason?: string;
    responseBody?: string;
}

const APNS_TOKEN_TTL_MS = 50 * 60 * 1000;
const DEFAULT_BUNDLE_ID = 'com.artshabani.mobilecustomer';

const log = logger.child({ service: 'LiveActivityApns' });

let cachedProviderToken: { value: string; expiresAt: number; cacheKey: string } | null = null;

function normalizePrivateKey(raw: string): string {
    return raw.replace(/\\n/g, '\n').trim();
}

export function getLiveActivityApnsBundleId(): string {
    return (
        process.env.LIVE_ACTIVITY_APNS_BUNDLE_ID ||
        process.env.IOS_APP_BUNDLE_ID ||
        process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ||
        DEFAULT_BUNDLE_ID
    );
}

export function getLiveActivityApnsTopic(): string {
    return `${getLiveActivityApnsBundleId()}.push-type.liveactivity`;
}

export function getLiveActivityApnsConfig(): LiveActivityApnsConfig | null {
    const keyId = process.env.LIVE_ACTIVITY_APNS_KEY_ID || process.env.APNS_KEY_ID;
    const teamId =
        process.env.LIVE_ACTIVITY_APNS_TEAM_ID ||
        process.env.APNS_TEAM_ID ||
        process.env.APPLE_TEAM_ID ||
        process.env.IOS_TEAM_ID;
    const privateKeyRaw = process.env.LIVE_ACTIVITY_APNS_PRIVATE_KEY || process.env.APNS_PRIVATE_KEY;

    if (!keyId || !teamId || !privateKeyRaw) {
        return null;
    }

    const envValue = (process.env.LIVE_ACTIVITY_APNS_ENV || process.env.APNS_ENV || '').toLowerCase();
    const useSandbox =
        envValue === 'sandbox' ||
        envValue === 'development' ||
        (!envValue && process.env.NODE_ENV !== 'production');

    return {
        keyId,
        teamId,
        privateKey: normalizePrivateKey(privateKeyRaw),
        bundleId: getLiveActivityApnsBundleId(),
        useSandbox,
    };
}

function getProviderToken(config: LiveActivityApnsConfig): string {
    const cacheKey = `${config.teamId}:${config.keyId}:${config.bundleId}`;
    const now = Date.now();
    if (cachedProviderToken && cachedProviderToken.cacheKey === cacheKey && cachedProviderToken.expiresAt > now) {
        return cachedProviderToken.value;
    }

    const token = jwt.sign({}, config.privateKey, {
        algorithm: 'ES256',
        header: { alg: 'ES256', kid: config.keyId },
        issuer: config.teamId,
    });

    cachedProviderToken = {
        value: token,
        expiresAt: now + APNS_TOKEN_TTL_MS,
        cacheKey,
    };

    return token;
}

export async function sendLiveActivityApnsPush(
    pushToken: string,
    apsPayload: Record<string, unknown>,
    priority: '5' | '10' = '10',
): Promise<LiveActivityApnsPushResult> {
    const config = getLiveActivityApnsConfig();
    if (!config) {
        throw new Error('Live Activity APNs config is missing');
    }

    const authority = config.useSandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
    const providerToken = getProviderToken(config);
    const client = connect(authority);

    return await new Promise<LiveActivityApnsPushResult>((resolve, reject) => {
        let settled = false;
        let status = 0;
        const bodyChunks: Buffer[] = [];

        const finishResolve = (result: LiveActivityApnsPushResult) => {
            if (settled) return;
            settled = true;
            client.close();
            resolve(result);
        };

        const finishReject = (error: Error) => {
            if (settled) return;
            settled = true;
            client.close();
            reject(error);
        };

        client.on('error', (error) => {
            log.error({ err: error }, 'liveActivityApns:session:error');
            finishReject(error);
        });

        const req = client.request({
            ':method': 'POST',
            ':path': `/3/device/${pushToken}`,
            authorization: `bearer ${providerToken}`,
            'apns-topic': `${config.bundleId}.push-type.liveactivity`,
            'apns-push-type': 'liveactivity',
            'apns-priority': priority,
            'content-type': 'application/json',
        });

        req.setEncoding('utf8');
        req.setTimeout(10_000, () => {
            req.close();
            finishReject(new Error('APNs Live Activity request timed out'));
        });

        req.on('response', (headers) => {
            const rawStatus = headers[':status'];
            status = typeof rawStatus === 'number' ? rawStatus : Number(rawStatus || 0);
        });

        req.on('data', (chunk) => {
            bodyChunks.push(Buffer.from(chunk));
        });

        req.on('error', (error) => {
            finishReject(error);
        });

        req.on('close', () => {
            if (settled) return;

            const responseBody = Buffer.concat(bodyChunks).toString('utf8');
            let reason: string | undefined;

            if (responseBody) {
                try {
                    const parsed = JSON.parse(responseBody) as { reason?: string };
                    reason = parsed.reason;
                } catch {
                    reason = undefined;
                }
            }

            finishResolve({
                ok: status >= 200 && status < 300,
                status,
                reason,
                responseBody,
            });
        });

        req.end(JSON.stringify({ aps: apsPayload }));
    });
}