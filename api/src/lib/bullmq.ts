/**
 * Shared ioredis connection for BullMQ.
 *
 * BullMQ requires ioredis (not node-redis). This module provides a single
 * lazily-created connection reused across all queues and workers.
 */
import IORedis from 'ioredis';
import logger from '@/lib/logger';

let connection: IORedis | null = null;

export function getBullMQConnection(): IORedis {
    if (connection) return connection;

    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    connection = new IORedis(url, {
        maxRetriesPerRequest: null, // required by BullMQ
        enableReadyCheck: false,    // required by BullMQ
        lazyConnect: false,
    });

    connection.on('error', (err) => {
        logger.error({ err }, '[BullMQ] Redis connection error');
    });

    connection.on('connect', () => {
        logger.info('[BullMQ] Redis connected');
    });

    return connection;
}
