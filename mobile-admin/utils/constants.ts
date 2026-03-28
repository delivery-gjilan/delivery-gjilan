export const DEV_ENV = 'development';
export const PROD_ENV = 'production';

export const SUPPORTED_LANGUAGES = ['en', 'al'] as const;

export const ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#6366f1',
    READY: '#22c55e',
    OUT_FOR_DELIVERY: '#3b82f6',
    DELIVERED: '#10b981',
    CANCELLED: '#ef4444',
};

export const GJILAN_CENTER = {
    latitude: 42.4604,
    longitude: 21.4694,
};

// Gjilan map boundaries – restrict panning/zooming to this area
export const GJILAN_BOUNDS = {
    northEast: { latitude: 42.55, longitude: 21.58 },
    southWest: { latitude: 42.36, longitude: 21.35 },
};

export const DEFAULT_ZOOM = 13;
