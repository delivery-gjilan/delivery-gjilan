import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';

const isProduction = process.env.NODE_ENV === 'production';

// Ensure the logs directory exists (Promtail reads from here)
const LOG_DIR = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, 'api.log');

const baseOptions: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
        censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: 'delivery-api' },
};

/**
 * Root Pino logger.
 *
 * In **development** -> pretty-prints to stdout via pino-pretty transport.
 * In **production** -> writes JSON to stdout AND `logs/api.log` via pino.multistream()
 *   using pino.destination() (no thread-stream worker threads, safe in bundled builds).
 *   - stdout  -> visible in `docker logs` / process manager
 *   - file    -> consumed by Promtail -> Loki -> Grafana
 */
export const logger = isProduction
    ? pino(
          baseOptions,
          pino.multistream([
              { stream: pino.destination({ dest: 1, sync: false }) },
              { stream: pino.destination({ dest: LOG_FILE, sync: false, mkdir: true }) },
          ]),
      )
    : pino({
          ...baseOptions,
          transport: {
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
