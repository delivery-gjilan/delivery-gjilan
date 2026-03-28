import { Counter, Gauge } from 'prom-client';
import logger from '@/lib/logger';
import { register, wsActiveUsersByRoleGauge } from '@/lib/metrics';

type EventLevel = 'info' | 'warn' | 'error';
type EventType =
    | 'ws_connect'
    | 'ws_disconnect'
    | 'subscribe_accept'
    | 'subscribe_reject'
    | 'subscribe_complete'
    | 'subscribe_error'
    | 'pubsub_publish_failure';

type RecentEvent = {
    at: string;
    level: EventLevel;
    type: EventType;
    socketId?: string;
    operationName?: string;
    topic?: string;
    detail: string;
};

type ConnectionState = {
    connectedAt: number;
    lastActivityAt: number;
    userId?: string;
    role?: string;
    ip?: string;
    hasAuth: boolean;
};

type SubscriptionState = {
    socketId: string;
    operationId: string;
    operationName: string;
    startedAt: number;
};

type AggregateTotals = {
    accepted: number;
    rejected: number;
    completed: number;
    errored: number;
};

const log = logger.child({ service: 'RealtimeMonitoring' });
const RECENT_EVENTS_LIMIT = 100;
const SUMMARY_INTERVAL_MS = 60_000;
const DEFAULT_OPERATION = 'anonymous';

const wsConnectionsActive = new Gauge({
    name: 'ws_connections_active',
    help: 'Current number of active websocket connections',
    registers: [register],
});

const wsConnectionsTotal = new Counter({
    name: 'ws_connections_total',
    help: 'Total number of websocket connections opened',
    labelNames: ['auth'],
    registers: [register],
});

const wsDisconnectsTotal = new Counter({
    name: 'ws_disconnects_total',
    help: 'Total number of websocket disconnections',
    registers: [register],
});

const graphqlSubscribeTotal = new Counter({
    name: 'graphql_subscribe_total',
    help: 'Total number of subscription attempts',
    labelNames: ['operation'],
    registers: [register],
});

const graphqlSubscribeRejectedTotal = new Counter({
    name: 'graphql_subscribe_rejected_total',
    help: 'Total number of rejected subscription attempts',
    labelNames: ['operation', 'reason'],
    registers: [register],
});

const graphqlSubscriptionsActive = new Gauge({
    name: 'graphql_subscriptions_active',
    help: 'Current number of active subscriptions by operation',
    labelNames: ['operation'],
    registers: [register],
});

const graphqlSubscriptionCompletedTotal = new Counter({
    name: 'graphql_subscription_completed_total',
    help: 'Total number of completed subscriptions',
    labelNames: ['operation'],
    registers: [register],
});

const graphqlSubscriptionErrorsTotal = new Counter({
    name: 'graphql_subscription_errors_total',
    help: 'Total number of subscription lifecycle errors',
    labelNames: ['operation', 'phase'],
    registers: [register],
});

const pubsubPublishedTotal = new Counter({
    name: 'pubsub_publish_total',
    help: 'Total number of pubsub publishes by topic family',
    labelNames: ['topic'],
    registers: [register],
});

const pubsubPublishFailuresTotal = new Counter({
    name: 'pubsub_publish_failures_total',
    help: 'Total number of pubsub publish failures by topic family',
    labelNames: ['topic'],
    registers: [register],
});

function normalizeOperationName(operationName?: string | null): string {
    if (!operationName || !operationName.trim()) {
        return DEFAULT_OPERATION;
    }

    return operationName.trim();
}

function pushRecentEvent(event: RecentEvent, recentEvents: RecentEvent[]): void {
    recentEvents.unshift(event);
    if (recentEvents.length > RECENT_EVENTS_LIMIT) {
        recentEvents.length = RECENT_EVENTS_LIMIT;
    }
}

function topicFamily(topic: string): string {
    const knownFamilies = [
        'order.byId.updated',
        'orders.byUser.changed',
        'orders.all.changed',
        'drivers.all.changed',
        'order.driver.live.changed',
        'driver.ptt.signal',
        'store.status.changed',
    ];

    const known = knownFamilies.find((family) => topic === family || topic.startsWith(`${family}.`));
    if (known) {
        return known;
    }

    const parts = topic.split('.');
    return parts.slice(0, Math.min(3, parts.length)).join('.');
}

class RealtimeMonitor {
    private connections = new Map<string, ConnectionState>();
    private subscriptions = new Map<string, SubscriptionState>();
    private activeByOperation = new Map<string, number>();
    private totalsByOperation = new Map<string, AggregateTotals>();
    private pubsubByTopic = new Map<string, { published: number; failures: number }>();
    private recentEvents: RecentEvent[] = [];
    private summaryInterval: NodeJS.Timeout | null = null;

    startSummaryLogging(): void {
        if (this.summaryInterval) {
            return;
        }

        this.summaryInterval = setInterval(() => {
            const summary = this.getSummary();
            if (summary.overview.activeConnections === 0 && summary.overview.activeSubscriptions === 0 && summary.overview.totalRejectedSubscriptions === 0 && summary.overview.totalSubscriptionErrors === 0) {
                return;
            }

            log.info(summary, 'realtime:summary');
        }, SUMMARY_INTERVAL_MS);
    }

