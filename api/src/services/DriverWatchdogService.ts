// @ts-nocheck
/**
 * DriverWatchdogService
 * 
 * Runs every 10 seconds to check driver connection states:
 * - CONNECTED -> STALE (no heartbeat for 15s)
 * - STALE -> LOST (no heartbeat for 30s)
 * 
 * Publishes state changes via GraphQL subscriptions for admin dashboard.
 */

import { DriverRepository, CONNECTION_THRESHOLDS } from '@/repositories/DriverRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { pubsub, publish, topics } from '@/lib/pubsub';
import logger from '@/lib/logger';

const log = logger.child({ service: 'DriverWatchdog' });

const WATCHDOG_INTERVAL_MS = 10000; // Check every 10 seconds

export class DriverWatchdogService {
  private watchdogInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private driverRepository: DriverRepository,
    private authRepository: AuthRepository
  ) {}

  /**
   * Start the watchdog service
   */
  start(): void {
    if (this.isRunning) {
      log.debug('watchdog:alreadyRunning');
      return;
    }

    this.isRunning = true;
    this.watchdogInterval = setInterval(() => {
      this.checkDriverStates().catch((error) => {
        log.error({ err: error }, 'watchdog:check:error');
      });
    }, WATCHDOG_INTERVAL_MS);

    log.info(
      { intervalMs: WATCHDOG_INTERVAL_MS, staleThreshold: CONNECTION_THRESHOLDS.STALE, lostThreshold: CONNECTION_THRESHOLDS.LOST },
      'watchdog:started',
    );
  }

  /**
   * Stop the watchdog service
   */
  stop(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    this.isRunning = false;
    log.info('watchdog:stopped');
  }

  /**
   * Check all drivers and transition states as needed
   */
  private async checkDriverStates(): Promise<void> {
    try {
      // Mark CONNECTED -> STALE (15s no heartbeat)
      const staleDrivers = await this.driverRepository.markStaleDrivers();
      
      // Mark STALE/CONNECTED -> LOST (30s no heartbeat)
      const lostDrivers = await this.driverRepository.markLostDrivers();

      // Log state changes
      if (staleDrivers.length > 0) {
        log.info(
          { count: staleDrivers.length, driverIds: staleDrivers.map(d => d.userId) },
          'watchdog:marked:stale',
        );
      }

      if (lostDrivers.length > 0) {
        log.info(
          { count: lostDrivers.length, driverIds: lostDrivers.map(d => d.userId) },
          'watchdog:marked:lost',
        );
      }

      // Publish updates if any state changed
      const totalChanges = staleDrivers.length + lostDrivers.length;
      if (totalChanges > 0) {
        await this.publishDriverUpdate();
      }

      // Periodic status log — single COUNT(*) GROUP BY query, not a full table scan
      const counts = await this.driverRepository.getConnectionStatusCounts();
      const total = (counts.CONNECTED + counts.STALE + counts.LOST + counts.DISCONNECTED);

      if (total > 0) {
        log.debug(
          { total, connected: counts.CONNECTED, stale: counts.STALE, lost: counts.LOST, disconnected: counts.DISCONNECTED },
          'watchdog:status',
        );
      }
    } catch (error) {
      log.error({ err: error }, 'watchdog:check:failed');
    }
  }

  /**
   * Publish driver updates to GraphQL subscriptions
   */
  private async publishDriverUpdate(): Promise<void> {
    try {
      const drivers = await this.authRepository.findDrivers();
      publish(pubsub, topics.allDriversChanged(), { drivers });
    } catch (error) {
      log.error({ err: error }, 'watchdog:publish:error');
    }
  }

  /**
   * Force an immediate check (useful for testing)
   */
  async checkNow(): Promise<void> {
    await this.checkDriverStates();
  }
}
