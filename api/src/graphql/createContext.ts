import { YogaInitialContext } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { getDB } from '@/database';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import { BusinessHoursRepository } from '@/repositories/BusinessHoursRepository';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryRepository } from '@/repositories/ProductCategoryRepository';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductSubcategoryRepository } from '@/repositories/ProductSubcategoryRepository';
import { ProductSubcategoryService } from '@/services/ProductSubcategoryService';
import { ProductRepository } from '@/repositories/ProductRepository';
import { ProductService } from '@/services/ProductService';
import { AuthRepository } from '@/repositories/AuthRepository';
import { AuthService } from '@/services/AuthService';
import { GraphQLContext } from './context';
import { DriverAuthService } from '@/services/DriverAuthService';
import { DriverRepository } from '@/repositories/DriverRepository';

import { OrderRepository } from '@/repositories/OrderRepository';
import { OrderService } from '@/services/OrderService';
import { pubsub } from '@/lib/pubsub';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { getDriverServices, initializeDriverServices } from '@/services/driverServices.init';
import { setSentryContext } from '@/lib/sentry';
import logger from '@/lib/logger';

/**
 * Extracts and verifies JWT token from request Authorization header or WebSocket connection params
 * Returns userData with userId and role if token is valid, empty object otherwise
 * Non-blocking: continues gracefully if token is missing or invalid
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractUserData(context: YogaInitialContext & { connectionParams?: any; req?: any }): Promise<{ userId?: string; role?: string; businessId?: string }> {
    try {
        let authHeader: string | null | undefined = null;

        // 1. Try to get from connectionParams (WebSocket)
        if (context.connectionParams) {
            authHeader = context.connectionParams.Authorization || context.connectionParams.authorization;
        }

        // 2. If not found, try to get from request headers (HTTP or WebSocket Upgrade)
        // Check both 'request' (Fetch API) and 'req' (Node API)
        if (!authHeader) {
            if (context.request) {
                authHeader = context.request.headers.get('authorization');
            } else if (context.req && context.req.headers) {
                authHeader = context.req.headers['authorization'];
            }
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {};
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwtToken(token);

        return { 
            userId: decoded.userId, 
            role: decoded.role,
            businessId: decoded.businessId || undefined
        };
    } catch (error) {
        // Token verification failed - continue without userId
        return {};
    }
}

/**
 * Creates the GraphQL context with all services and user data
 */
export async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
    // Extract user data from request
    const userData = await extractUserData(initialContext);

    // Extract requestId from the underlying Express req (set by requestLogger middleware)
    const expressReq = (initialContext as any).req ?? (initialContext as any).request;
    const requestId: string = (expressReq as any)?.requestId ?? '';

    // Create a per-request child logger with correlation
    const reqLog = logger.child({ requestId, userId: userData.userId, role: userData.role });

    // Push context to Sentry so every error captured within this request is enriched
    setSentryContext({ requestId, userId: userData.userId, role: userData.role });

    // Initialize database connection
    const db = await getDB();

    // Initialize repositories
    const businessRepository = new BusinessRepository(db);
    const businessHoursRepository = new BusinessHoursRepository(db);
    const productCategoryRepository = new ProductCategoryRepository(db);
    const productSubcategoryRepository = new ProductSubcategoryRepository(db);
    const productRepository = new ProductRepository(db);
    const authRepository = new AuthRepository(db);
    const orderRepository = new OrderRepository();

    // Initialize services
    const businessService = new BusinessService(businessRepository, businessHoursRepository);
    const productCategoryService = new ProductCategoryService(productCategoryRepository);
    const productSubcategoryService = new ProductSubcategoryService(productSubcategoryRepository, productCategoryRepository);
    const productService = new ProductService(productRepository, db);
    const authService = new AuthService(authRepository);
    const driverAuthService = new DriverAuthService(authRepository, new DriverRepository(db));
    const orderService = new OrderService(orderRepository, authRepository, productRepository, pubsub);

    // Get driver services (initialized on server startup)
    let driverService;
    try {
        const { driverService: ds } = getDriverServices();
        driverService = ds;
    } catch (error) {
        reqLog.warn('Driver services not yet initialized, initializing lazily');
        try {
            const { driverService: ds } = await initializeDriverServices();
            driverService = ds;
        } catch (initError) {
            reqLog.warn('Driver services failed to initialize');
            driverService = undefined;
        }
    }

    return {
        ...initialContext,
        db,
        userData,
        requestId,
        log: reqLog,
        businessService,
        productCategoryService,
        productSubcategoryService,
        productService,
        authService,
        driverAuthService,
        orderService,
        driverService,
        pubsub,
    };
}
