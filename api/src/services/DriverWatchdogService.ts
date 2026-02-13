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
      console.log('[DriverWatchdog] Already running');
      return;
    }

    this.isRunning = true;
    this.watchdogInterval = setInterval(() => {
      this.checkDriverStates().catch((error) => {
        console.error('[DriverWatchdog] Error during check:', error);
      });
    }, WATCHDOG_INTERVAL_MS);

    console.log(
      `[DriverWatchdog] Started (interval: ${WATCHDOG_INTERVAL_MS}ms, ` +
      `stale: ${CONNECTION_THRESHOLDS.STALE}s, lost: ${CONNECTION_THRESHOLDS.LOST}s)`
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
    console.log('[DriverWatchdog] Stopped');
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
        console.log(
          `[DriverWatchdog] Marked ${staleDrivers.length} driver(s) as STALE:`,
          staleDrivers.map(d => d.userId)
        );
      }

      if (lostDrivers.length > 0) {
        console.log(
          `[DriverWatchdog] Marked ${lostDrivers.length} driver(s) as LOST:`,
          lostDrivers.map(d => d.userId)
        );
      }

      // Publish updates if any state changed
      const totalChanges = staleDrivers.length + lostDrivers.length;
      if (totalChanges > 0) {
        await this.publishDriverUpdate();
      }

      // Periodic status log
      const allDrivers = await this.driverRepository.getAllDrivers();
      const counts = {
        CONNECTED: 0,
        STALE: 0,
        LOST: 0,
        DISCONNECTED: 0,
      };
      allDrivers.forEach(d => {
        counts[d.connectionStatus]++;
      });

      if (allDrivers.length > 0) {
        console.log(
          `[DriverWatchdog] Status: total=${allDrivers.length} ` +
          `connected=${counts.CONNECTED} stale=${counts.STALE} ` +
          `lost=${counts.LOST} disconnected=${counts.DISCONNECTED}`
        );
      }
    } catch (error) {
      console.error('[DriverWatchdog] Check failed:', error);
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
      console.error('[DriverWatchdog] Failed to publish update:', error);
    }
  }

  /**
   * Force an immediate check (useful for testing)
   */
  async checkNow(): Promise<void> {
    await this.checkDriverStates();
  }
}