    stopSummaryLogging(): void {
        if (!this.summaryInterval) {
            return;
        }

        clearInterval(this.summaryInterval);
        this.summaryInterval = null;
    }

    recordConnection(params: { socketId: string; userId?: string; role?: string; ip?: string; hasAuth: boolean }): void {
        const now = Date.now();
        this.connections.set(params.socketId, {
            connectedAt: now,
            lastActivityAt: now,
            userId: params.userId,
            role: params.role,
            ip: params.ip,
            hasAuth: params.hasAuth,
        });

        wsConnectionsActive.set(this.connections.size);
        wsConnectionsTotal.inc({ auth: params.hasAuth ? 'authenticated' : 'anonymous' });
        pushRecentEvent(
            {
                at: new Date(now).toISOString(),
                level: 'info',
                type: 'ws_connect',
                socketId: params.socketId,
                detail: params.hasAuth ? 'Websocket connected with auth context' : 'Websocket connected without auth context',
            },
            this.recentEvents,
        );
    }

    recordDisconnect(socketId: string, detail = 'Websocket disconnected'): void {
        const connection = this.connections.get(socketId);
        if (connection) {
            this.connections.delete(socketId);
        }

        for (const [operationId, subscription] of this.subscriptions.entries()) {
            if (subscription.socketId !== socketId) {
                continue;
            }

            this.subscriptions.delete(operationId);
            this.adjustActiveOperation(subscription.operationName, -1);
        }

        wsConnectionsActive.set(this.connections.size);
        wsDisconnectsTotal.inc();
        pushRecentEvent(
            {
                at: new Date().toISOString(),
                level: 'info',
                type: 'ws_disconnect',
                socketId,
                detail,
            },
            this.recentEvents,
        );
    }

    recordSubscribeAttempt(operationName?: string | null): void {
        graphqlSubscribeTotal.inc({ operation: normalizeOperationName(operationName) });
    }

    recordSubscribeAccepted(params: { socketId: string; operationId: string; operationName?: string | null }): void {
        const normalized = normalizeOperationName(params.operationName);
        this.subscriptions.set(params.operationId, {
            socketId: params.socketId,
            operationId: params.operationId,
            operationName: normalized,
            startedAt: Date.now(),
        });

        this.touchConnection(params.socketId);
        this.adjustActiveOperation(normalized, 1);
        this.ensureTotals(normalized).accepted += 1;
        pushRecentEvent(
            {
                at: new Date().toISOString(),
                level: 'info',
                type: 'subscribe_accept',
                socketId: params.socketId,
                operationName: normalized,
                detail: `Subscription accepted for ${normalized}`,
            },
            this.recentEvents,
        );
    }

    recordSubscribeRejected(params: { socketId?: string; operationName?: string | null; reason: string }): void {
        const normalized = normalizeOperationName(params.operationName);
        this.ensureTotals(normalized).rejected += 1;
        graphqlSubscribeRejectedTotal.inc({ operation: normalized, reason: params.reason });
        pushRecentEvent(
            {
                at: new Date().toISOString(),
                level: 'warn',
                type: 'subscribe_reject',
                socketId: params.socketId,
                operationName: normalized,
                detail: `Subscription rejected: ${params.reason}`,
            },
            this.recentEvents,
        );
    }

    recordSubscribeCompleted(params: { socketId?: string; operationId?: string; operationName?: string | null }): void {
        const resolved = this.resolveOperation(params.operationId, params.operationName);
        this.ensureTotals(resolved.operationName).completed += 1;
        graphqlSubscriptionCompletedTotal.inc({ operation: resolved.operationName });
        if (resolved.operationId) {
            this.subscriptions.delete(resolved.operationId);
            this.adjustActiveOperation(resolved.operationName, -1);
        }

        if (params.socketId) {
            this.touchConnection(params.socketId);
        }

        pushRecentEvent(
            {
                at: new Date().toISOString(),
                level: 'info',
                type: 'subscribe_complete',
                socketId: params.socketId,
                operationName: resolved.operationName,
                detail: `Subscription completed for ${resolved.operationName}`,
            },
            this.recentEvents,
        );
    }

    recordSubscribeError(params: { socketId?: string; operationId?: string; operationName?: string | null; phase: string; detail: string }): void {
        const resolved = this.resolveOperation(params.operationId, params.operationName);
        this.ensureTotals(resolved.operationName).errored += 1;
        graphqlSubscriptionErrorsTotal.inc({ operation: resolved.operationName, phase: params.phase });
        pushRecentEvent(
            {
                at: new Date().toISOString(),
                level: 'error',
                type: 'subscribe_error',
                socketId: params.socketId,
                operationName: resolved.operationName,
                detail: params.detail,
            },
            this.recentEvents,
        );
    }

    recordPubsubPublish(topic: string): void {
        const family = topicFamily(topic);
        const current = this.pubsubByTopic.get(family) ?? { published: 0, failures: 0 };
        current.published += 1;
        this.pubsubByTopic.set(family, current);
        pubsubPublishedTotal.inc({ topic: family });
    }

