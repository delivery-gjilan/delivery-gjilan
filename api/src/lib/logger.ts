import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';

const isProduction = process.env.NODE_ENV === 'production';

// Ensure the logs directory exists (Promtail reads from here)
const LOG_DIR = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, 'api.log');

/**
 * Root Pino logger.
 *
 * In **development** → pretty-prints to stdout via pino-pretty.
 * In **production** → writes JSON to both stdout AND `logs/api.log`.
 *   - stdout  → visible in `docker logs` / process manager
 *   - file    → consumed by Promtail → Loki → Grafana
 *
 * Every child logger inherits requestId / userId so correlation is automatic.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    // Redact sensitive fields
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
        censor: '[REDACTED]',
    },
    // Uniform timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Add service name for Loki label filtering
    base: { service: 'delivery-api' },
    transport: isProduction
        ? {
              targets: [
                  // 1. stdout (for docker logs / process managers)
                  { target: 'pino/file', options: { destination: 1 }, level: 'info' },
                  // 2. log file (for Promtail → Loki)
                  { target: 'pino/file', options: { destination: LOG_FILE, mkdir: true }, level: 'info' },
              ],
          }
        : {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname,service',
              },
          },
});

export type Logger = pino.Logger;
export default logger;
