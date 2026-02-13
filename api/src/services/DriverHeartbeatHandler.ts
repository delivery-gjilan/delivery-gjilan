/**
 * DriverHeartbeatHandler
 * 
 * Handles application-level heartbeats from drivers.
 * 
 * Features:
 * - Accepts heartbeat every 5 seconds
 * - Throttles location DB writes to every 10 seconds
 * - Skips location write if position hasn't changed significantly
 * - Updates connectionStatus to CONNECTED
 * - Publishes updates via GraphQL subscriptions
 */

import { DriverRepository, CONNECTION_THRESHOLDS } from '@/repositories/DriverRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { pubsub, publish, topics } from '@/lib/pubsub';
import { DbDriver } from '@/database/schema/drivers';

// Haversine distance calculation (returns meters)
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface HeartbeatPayload {
  driverId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
}

export interface HeartbeatResult {
  success: boolean;
  connectionStatus: string;
  locationUpdated: boolean;
  lastHeartbeatAt: string;
}

export class DriverHeartbeatHandler {
  constructor(
    private driverRepository: DriverRepository,
    private authRepository: AuthRepository
  ) {}

  /**
   * Process heartbeat from driver
   * 
   * @param userId - Driver's user ID
   * @param latitude - Current latitude
   * @param longitude - Current longitude
   * @returns HeartbeatResult with status
   */
  async processHeartbeat(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<HeartbeatResult> {
    const now = new Date();
    
    // Get current driver state
    let driver = await this.driverRepository.getDriverByUserId(userId);
    
    // Create driver profile if not exists
    if (!driver) {
      driver = await this.driverRepository.createDriver(userId);
    }

    // Determine if we should update location in DB
    const shouldUpdateLocation = this.shouldUpdateLocation(driver, latitude, longitude, now);

    // Process heartbeat (always updates lastHeartbeatAt and connectionStatus)
    const wasDisconnected = driver.connectionStatus === 'DISCONNECTED' || 
                            driver.connectionStatus === 'LOST' ||
                            driver.connectionStatus === 'STALE';

    const updatedDriver = await this.driverRepository.processHeartbeat(
      userId,
      latitude,
      longitude,
      shouldUpdateLocation
    );

    if (shouldUpdateLocation) {
      try {
        await this.authRepository.updateDriverLocation(userId, latitude, longitude);
      } catch (error) {
        console.warn('[HeartbeatHandler] Failed to sync user driver location:', error);
      }
    }

    if (!updatedDriver) {
      return {
        success: false,
        connectionStatus: 'DISCONNECTED',
        locationUpdated: false,
        lastHeartbeatAt: now.toISOString(),
      };
    }

    // Publish update if status changed (e.g., reconnection)
    if (wasDisconnected) {
      console.log(`[HeartbeatHandler] Driver ${userId} reconnected (was ${driver.connectionStatus})`);
      await this.publishDriverUpdate();
    }

    return {
      success: true,
      connectionStatus: updatedDriver.connectionStatus,
      locationUpdated: shouldUpdateLocation,
      lastHeartbeatAt: updatedDriver.lastHeartbeatAt || now.toISOString(),
    };
  }

  /**
   * Determine if location should be written to DB
   * 
   * Conditions to update:
   * 1. No previous location update (first time)
   * 2. Last location update was > 10 seconds ago
   * 3. Position has changed by more than 5 meters
   */
  private shouldUpdateLocation(
    driver: DbDriver,
    newLat: number,
    newLng: number,
    now: Date
  ): boolean {
    // First time - always update
    if (!driver.lastLocationUpdate || !driver.driverLat || !driver.driverLng) {
      return true;
    }

    const lastUpdateTime = new Date(driver.lastLocationUpdate);
    const timeSinceUpdate = (now.getTime() - lastUpdateTime.getTime()) / 1000;

    // Time-based throttle: update if > 10 seconds
    if (timeSinceUpdate >= CONNECTION_THRESHOLDS.LOCATION_THROTTLE) {
      return true;
    }

    // Distance-based: update if moved > 5 meters
    const distance = haversineDistance(
      driver.driverLat,
      driver.driverLng,
      newLat,
      newLng
    );

    if (distance >= CONNECTION_THRESHOLDS.LOCATION_DISTANCE_METERS) {
      return true;
    }

    return false;
  }

  /**
   * Publish driver updates to GraphQL subscriptions
   */
  private async publishDriverUpdate(): Promise<void> {
    try {
      const drivers = await this.authRepository.findDrivers();
      publish(pubsub, topics.allDriversChanged(), { drivers });
    } catch (error) {
      console.error('[HeartbeatHandler] Failed to publish update:', error);
    }
  }

  /**
   * Handle driver disconnection (subscription closed)
   */
  async handleDisconnect(userId: string): Promise<void> {
    console.log(`[HeartbeatHandler] Driver ${userId} disconnected`);
    
    await this.driverRepository.markDriverDisconnected(userId);
    await this.publishDriverUpdate();
  }

  /**
   * Handle driver reconnection
   */
  async handleReconnect(userId: string): Promise<DbDriver | undefined> {
    console.log(`[HeartbeatHandler] Driver ${userId} reconnecting`);
    
    const driver = await this.driverRepository.restoreDriverSession(userId);
    await this.publishDriverUpdate();
    
    return driver;
  }
}
