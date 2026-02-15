/**
 * useDriverTracking Hook
 * 
 * Combined hook that manages heartbeat-based tracking for drivers.
 * Automatically starts when driver is authenticated.
 * 
 * This ensures:
 * - Heartbeat starts immediately on login
 * - Location updates are sent with heartbeat only
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDriverHeartbeat } from './useDriverHeartbeat';

export function useDriverTracking() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isOnline = useAuthStore((state) => state.isOnline);
    // Initialize heartbeat (runs when authenticated)
    useDriverHeartbeat();

    useEffect(() => {
        if (isAuthenticated) {
            console.log('[DriverTracking] Driver authenticated, tracking services started');
            if (isOnline) {
                console.log('[DriverTracking] Driver online, heartbeat active');
            } else {
                console.log('[DriverTracking] Driver offline, heartbeat active');
            }
        }
    }, [isAuthenticated, isOnline]);

    return {
        isAuthenticated,
        isOnline,
    };
}
