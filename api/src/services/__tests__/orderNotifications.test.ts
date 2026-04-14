/**
 * Unit tests for orderNotifications.ts fire-and-forget helpers.
 *
 * These functions are thin wrappers that build a NotificationPayload and
 * dispatch it via the NotificationService (fire-and-forget with .catch).
 * Tests verify:
 *
 * 1. notifyCustomerOrderStatus
 *    – Known statuses (PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED) each
 *      call sendToUser with the correct payload shape and notification type.
 *    – An unknown status does NOT call sendToUser.
 *    – OUT_FOR_DELIVERY / DELIVERED / CANCELLED set timeSensitive: true.
 *    – PREPARING sets timeSensitive: false.
 *    – The orderId is injected into the notification data.
 *
 * 2. notifyDriverNewAdminMessage
 *    – Uses sendToUserByAppType with appType 'DRIVER'.
 *    – URGENT → timeSensitive: true, relevanceScore: 1.0.
 *    – INFO   → timeSensitive: false, relevanceScore: 0.5.
 *    – WARNING → timeSensitive: true, relevanceScore: 0.8.
 *
 * 3. notifyBusinessUserNewAdminMessage
 *    – Uses sendToUserByAppType with appType 'BUSINESS'.
 *    – Same alert-type / timeSensitive mapping as #2.
 *
 * All NotificationService methods are mocked with vi.fn() — no real DB or FCM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    notifyCustomerOrderStatus,
    notifyDriverNewAdminMessage,
    notifyBusinessUserNewAdminMessage,
} from '../orderNotifications';
import type { NotificationService } from '../NotificationService';

vi.mock('@/lib/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    },
}));

vi.mock('@/lib/cache', () => ({
    cache: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
    },
}));

// ── mock NotificationService instance ────────────────────────────────────────

function makeNotificationService() {
    return {
        sendToUser: vi.fn().mockResolvedValue({ successCount: 1, failureCount: 0, staleTokens: [] }),
        sendToUserByAppType: vi.fn().mockResolvedValue({ successCount: 1, failureCount: 0, staleTokens: [] }),
        sendLiveActivityUpdate: vi.fn().mockResolvedValue(undefined),
        endLiveActivities: vi.fn().mockResolvedValue(undefined),
    };
}

/** Wait for the fire-and-forget promise to settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// ──────────────────────────────────────────────────────────────────────────────
// 1. notifyCustomerOrderStatus
// ──────────────────────────────────────────────────────────────────────────────

describe('notifyCustomerOrderStatus', () => {
    let svc: ReturnType<typeof makeNotificationService>;

    beforeEach(() => {
        svc = makeNotificationService();
    });

    const KNOWN_STATUSES = ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;

    for (const status of KNOWN_STATUSES) {
        it(`calls sendToUser for STATUS=${status}`, async () => {
            notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', status);
            await flush();
            expect(svc.sendToUser).toHaveBeenCalledOnce();
        });

        it(`passes the orderId in data for STATUS=${status}`, async () => {
            notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', status);
            await flush();
            const [[, payload]] = svc.sendToUser.mock.calls;
            expect(payload.data?.orderId).toBe('order-abc');
        });

        it(`uses notification type ORDER_STATUS for ${status}`, async () => {
            notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', status);
            await flush();
            const [[, , type]] = svc.sendToUser.mock.calls;
            expect(type).toBe('ORDER_STATUS');
        });
    }

    it('does NOT call sendToUser for an unknown status', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'TOTALLY_UNKNOWN');
        await flush();
        expect(svc.sendToUser).not.toHaveBeenCalled();
    });

    it('sets timeSensitive: false for PREPARING', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'PREPARING');
        await flush();
        const [[, payload]] = svc.sendToUser.mock.calls;
        expect(payload.timeSensitive).toBe(false);
    });

    it('sets timeSensitive: true for OUT_FOR_DELIVERY', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'OUT_FOR_DELIVERY');
        await flush();
        const [[, payload]] = svc.sendToUser.mock.calls;
        expect(payload.timeSensitive).toBe(true);
    });

    it('sets timeSensitive: true for DELIVERED', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'DELIVERED');
        await flush();
        const [[, payload]] = svc.sendToUser.mock.calls;
        expect(payload.timeSensitive).toBe(true);
    });

    it('sets timeSensitive: true for CANCELLED', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'CANCELLED');
        await flush();
        const [[, payload]] = svc.sendToUser.mock.calls;
        expect(payload.timeSensitive).toBe(true);
    });

    it('sends to the correct customerId', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-xyz', 'order-abc', 'DELIVERED');
        await flush();
        const [[userId]] = svc.sendToUser.mock.calls;
        expect(userId).toBe('customer-xyz');
    });

    it('includes both English and Albanian localeContent', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'DELIVERED');
        await flush();
        const [[, payload]] = svc.sendToUser.mock.calls;
        expect(payload.localeContent?.en).toBeDefined();
        expect(payload.localeContent?.al).toBeDefined();
    });

    it('relevanceScore for DELIVERED is 1.0', async () => {
        notifyCustomerOrderStatus(svc as unknown as NotificationService, 'customer-1', 'order-abc', 'DELIVERED');
        await flush();
        const [[, payload]] = svc.sendToUser.mock.calls;
        expect(payload.relevanceScore).toBe(1.0);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. notifyDriverNewAdminMessage
// ──────────────────────────────────────────────────────────────────────────────

describe('notifyDriverNewAdminMessage', () => {
    let svc: ReturnType<typeof makeNotificationService>;

    beforeEach(() => {
        svc = makeNotificationService();
    });

    it('calls sendToUserByAppType with appType DRIVER', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'driver-1', 'Pick up order', 'INFO');
        await flush();
        const [[, appType]] = svc.sendToUserByAppType.mock.calls;
        expect(appType).toBe('DRIVER');
    });

    it('sends to the correct driverId', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'driver-99', 'Test msg', 'INFO');
        await flush();
        const [[driverId]] = svc.sendToUserByAppType.mock.calls;
        expect(driverId).toBe('driver-99');
    });

    it('uses notification type ADMIN_ALERT', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'drv-1', 'msg', 'INFO');
        await flush();
        const [[, , , type]] = svc.sendToUserByAppType.mock.calls;
        expect(type).toBe('ADMIN_ALERT');
    });

    it('URGENT sets timeSensitive: true and relevanceScore: 1.0', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'drv-1', 'Urgent!', 'URGENT');
        await flush();
        const [[, , payload]] = svc.sendToUserByAppType.mock.calls;
        expect(payload.timeSensitive).toBe(true);
        expect(payload.relevanceScore).toBe(1.0);
    });

    it('WARNING sets timeSensitive: true and relevanceScore: 0.8', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'drv-1', 'Warning!', 'WARNING');
        await flush();
        const [[, , payload]] = svc.sendToUserByAppType.mock.calls;
        expect(payload.timeSensitive).toBe(true);
        expect(payload.relevanceScore).toBe(0.8);
    });

    it('INFO sets timeSensitive: false and relevanceScore: 0.5', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'drv-1', 'FYI', 'INFO');
        await flush();
        const [[, , payload]] = svc.sendToUserByAppType.mock.calls;
        expect(payload.timeSensitive).toBe(false);
        expect(payload.relevanceScore).toBe(0.5);
    });

    it('puts the message body in the notification body', async () => {
        notifyDriverNewAdminMessage(svc as unknown as NotificationService, 'drv-1', 'Zone A is busy', 'INFO');
        await flush();
        const [[, , payload]] = svc.sendToUserByAppType.mock.calls;
        expect(payload.body).toBe('Zone A is busy');
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. notifyBusinessUserNewAdminMessage
// ──────────────────────────────────────────────────────────────────────────────

describe('notifyBusinessUserNewAdminMessage', () => {
    let svc: ReturnType<typeof makeNotificationService>;

    beforeEach(() => {
        svc = makeNotificationService();
    });

    it('calls sendToUserByAppType with appType BUSINESS', async () => {
        notifyBusinessUserNewAdminMessage(svc as unknown as NotificationService, 'biz-user-1', 'Hello', 'INFO');
        await flush();
        const [[, appType]] = svc.sendToUserByAppType.mock.calls;
        expect(appType).toBe('BUSINESS');
    });

    it('sends to the correct businessUserId', async () => {
        notifyBusinessUserNewAdminMessage(svc as unknown as NotificationService, 'biz-user-99', 'Hello', 'INFO');
        await flush();
        const [[userId]] = svc.sendToUserByAppType.mock.calls;
        expect(userId).toBe('biz-user-99');
    });

    it('URGENT sets timeSensitive: true', async () => {
        notifyBusinessUserNewAdminMessage(svc as unknown as NotificationService, 'biz-user-1', 'Critical!', 'URGENT');
        await flush();
        const [[, , payload]] = svc.sendToUserByAppType.mock.calls;
        expect(payload.timeSensitive).toBe(true);
    });

    it('INFO sets timeSensitive: false', async () => {
        notifyBusinessUserNewAdminMessage(svc as unknown as NotificationService, 'biz-user-1', 'FYI', 'INFO');
        await flush();
        const [[, , payload]] = svc.sendToUserByAppType.mock.calls;
        expect(payload.timeSensitive).toBe(false);
    });

    it('uses notification type ADMIN_ALERT', async () => {
        notifyBusinessUserNewAdminMessage(svc as unknown as NotificationService, 'biz-user-1', 'msg', 'INFO');
        await flush();
        const [[, , , type]] = svc.sendToUserByAppType.mock.calls;
        expect(type).toBe('ADMIN_ALERT');
    });
});
