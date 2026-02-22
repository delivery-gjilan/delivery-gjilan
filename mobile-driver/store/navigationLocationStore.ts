import { create } from 'zustand';

/**
 * Navigation Location Store
 * 
 * Provides location data from Navigation SDK to the heartbeat system.
 * When navigation is active, this avoids duplicate GPS polling.
 */

interface NavigationLocationState {
    /**
     * Current location from Navigation SDK (null when not navigating)
     */
    location: { latitude: number; longitude: number } | null;
    
    /**
     * Timestamp of last location update (ms since epoch)
     */
    lastUpdate: number | null;
    
    /**
     * Set location from Navigation SDK
     */
    setLocation: (location: { latitude: number; longitude: number }) => void;
    
    /**
     * Clear location (called when navigation ends)
     */
    clearLocation: () => void;
    
    /**
     * Check if location is fresh (less than 10 seconds old)
     */
    isFresh: () => boolean;
}

const MAX_AGE_MS = 10000; // 10 seconds

export const useNavigationLocationStore = create<NavigationLocationState>((set, get) => ({
    location: null,
    lastUpdate: null,
    
    setLocation: (location) => {
        set({
            location,
            lastUpdate: Date.now(),
        });
    },
    
    clearLocation: () => {
        set({
            location: null,
            lastUpdate: null,
        });
    },
    
    isFresh: () => {
        const state = get();
        if (!state.location || !state.lastUpdate) return false;
        return Date.now() - state.lastUpdate < MAX_AGE_MS;
    },
}));
