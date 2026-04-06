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
import { pubsub, publish, topics, type OrderDriverLiveTrackingPayload } from '@/lib/pubsub';
import { DbDriver } from '@/database/schema/drivers';
import { orders as ordersTable } from '@/database/schema';
import { getDB } from '@/database';
import { eq } from 'drizzle-orm';
import { clearLiveDriverEta, setLiveDriverEta } from '@/lib/driverEtaCache';
import { cache } from '@/lib/cache';
import { updateLiveActivity } from '@/services/orderNotifications';
import type { NotificationService } from '@/services/NotificationService';
import logger from '@/lib/logger';

const log = logger.child({ service: 'HeartbeatHandler' });

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

export interface HeartbeatEtaPayload {
  activeOrderId?: string | null;
  navigationPhase?: string | null;
  remainingEtaSeconds?: number | null;
}

/** Heartbeat-specific Live Activity update interval (seconds). */
const HEARTBEAT_LA_UPDATE_INTERVAL_S = 90;

export class DriverHeartbeatHandler {
  constructor(
    private driverRepository: DriverRepository,
    private authRepository: AuthRepository,
    private notificationService?: NotificationService,
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
    longitude: number,
    etaPayload?: HeartbeatEtaPayload
  ): Promise<HeartbeatResult> {
    const now = new Date();
    
    // Get current driver state
    let driver = await this.driverRepository.getDriverByUserId(userId);
    
    // Create driver profile if not exists
    if (!driver) {
      driver = await this.driverRepository.createDriver(userId);
    }

    // Always write location to DB on every heartbeat so the
    // driversUpdated subscription carries fresh coordinates for the
    // admin map in real-time (no throttle gate).
    const shouldUpdateLocation = true;

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

    if (!updatedDriver) {
      return {
        success: false,
        connectionStatus: 'DISCONNECTED',
        locationUpdated: false,
        lastHeartbeatAt: now.toISOString(),
      };
    }

    if (
      etaPayload?.activeOrderId &&
      etaPayload.remainingEtaSeconds != null &&
      Number.isFinite(etaPayload.remainingEtaSeconds)
    ) {
      await setLiveDriverEta(userId, {
        activeOrderId: etaPayload.activeOrderId,
        navigationPhase: etaPayload.navigationPhase ?? null,
        remainingEtaSeconds: Math.max(0, Math.round(etaPayload.remainingEtaSeconds)),
        etaUpdatedAt: now.toISOString(),
      });
    } else {
      await clearLiveDriverEta(userId);
    }

    // ── Periodic Live Activity ETA update during delivery ──
    if (
      this.notificationService &&
      etaPayload?.activeOrderId &&
      etaPayload.navigationPhase === 'to_dropoff' &&
      etaPayload.remainingEtaSeconds != null &&
      etaPayload.remainingEtaSeconds > 0
    ) {
      this.maybePushLiveActivityEta(
        userId,
        etaPayload.activeOrderId,
        Math.ceil(etaPayload.remainingEtaSeconds / 60),
      );
    }

    if (etaPayload?.activeOrderId) {
      this.publishOrderDriverLiveTracking({
        orderId: etaPayload.activeOrderId,
        driverId: userId,
        latitude,
        longitude,
        navigationPhase: etaPayload.navigationPhase ?? null,
        remainingEtaSeconds:
          etaPayload.remainingEtaSeconds != null && Number.isFinite(etaPayload.remainingEtaSeconds)
            ? Math.max(0, Math.round(etaPayload.remainingEtaSeconds))
            : null,
        etaUpdatedAt: now.toISOString(),
      });
    }

    // Publish updates when reconnecting or when location/state changed.
    // Active deliveries always write to DB above, so shouldUpdateLocation covers them.
    if (wasDisconnected || shouldUpdateLocation) {
      if (wasDisconnected) {
        log.info({ userId, previousStatus: driver.connectionStatus }, 'heartbeat:reconnected');
      }
      await this.publishDriverUpdate([userId]);
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
  private async publishDriverUpdate(driverIds: string[]): Promise<void> {
    try {
      if (driverIds.length === 0) return;
      const drivers = await this.authRepository.findDriversByIds(driverIds);
      if (drivers.length === 0) return;
      publish(pubsub, topics.allDriversChanged(), { drivers } as any);
    } catch (error) {
      log.error({ err: error }, 'heartbeat:publish:error');
    }
  }

  /**
   * Publish granular per-order live tracking updates for customer map subscriptions.
   */
  private publishOrderDriverLiveTracking(payload: OrderDriverLiveTrackingPayload): void {
    try {
      publish(pubsub, topics.orderDriverLiveChanged(payload.orderId), payload);
    } catch (error) {
      log.error({ err: error, orderId: payload.orderId, driverId: payload.driverId }, 'heartbeat:publish:orderLive:error');
    }
  }

  /**
   * Handle driver disconnection (subscription closed)
   */
  async handleDisconnect(userId: string): Promise<void> {
    log.info({ userId }, 'heartbeat:disconnect');
    
    await this.driverRepository.markDriverDisconnected(userId);
    await this.publishDriverUpdate([userId]);
  }

  /**
   * Handle driver reconnection
   */
  async handleReconnect(userId: string): Promise<DbDriver | undefined> {
    log.info({ userId }, 'heartbeat:reconnecting');
    
    const driver = await this.driverRepository.restoreDriverSession(userId);
    await this.publishDriverUpdate([userId]);
    
    return driver;
  }

  /**
   * Fire-and-forget Live Activity ETA push, throttled to once per ~90 s per order.
   * The downstream `sendLiveActivityUpdate` has its own 15 s / 1-min-delta gate as a second layer.
   */
  private maybePushLiveActivityEta(
    userId: string,
    orderId: string,
    estimatedMinutes: number,
  ): void {
    const gateKey = `cache:la-heartbeat:${orderId}`;

    // Fully async — never blocks the heartbeat response
    (async () => {
      // If the OFD status transition skipped the initial push (no live ETA at
      // that moment), we set a short-lived flag so the first heartbeat fires
      // immediately instead of waiting through the normal 90 s throttle.
      const pendingKey = `cache:la-ofd-pending:${orderId}`;
      const isFirstOfdPush = await cache.get<boolean>(pendingKey);

      const existing = await cache.get<number>(gateKey);
      if (existing && !isFirstOfdPush) return; // still within throttle window

      // Clear the pending flag and claim the gate
      if (isFirstOfdPush) await cache.del(pendingKey);
      await cache.set(gateKey, Date.now(), HEARTBEAT_LA_UPDATE_INTERVAL_S);

      // Resolve driver name
      let driverName = 'Your driver';
      try {
        const [driver] = await this.authRepository.findDriversByIds([userId]);
        if (driver) {
          driverName = `${driver.firstName} ${driver.lastName || ''}`.trim();
        }
      } catch { /* fall through with default */ }

      // Compute stable phaseStartedAt and phaseInitialMinutes from outForDeliveryAt so the
      // progress bar doesn't reset on every heartbeat LA update.
      // phaseInitialMinutes = elapsed since OFD started + remaining ETA = total delivery duration.
      let phaseStartedAt: number | undefined;
      let phaseInitialMinutes: number | undefined;
      try {
        const db = await getDB();
        const [row] = await db
          .select({ outForDeliveryAt: ordersTable.outForDeliveryAt })
          .from(ordersTable)
          .where(eq(ordersTable.id, orderId))
          .limit(1);
        if (row?.outForDeliveryAt) {
          const ofdMs = new Date(row.outForDeliveryAt).getTime();
          if (Number.isFinite(ofdMs) && ofdMs > 0) {
            const elapsedMinutes = Math.max(0, (Date.now() - ofdMs) / 60000);
            phaseStartedAt = ofdMs;
            phaseInitialMinutes = Math.max(1, Math.round(elapsedMinutes + estimatedMinutes));
          }
        }
      } catch { /* fall through — NotificationService will default to estimatedMinutes + now */ }

      updateLiveActivity(
        this.notificationService!,
        orderId,
        'out_for_delivery',
        driverName,
        estimatedMinutes,
        phaseInitialMinutes,
        phaseStartedAt,
      );

      log.info({ orderId, estimatedMinutes, phaseInitialMinutes, phaseStartedAt }, 'heartbeat:liveActivity:etaUpdate');
    })().catch((err) => {
      log.error({ err, orderId }, 'heartbeat:liveActivity:error');
    });
  }
}
