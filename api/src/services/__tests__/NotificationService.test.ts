/**
 * Unit tests for NotificationService.
 *
 * Scoped to pure-logic and Firebase-mocked behaviour:
 *
 * 1. resolveLocalizedPayload (private, accessed via cast)
 *    – English fallback when locale = 'en' or unset
 *    – Albanian localisation when locale = 'al'
 *    – Unknown locale gracefully falls back to the 'en' variant
 *    – Preserves data fields through the merge
 *
 * 2. normalizeLocale (private)
 *    – 'al' → 'al', everything else → 'en'
 *
 * 3. mergeSendResults (private)
 *    – Empty array → zeros, no stale tokens
 *    – Multiple results are summed correctly, stale lists concatenated
 *
 * 4. sendToUser
 *    – Zero tokens → returns {0,0,[]} without calling Firebase
 *    – With tokens → calls Firebase sendEachForMulticast and returns correct counts
 *    – Stale tokens (FCM error codes) are collected and removed via the repo
 *
 * Firebase Admin is mocked so no real FCM credentials are required.
 * The repo is a vi.fn() mock throughout.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// Mock Firebase Admin — must happen before any module that calls getMessaging()
// ──────────────────────────────────────────────────────────────────────────────

const mockSendEachForMulticast = vi.fn();
const mockSend = vi.fn();

vi.mock('@/lib/firebase', () => ({
    getMessaging: () => ({
        sendEachForMulticast: mockSendEachForMulticast,
        send: mockSend,
    }),
}));

vi.mock('@/lib/logger', () => ({
    default: {
        child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/cache', () => ({
    cache: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
    },
}));

import { NotificationService, type NotificationPayload } from '../NotificationService';
import type { NotificationRepository } from '@/repositories/NotificationRepository';
import type { NotificationType } from '@/database/schema/notifications';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeRepo(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        getTokensByUserId: vi.fn().mockResolvedValue([]),
        getTokensByUserIdAndAppType: vi.fn().mockResolvedValue([]),
        getTokensByUserIds: vi.fn().mockResolvedValue([]),
        getTokensByUserIdsAndAppType: vi.fn().mockResolvedValue([]),
        getUserPreferredLanguage: vi.fn().mockResolvedValue(undefined),
        getUsersPreferredLanguages: vi.fn().mockResolvedValue({}),
        createNotification: vi.fn().mockResolvedValue({}),
        createNotifications: vi.fn().mockResolvedValue([]),
        removeDeviceToken: vi.fn().mockResolvedValue(undefined),
        removeDeviceTokenForUser: vi.fn().mockResolvedValue(undefined),
        removeTokensForUser: vi.fn().mockResolvedValue(undefined),
        removeDeviceTokensByIds: vi.fn().mockResolvedValue(undefined),
        upsertDeviceToken: vi.fn().mockResolvedValue({}),
        ...overrides,
    };
}

function makeService(repoOverrides: Partial<Record<string, unknown>> = {}) {
    return new NotificationService(makeRepo(repoOverrides) as unknown as NotificationRepository);
}

// Shorthand to call private methods
const priv = (svc: NotificationService) => svc as any;

// ──────────────────────────────────────────────────────────────────────────────
// 1. normalizeLocale
// ──────────────────────────────────────────────────────────────────────────────

describe('NotificationService.normalizeLocale', () => {
    it('returns "al" for "al" input', () => {
        expect(priv(makeService()).normalizeLocale('al')).toBe('al');
    });

    it('returns "en" for "en" input', () => {
        expect(priv(makeService()).normalizeLocale('en')).toBe('en');
    });

    it('returns "en" for an unrecognised locale', () => {
        expect(priv(makeService()).normalizeLocale('fr')).toBe('en');
    });

    it('returns "en" when locale is undefined', () => {
        expect(priv(makeService()).normalizeLocale(undefined)).toBe('en');
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. resolveLocalizedPayload
// ──────────────────────────────────────────────────────────────────────────────

const BILINGUAL_PAYLOAD: NotificationPayload = {
    title: 'Default title',
    body: 'Default body',
    localeContent: {
        en: { title: 'Order Ready!', body: 'Your order is ready.' },
        al: { title: 'Porosia gati!', body: 'Porosia juaj eshte gati.' },
    },
    data: { orderId: 'order-1', screen: 'orders' },
};

describe('NotificationService.resolveLocalizedPayload', () => {
    it('returns the English variant for locale "en"', () => {
        const result = priv(makeService()).resolveLocalizedPayload(BILINGUAL_PAYLOAD, 'en');
        expect(result.title).toBe('Order Ready!');
        expect(result.body).toBe('Your order is ready.');
    });

    it('returns the Albanian variant for locale "al"', () => {
        const result = priv(makeService()).resolveLocalizedPayload(BILINGUAL_PAYLOAD, 'al');
        expect(result.title).toBe('Porosia gati!');
        expect(result.body).toBe('Porosia juaj eshte gati.');
    });

    it('falls back to the English variant for an unknown locale', () => {
        const result = priv(makeService()).resolveLocalizedPayload(BILINGUAL_PAYLOAD, 'de');
        expect(result.title).toBe('Order Ready!');
    });

    it('falls back to the top-level title/body when localeContent is absent', () => {
        const plain: NotificationPayload = { title: 'Hi', body: 'Hello' };
        const result = priv(makeService()).resolveLocalizedPayload(plain, 'en');
        expect(result.title).toBe('Hi');
        expect(result.body).toBe('Hello');
    });

    it('preserves the data fields from the original payload', () => {
        const result = priv(makeService()).resolveLocalizedPayload(BILINGUAL_PAYLOAD, 'en');
        expect(result.data?.orderId).toBe('order-1');
        expect(result.data?.screen).toBe('orders');
    });

    it('injects the language key into the data field', () => {
        const result = priv(makeService()).resolveLocalizedPayload(BILINGUAL_PAYLOAD, 'al');
        expect(result.data?.language).toBe('al');
    });

    it('strips localeContent from the resolved payload', () => {
        const result = priv(makeService()).resolveLocalizedPayload(BILINGUAL_PAYLOAD, 'en');
        expect((result as Record<string, unknown>).localeContent).toBeUndefined();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. mergeSendResults
// ──────────────────────────────────────────────────────────────────────────────

describe('NotificationService.mergeSendResults', () => {
    it('returns zeros for an empty array', () => {
        const result = priv(makeService()).mergeSendResults([]);
        expect(result).toEqual({ successCount: 0, failureCount: 0, staleTokens: [] });
    });

    it('returns the single result unchanged', () => {
        const single = { successCount: 3, failureCount: 1, staleTokens: ['tok-a'] };
        expect(priv(makeService()).mergeSendResults([single])).toEqual(single);
    });

    it('sums counts and concatenates stale tokens from multiple results', () => {
        const results = [
            { successCount: 5, failureCount: 2, staleTokens: ['tok-1', 'tok-2'] },
            { successCount: 3, failureCount: 0, staleTokens: [] },
            { successCount: 0, failureCount: 1, staleTokens: ['tok-3'] },
        ];
        const merged = priv(makeService()).mergeSendResults(results);
        expect(merged.successCount).toBe(8);
        expect(merged.failureCount).toBe(3);
        expect(merged.staleTokens).toEqual(['tok-1', 'tok-2', 'tok-3']);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. sendToUser
// ──────────────────────────────────────────────────────────────────────────────

describe('NotificationService.sendToUser — no tokens', () => {
    it('returns {0,0,[]} without calling Firebase when the user has no device tokens', async () => {
        const svc = makeService({ getTokensByUserId: vi.fn().mockResolvedValue([]) });
        const result = await svc.sendToUser('user-1', { title: 'Hi', body: 'Test' }, 'ORDER_STATUS');

        expect(result).toEqual({ successCount: 0, failureCount: 0, staleTokens: [] });
        expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
});

describe('NotificationService.sendToUser — FCM success', () => {
    beforeEach(() => vi.clearAllMocks());

    it('calls sendEachForMulticast with the user token and returns the counts', async () => {
        const tokens = [{ token: 'device-token-abc', platform: 'ios' }];
        mockSendEachForMulticast.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ error: null }] });

        const svc = makeService({ getTokensByUserId: vi.fn().mockResolvedValue(tokens) });
        const result = await svc.sendToUser('user-1', { title: 'Order Ready', body: 'Pick it up!' }, 'ORDER_STATUS');

        expect(mockSendEachForMulticast).toHaveBeenCalledOnce();
        const call = mockSendEachForMulticast.mock.calls[0][0] as { tokens: string[]; notification: { title: string } };
        expect(call.tokens).toContain('device-token-abc');
        expect(call.notification.title).toBe('Order Ready');

        expect(result.successCount).toBe(1);
        expect(result.failureCount).toBe(0);
    });

    it('logs the notification to the repo after sending', async () => {
        const tokens = [{ token: 'tok-1', platform: 'android' }];
        mockSendEachForMulticast.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ error: null }] });

        const repo = makeRepo({ getTokensByUserId: vi.fn().mockResolvedValue(tokens) });
        const svc = new NotificationService(repo as unknown as NotificationRepository);
        await svc.sendToUser('user-2', { title: 'Hi', body: 'Hello' }, 'PROMO' as unknown as NotificationType);

        expect(repo.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user-2', title: 'Hi', type: 'PROMO' }),
        );
    });
});

describe('NotificationService.sendToUser — stale token cleanup', () => {
    beforeEach(() => vi.clearAllMocks());

    it('marks tokens as stale when FCM returns registration-token-not-registered', async () => {
        const tokens = [
            { token: 'valid-tok', platform: 'ios' },
            { token: 'stale-tok', platform: 'ios' },
        ];
        mockSendEachForMulticast.mockResolvedValue({
            successCount: 1,
            failureCount: 1,
            responses: [
                { error: null },
                { error: { code: 'messaging/registration-token-not-registered' } },
            ],
        });

        const repo = makeRepo({ getTokensByUserId: vi.fn().mockResolvedValue(tokens) });
        const svc = new NotificationService(repo as unknown as NotificationRepository);
        const result = await svc.sendToUser('user-3', { title: 'X', body: 'Y' }, 'ORDER_STATUS');

        expect(result.staleTokens).toContain('stale-tok');
        expect(repo.removeDeviceTokensByIds).toHaveBeenCalledWith(['stale-tok']);
    });

    it('marks tokens as stale for invalid-registration-token error code', async () => {
        const tokens = [{ token: 'bad-tok', platform: 'android' }];
        mockSendEachForMulticast.mockResolvedValue({
            successCount: 0,
            failureCount: 1,
            responses: [{ error: { code: 'messaging/invalid-registration-token' } }],
        });

        const repo = makeRepo({ getTokensByUserId: vi.fn().mockResolvedValue(tokens) });
        const svc = new NotificationService(repo as unknown as NotificationRepository);
        const result = await svc.sendToUser('user-4', { title: 'X', body: 'Y' }, 'ORDER_STATUS');

        expect(result.staleTokens).toContain('bad-tok');
    });

    it('does NOT add a token to staleTokens for other FCM error codes', async () => {
        const tokens = [{ token: 'rate-limited-tok', platform: 'android' }];
        mockSendEachForMulticast.mockResolvedValue({
            successCount: 0,
            failureCount: 1,
            responses: [{ error: { code: 'messaging/quota-exceeded' } }],
        });

        const repo = makeRepo({ getTokensByUserId: vi.fn().mockResolvedValue(tokens) });
        const svc = new NotificationService(repo as unknown as NotificationRepository);
        const result = await svc.sendToUser('user-5', { title: 'X', body: 'Y' }, 'ORDER_STATUS');

        expect(result.staleTokens).toHaveLength(0);
    });
});
