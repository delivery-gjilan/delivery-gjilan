import { DEV_ENV, PROD_ENV } from './constants';

export enum Environment {
    DEV = DEV_ENV,
    PROD = PROD_ENV,
}

export function isEnv(env: Environment): boolean {
    return process.env.NODE_ENV === env;
}

/**
 * API Configuration
 * Set via environment variables or use defaults
 */
export const API_CONFIG = {
    // GraphQL API endpoint
    GRAPHQL_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/graphql',
    
    // REST API base URL (if needed)
    BASE_URL: process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:4000',
    
    // Request timeout in milliseconds
    REQUEST_TIMEOUT: 20000,
    
    // Enable logging
    DEBUG: process.env.NODE_ENV === 'development',
};

