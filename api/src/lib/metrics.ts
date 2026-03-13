import { collectDefaultMetrics, Registry, Histogram, Counter } from 'prom-client';
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
