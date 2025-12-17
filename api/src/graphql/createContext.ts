import { YogaInitialContext } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { getDB } from '@/database';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryRepository } from '@/repositories/ProductCategoryRepository';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductRepository } from '@/repositories/ProductRepository';
import { ProductService } from '@/services/ProductService';
import { AuthRepository } from '@/repositories/AuthRepository';
import { AuthService } from '@/services/AuthService';
import { GraphQLContext } from './context';

import { OrderRepository } from '@/repositories/OrderRepository';
import { OrderService } from '@/services/OrderService';
import { pubsub } from '@/lib/pubsub';

/**
 * Extracts and verifies JWT token from request Authorization header
 * Returns userData with userId if token is valid, empty object otherwise
 * Non-blocking: continues gracefully if token is missing or invalid
 */
function extractUserData(request: Request): { userId?: string } {
    try {
        // Extract Authorization header
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {};
        }

        // Extract token (remove 'Bearer ' prefix)
        const token = authHeader.substring(7);

        // Get JWT secret
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not defined in environment variables');
            return {};
        }

        // Verify and decode token
        const decoded = jwt.verify(token, secret) as { userId: string };

        return { userId: decoded.userId };
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
    const userData = extractUserData(initialContext.request);

    // Initialize database connection
    const db = await getDB();

    // Initialize repositories
    const businessRepository = new BusinessRepository(db);
    const productCategoryRepository = new ProductCategoryRepository(db);
    const productRepository = new ProductRepository(db);
    const authRepository = new AuthRepository(db);
    const orderRepository = new OrderRepository();

    // Initialize services
    const businessService = new BusinessService(businessRepository);
    const productCategoryService = new ProductCategoryService(productCategoryRepository);
    const productService = new ProductService(productRepository);
    const authService = new AuthService(authRepository);
    const orderService = new OrderService(orderRepository, authRepository, productRepository);

    return {
        ...initialContext,
        db,
        userData,
        businessService,
        productCategoryService,
        productService,
        authService,
        orderService,
        pubsub,
    };
}
