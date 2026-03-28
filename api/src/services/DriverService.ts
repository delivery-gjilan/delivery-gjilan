import { DbType } from '@/database';
import { DriverRepository } from '@/repositories/DriverRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { DriverWatchdogService } from '@/services/DriverWatchdogService';
import { DriverHeartbeatHandler } from '@/services/DriverHeartbeatHandler';
import { DriverConnectionStatusType } from '@/database/schema/drivers';
import type { HeartbeatEtaPayload } from '@/services/DriverHeartbeatHandler';
import type { NotificationService } from '@/services/NotificationService';

/**
 * DriverService
 * 
 * High-level service for driver operations.
 * Coordinates between DriverRepository, Watchdog, and HeartbeatHandler.
 */
export class DriverService {
  private driverRepository: DriverRepository;
  private heartbeatHandler: DriverHeartbeatHandler;

  constructor(
    private db: DbType,
    private authRepository: AuthRepository,
    private watchdogService: DriverWatchdogService,
    notificationService?: NotificationService,
  ) {
    this.driverRepository = new DriverRepository(db);
    this.heartbeatHandler = new DriverHeartbeatHandler(
      this.driverRepository,
      authRepository,
      notificationService,
    );
  }

  /**
   * Create driver profile for a new driver user
   */
  async createDriverProfile(userId: string) {
    return this.driverRepository.createDriver(userId);
  }

  private async ensureDriverProfile(userId: string) {
    const existing = await this.driverRepository.getDriverByUserId(userId);
    if (existing) {
      return existing;
    }
    return this.driverRepository.createDriver(userId);
  }

  /**
   * Process heartbeat from driver
   * This is the main entry point for driver heartbeats
   */
  async processHeartbeat(userId: string, latitude: number, longitude: number, etaPayload?: HeartbeatEtaPayload) {
    await this.ensureDriverProfile(userId);
    const result = await this.heartbeatHandler.processHeartbeat(userId, latitude, longitude, etaPayload);
    if (result.success) {
      this.watchdogService.trackHeartbeat(userId, result.lastHeartbeatAt);
    }
    return result;
  }

  /**
   * Handle driver disconnection (subscription closed)
   */
  async handleDisconnect(userId: string) {
    this.watchdogService.clearDriverTracking(userId);
    return this.heartbeatHandler.handleDisconnect(userId);
  }

  /**
   * Handle driver reconnection
   */
  async handleReconnect(userId: string) {
    const driver = await this.heartbeatHandler.handleReconnect(userId);
    this.watchdogService.trackHeartbeat(userId, driver?.lastHeartbeatAt || undefined);
    return driver;
  }

  /**
   * Update driver location (legacy method, now uses heartbeat internally)
   */
  async updateLocation(userId: string, latitude: number, longitude: number) {
    await this.ensureDriverProfile(userId);
    const result = await this.heartbeatHandler.processHeartbeat(userId, latitude, longitude);
    if (result.success) {
      this.watchdogService.trackHeartbeat(userId, result.lastHeartbeatAt);
      return this.driverRepository.getDriverByUserId(userId);
    }
    return undefined;
  }

  /**
   * Update driver's online preference (toggle)
   */
  async setOnlinePreference(userId: string, isOnline: boolean) {
    let driver = await this.driverRepository.updateOnlinePreference(userId, isOnline);
    if (!driver) {
      await this.ensureDriverProfile(userId);
      driver = await this.driverRepository.updateOnlinePreference(userId, isOnline);
    }
    return driver;
  }

  /**
   * Get driver with connection info
   */
  async getDriverWithConnection(userId: string) {
    return this.driverRepository.getDriverByUserId(userId);
  }

  /**
   * Get all drivers with their connection status
   */
  async getAllDriversWithConnection() {
    return this.driverRepository.getAllDrivers();
  }

  /**
   * Get drivers filtered by connection status
   */
  async getDriversByStatus(status: DriverConnectionStatusType) {
    return this.driverRepository.getDriversByConnectionStatus(status);
  }

  /**
   * Get drivers ready for orders (preferred online AND connected)
   */
  async getAvailableDrivers() {
    const drivers = await this.driverRepository.getAllDrivers();
    return drivers.filter((d) => d.onlinePreference && d.connectionStatus === 'CONNECTED');
  }

  /**
   * Admin: manually set driver connection status
   */
  async adminSetConnectionStatus(userId: string, status: DriverConnectionStatusType) {
    const driver = await this.driverRepository.updateConnectionStatus(userId, status);
    if (!driver) {
      return driver;
    }

    if (status === 'CONNECTED') {
      this.watchdogService.trackHeartbeat(userId, driver.lastHeartbeatAt || undefined);
    } else {
      this.watchdogService.clearDriverTracking(userId);
    }

    return driver;
  }

  /**
   * Force watchdog check (for testing)
   */
  async forceWatchdogCheck() {
    return this.watchdogService.checkNow();
  }
}
