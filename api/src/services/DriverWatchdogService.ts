/**
 * DriverWatchdogService
 * 
 * Runs every 10 seconds to check driver connection states:
 * - CONNECTED -> STALE (no heartbeat for 45s)
 * - STALE -> LOST (no heartbeat for 90s)
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
  private staleTimers = new Map<string, NodeJS.Timeout>();
  private lostTimers = new Map<string, NodeJS.Timeout>();

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
    this.clearAllTimers();
    this.isRunning = false;
    log.info('watchdog:stopped');
  }

  /**
   * Track a heartbeat in realtime by scheduling per-driver stale/lost transitions.
   * The periodic watchdog remains as a fallback reconciliation pass.
   */
  trackHeartbeat(userId: string, heartbeatAtIso?: string): void {
    const heartbeatMs = heartbeatAtIso ? new Date(heartbeatAtIso).getTime() : Date.now();
    const nowMs = Date.now();

    const staleDelay = Math.max(0, heartbeatMs + CONNECTION_THRESHOLDS.STALE * 1000 - nowMs);
    const lostDelay = Math.max(0, heartbeatMs + CONNECTION_THRESHOLDS.LOST * 1000 - nowMs);

    this.clearDriverTimers(userId);

    const staleTimer = setTimeout(() => {
      this.markDriverStaleNow(userId).catch((error) => {
        log.error({ err: error, userId }, 'watchdog:timer:stale:error');
      });
    }, staleDelay);

    const lostTimer = setTimeout(() => {
      this.markDriverLostNow(userId).catch((error) => {
        log.error({ err: error, userId }, 'watchdog:timer:lost:error');
      });
    }, lostDelay);

    this.staleTimers.set(userId, staleTimer);
    this.lostTimers.set(userId, lostTimer);
  }

  /**
   * Clear timers when driver disconnects or leaves active tracking.
   */
  clearDriverTracking(userId: string): void {
    this.clearDriverTimers(userId);
  }

  /**
   * Check all drivers and transition states as needed
   */
  private async checkDriverStates(): Promise<void> {
    try {
      // Mark CONNECTED -> STALE (45s no heartbeat)
      const staleDrivers = await this.driverRepository.markStaleDrivers();
      
      // Mark STALE/CONNECTED -> LOST (90s no heartbeat)
      const lostDrivers = await this.driverRepository.markLostDrivers();

      staleDrivers.forEach((driver) => {
        this.staleTimers.delete(driver.userId);
      });

      lostDrivers.forEach((driver) => {
        this.clearDriverTimers(driver.userId);
      });

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
        const changedDriverIds = Array.from(new Set([
          ...staleDrivers.map((d) => d.userId),
          ...lostDrivers.map((d) => d.userId),
        ]));
        await this.publishDriverUpdate(changedDriverIds);
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
  private async publishDriverUpdate(userIds: string[]): Promise<void> {
    try {
      if (userIds.length === 0) return;
      const drivers = await this.authRepository.findDriversByIds(userIds);
      if (drivers.length === 0) return;
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

  private clearDriverTimers(userId: string): void {
    const staleTimer = this.staleTimers.get(userId);
    if (staleTimer) {
      clearTimeout(staleTimer);
      this.staleTimers.delete(userId);
    }

    const lostTimer = this.lostTimers.get(userId);
    if (lostTimer) {
      clearTimeout(lostTimer);
      this.lostTimers.delete(userId);
    }
  }

  private clearAllTimers(): void {
    this.staleTimers.forEach((timer) => clearTimeout(timer));
    this.lostTimers.forEach((timer) => clearTimeout(timer));
    this.staleTimers.clear();
    this.lostTimers.clear();
  }

  private async markDriverStaleNow(userId: string): Promise<void> {
    this.staleTimers.delete(userId);
    const updated = await this.driverRepository.markDriverStaleIfExpired(userId);
    if (updated) {
      log.info({ userId }, 'watchdog:timer:marked:stale');
      await this.publishDriverUpdate([userId]);
    }
  }

  private async markDriverLostNow(userId: string): Promise<void> {
    this.lostTimers.delete(userId);
    const updated = await this.driverRepository.markDriverLostIfExpired(userId);
    if (updated) {
      log.info({ userId }, 'watchdog:timer:marked:lost');
      await this.publishDriverUpdate([userId]);
    }
  }
}
