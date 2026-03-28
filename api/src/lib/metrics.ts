import { collectDefaultMetrics, Registry, Histogram, Counter, Gauge } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestDuration = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status'],
	buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	registers: [register],
});

const httpRequestsTotal = new Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status'],
	registers: [register],
});

const graphqlOperationDuration = new Histogram({
	name: 'graphql_operation_duration_seconds',
	help: 'Duration of GraphQL operations in seconds',
	labelNames: ['operation_name', 'operation_type', 'status'],
	buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	registers: [register],
});

const graphqlOperationsTotal = new Counter({
	name: 'graphql_operations_total',
	help: 'Total number of GraphQL operations',
	labelNames: ['operation_name', 'operation_type', 'status'],
	registers: [register],
});

type GraphQLRequestBody = {
	operationName?: string;
	query?: string;
};

function normalizeRoute(req: Request): string {
	if (req.path === '/health' || req.path === '/ready' || req.path === '/metrics' || req.path === '/health/realtime') {
		return req.path;
	}

	return req.route?.path ?? req.path ?? 'unknown';
}

function normalizeGraphQLOperationName(name: unknown): string {
	if (typeof name !== 'string') {
		return 'anonymous';
	}

	const trimmed = name.trim();
	if (!trimmed) {
		return 'anonymous';
	}

	return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function inferGraphQLOperationType(query: unknown): string {
	if (typeof query !== 'string') {
		return 'unknown';
	}

	const normalized = query.trimStart();
	if (normalized.startsWith('{')) {
		return 'query';
	}

	const match = normalized.match(/^(query|mutation|subscription)\b/i);
	if (!match) {
		return 'unknown';
	}

	return match[1].toLowerCase();
}

function getGraphQLMeta(req: Request): { operationName: string; operationType: string } | null {
	if (req.path !== '/graphql') {
		return null;
	}

	const body = req.body as GraphQLRequestBody | GraphQLRequestBody[] | undefined;
	const operation = Array.isArray(body) ? body[0] : body;

	return {
		operationName: normalizeGraphQLOperationName(operation?.operationName),
		operationType: inferGraphQLOperationType(operation?.query),
	};
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
	const end = httpRequestDuration.startTimer();
	const graphqlMeta = getGraphQLMeta(req);
	const graphqlEnd = graphqlMeta ? graphqlOperationDuration.startTimer() : null;

	res.on('finish', () => {
		const labels = {
			method: req.method,
			route: normalizeRoute(req),
			status: String(res.statusCode),
		};
		end(labels);
		httpRequestsTotal.inc(labels);

		if (graphqlMeta && graphqlEnd) {
			const status = res.statusCode >= 400 ? 'http_error' : 'ok';
			const graphqlLabels = {
				operation_name: graphqlMeta.operationName,
				operation_type: graphqlMeta.operationType,
				status,
			};
			graphqlEnd(graphqlLabels);
			graphqlOperationsTotal.inc(graphqlLabels);
		}
	});

	next();
}

export async function metricsEndpoint(_req: Request, res: Response) {
	res.set('Content-Type', register.contentType);
	res.end(await register.metrics());
}

// ── Fleet & pipeline gauges (updated by /health/ops-wall on each poll) ──────

export const driversByConnectionStatusGauge = new Gauge({
	name: 'drivers_by_connection_status',
	help: 'Number of drivers by connection status (CONNECTED, STALE, LOST, DISCONNECTED)',
	labelNames: ['status'],
	registers: [register],
});

export const businessDevicesByOnlineStatusGauge = new Gauge({
	name: 'business_devices_by_online_status',
	help: 'Number of business devices by online status (ONLINE, STALE, OFFLINE)',
	labelNames: ['status'],
	registers: [register],
});

export const ordersByStatusGauge = new Gauge({
	name: 'orders_by_status',
	help: 'Number of active and recently completed orders by status',
	labelNames: ['status'],
	registers: [register],
});

export const ordersStuckGauge = new Gauge({
	name: 'orders_stuck_total',
	help: 'Number of stuck orders by type (pending_no_assignment, ready_no_pickup, out_for_delivery_too_long)',
	labelNames: ['type'],
	registers: [register],
});

export const wsActiveUsersByRoleGauge = new Gauge({
	name: 'ws_active_users_by_role',
	help: 'Number of active WebSocket connections by user role (CUSTOMER, DRIVER, BUSINESS_OWNER, BUSINESS_EMPLOYEE, ADMIN, SUPER_ADMIN, anonymous)',
	labelNames: ['role'],
	registers: [register],
});

export const pushNotificationsSentTotal = new Counter({
	name: 'push_notifications_sent_total',
	help: 'Total push notification delivery attempts by app type and platform',
	labelNames: ['app_type', 'platform'],
	registers: [register],
});

export const pushNotificationsProviderAcceptedTotal = new Counter({
	name: 'push_notifications_provider_accepted_total',
	help: 'Total push notifications accepted by provider (Firebase/APNs bridge)',
	labelNames: ['app_type', 'platform'],
	registers: [register],
});

export const pushNotificationsProviderFailedTotal = new Counter({
	name: 'push_notifications_provider_failed_total',
	help: 'Total push notifications rejected/failed by provider',
	labelNames: ['app_type', 'platform', 'reason'],
	registers: [register],
});

export const pushTelemetryEventsTotal = new Counter({
	name: 'push_telemetry_events_total',
	help: 'Total client push telemetry events',
	labelNames: ['app_type', 'platform', 'event_type'],
	registers: [register],
});

export const pushNotificationsOpenedTotal = new Counter({
	name: 'push_notifications_opened_total',
	help: 'Total client-reported push open events',
	labelNames: ['app_type', 'platform'],
	registers: [register],
});

export const pushNotificationsActionedTotal = new Counter({
	name: 'push_notifications_actioned_total',
	help: 'Total client-reported push action tap events',
	labelNames: ['app_type', 'platform', 'action_id'],
	registers: [register],
});
