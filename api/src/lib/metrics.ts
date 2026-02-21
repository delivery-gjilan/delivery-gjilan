/**
 * Prometheus metrics endpoint — STUB
 *
 * When you're ready to add Prometheus metrics:
 *
 * 1. Install:  npm install prom-client
 *
 * 2. Uncomment the code below and import in index.ts:
 *    import { metricsMiddleware, metricsEndpoint } from '@/lib/metrics';
 *    app.use(metricsMiddleware);
 *    app.get('/metrics', metricsEndpoint);
 *
 * 3. Add a Prometheus scrape target + Grafana datasource.
 *
 * Built-in metrics you'll get for free:
 *   - http_request_duration_seconds (histogram)
 *   - http_requests_total (counter, by method + status + path)
 *   - nodejs_heap_size_bytes, nodejs_active_handles, etc.
 */

// import { collectDefaultMetrics, Registry, Histogram, Counter } from 'prom-client';
// import type { Request, Response, NextFunction } from 'express';
//
// const register = new Registry();
// collectDefaultMetrics({ register });
//
// const httpRequestDuration = new Histogram({
//     name: 'http_request_duration_seconds',
//     help: 'Duration of HTTP requests in seconds',
//     labelNames: ['method', 'route', 'status'],
//     buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
//     registers: [register],
// });
//
// const httpRequestsTotal = new Counter({
//     name: 'http_requests_total',
//     help: 'Total number of HTTP requests',
//     labelNames: ['method', 'route', 'status'],
//     registers: [register],
// });
//
// export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
//     const end = httpRequestDuration.startTimer();
//     res.on('finish', () => {
//         const route = req.route?.path ?? req.path;
//         const labels = { method: req.method, route, status: String(res.statusCode) };
//         end(labels);
//         httpRequestsTotal.inc(labels);
//     });
//     next();
// }
//
// export async function metricsEndpoint(_req: Request, res: Response) {
//     res.set('Content-Type', register.contentType);
//     res.end(await register.metrics());
// }

export {};