    recordPubsubPublishFailure(topic: string, detail: string): void {
        const family = topicFamily(topic);
        const current = this.pubsubByTopic.get(family) ?? { published: 0, failures: 0 };
        current.failures += 1;
        this.pubsubByTopic.set(family, current);
        pubsubPublishFailuresTotal.inc({ topic: family });
        pushRecentEvent(
            {
                at: new Date().toISOString(),
                level: 'error',
                type: 'pubsub_publish_failure',
                topic: family,
                detail,
            },
            this.recentEvents,
        );
    }

    getSummary() {
        const activeConnections = this.connections.size;
        const activeSubscriptions = this.subscriptions.size;
        const totalRejectedSubscriptions = Array.from(this.totalsByOperation.values()).reduce((sum, item) => sum + item.rejected, 0);
        const totalSubscriptionErrors = Array.from(this.totalsByOperation.values()).reduce((sum, item) => sum + item.errored, 0);
        const totalPubsubFailures = Array.from(this.pubsubByTopic.values()).reduce((sum, item) => sum + item.failures, 0);

        const status = totalSubscriptionErrors > 0 || totalPubsubFailures > 0 ? 'attention' : 'healthy';

        // Count active WebSocket connections by user role
        const activeByRole: Record<string, number> = {};
        for (const conn of this.connections.values()) {
            const role = conn.role ?? 'anonymous';
            activeByRole[role] = (activeByRole[role] ?? 0) + 1;
        }
        // Update Prometheus gauge
        wsActiveUsersByRoleGauge.reset();
        for (const [role, count] of Object.entries(activeByRole)) {
            wsActiveUsersByRoleGauge.set({ role }, count);
        }

        const explanation = [
            `There are currently ${activeConnections} websocket connection(s) and ${activeSubscriptions} active subscription(s).`,
            totalRejectedSubscriptions > 0
                ? `Since this process started, ${totalRejectedSubscriptions} subscription request(s) were rejected.`
                : 'No subscription requests have been rejected on this process yet.',
            totalSubscriptionErrors > 0
                ? `There have been ${totalSubscriptionErrors} subscription lifecycle error(s) on this process.`
                : 'No subscription lifecycle errors have been recorded on this process yet.',
            totalPubsubFailures > 0
                ? `Pubsub has recorded ${totalPubsubFailures} publish failure(s).`
                : 'No pubsub publish failures have been recorded on this process yet.',
        ];

        return {
            status,
            timestamp: new Date().toISOString(),
            activeByRole,
            overview: {
                activeConnections,
                activeSubscriptions,
                totalRejectedSubscriptions,
                totalSubscriptionErrors,
                totalPubsubFailures,
            },
            subscriptionsByOperation: Array.from(this.activeByOperation.entries())
                .map(([operationName, active]) => ({
                    operationName,
                    active,
                    totals: this.totalsByOperation.get(operationName) ?? { accepted: 0, rejected: 0, completed: 0, errored: 0 },
                }))
                .sort((left, right) => right.active - left.active || left.operationName.localeCompare(right.operationName)),
            pubsubByTopic: Array.from(this.pubsubByTopic.entries())
                .map(([topic, counts]) => ({ topic, ...counts }))
                .sort((left, right) => right.published - left.published || left.topic.localeCompare(right.topic)),
            recentEvents: this.recentEvents.slice(0, 20),
            explanation,
        };
    }

    getActiveConnections(): Array<{ socketId: string; userId?: string; role?: string; connectedAt: number; ip?: string }> {
        return Array.from(this.connections.entries()).map(([socketId, state]) => ({
            socketId,
            userId: state.userId,
            role: state.role,
            connectedAt: state.connectedAt,
            ip: state.ip,
        }));
    }

    private touchConnection(socketId: string): void {
        const current = this.connections.get(socketId);
        if (!current) {
            return;
        }

        current.lastActivityAt = Date.now();
    }

    private adjustActiveOperation(operationName: string, delta: number): void {
        const current = this.activeByOperation.get(operationName) ?? 0;
        const next = Math.max(0, current + delta);
        if (next === 0) {
            this.activeByOperation.delete(operationName);
            graphqlSubscriptionsActive.remove({ operation: operationName });
            return;
        }

        this.activeByOperation.set(operationName, next);
        graphqlSubscriptionsActive.set({ operation: operationName }, next);
    }

    private ensureTotals(operationName: string): AggregateTotals {
        const existing = this.totalsByOperation.get(operationName);
        if (existing) {
            return existing;
        }

        const created: AggregateTotals = { accepted: 0, rejected: 0, completed: 0, errored: 0 };
        this.totalsByOperation.set(operationName, created);
        return created;
    }

    private resolveOperation(operationId?: string, operationName?: string | null): { operationId?: string; operationName: string } {
        if (operationId) {
            const active = this.subscriptions.get(operationId);
            if (active) {
                return { operationId, operationName: active.operationName };
            }
        }

        return { operationId, operationName: normalizeOperationName(operationName) };
    }
}

export const realtimeMonitor = new RealtimeMonitor();