import { DriverService } from '@/services/DriverService';
import { DriverWatchdogService } from '@/services/DriverWatchdogService';
import { DriverRepository } from '@/repositories/DriverRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { NotificationService } from '@/services/NotificationService';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { getDB } from '@/database';
import logger from '@/lib/logger';

const log = logger.child({ service: 'DriverServices' });

/**
 * Initialize Driver Services
 * 
 * Call this during your GraphQL server context initialization
 * or in your server startup code.
 * 
 * This sets up:
 * 1. DriverRepository - database layer
 * 2. DriverWatchdogService - monitors connection states every 10s
 * 3. DriverService - high-level business logic with heartbeat handling
 * 
 * The watchdog service will start automatically.
 */

let driverService: DriverService | null = null;
let watchdogService: DriverWatchdogService | null = null;
let initializingPromise: Promise<{ driverService: DriverService; watchdogService: DriverWatchdogService }> | null = null;

export async function initializeDriverServices() {
  if (driverService && watchdogService) {
    log.debug('driverServices:alreadyInitialized');
    return { driverService, watchdogService };
  }

  if (initializingPromise) {
    log.debug('driverServices:initializationInProgress');
    return initializingPromise;
  }

  initializingPromise = (async () => {
    log.info('driverServices:initializing');

    // Get database connection (initializes if needed)
    const db = await getDB();

    // Repositories
    const driverRepository = new DriverRepository(db);
    const authRepository = new AuthRepository(db);

    // Watchdog service - runs every 10 seconds to check connection states
    watchdogService = new DriverWatchdogService(driverRepository, authRepository);

    // High-level service with heartbeat handling
    const notificationService = new NotificationService(new NotificationRepository(db));
    driverService = new DriverService(db, authRepository, watchdogService, notificationService);

    // Start the watchdog
    watchdogService.start();

    log.info('driverServices:ready');

    return { driverService, watchdogService };
  })();

  try {
    return await initializingPromise;
  } finally {
    initializingPromise = null;
  }
}

/**
 * Shutdown driver services
 * 
 * Call this when your server is shutting down
 */
export function shutdownDriverServices() {
  initializingPromise = null;
  if (watchdogService) {
    watchdogService.stop();
    log.info('driverServices:shutdown');
  }
}

/**
 * Get initialized services
 * 
 * Use this in your context factory
 */
export function getDriverServices() {
  if (!driverService || !watchdogService) {
    throw new Error(
      'Driver services not initialized. Call initializeDriverServices() on server startup.'
    );
  }
  return { driverService, watchdogService };
}

/**
 * Example context factory for GraphQL
 * 
 * Add this to your GraphQL context initialization:
 */
export function createContextWithDriverServices(baseContext: any) {
  const { driverService, watchdogService } = getDriverServices();

  return {
    ...baseContext,
    driverService,
    watchdogService,
  };
}

/**
 * Example server startup/shutdown
 * 
 * In your main server file (e.g., index.ts):
 * 
 * import { initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';
 * 
 * async function startServer() {
 *   await initializeDriverServices();
 *   
 *   const server = new ApolloServer({ schema, context: createContextWithDriverServices });
 *   await server.listen({ port: 4000 });
 * }
 * 
 * process.on('SIGTERM', () => {
 *   shutdownDriverServices();
 *   process.exit(0);
 * });
 */
