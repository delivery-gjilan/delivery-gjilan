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
     * Last known GPS coords from the driver heartbeat (always up-to-date, persists
     * even when navigation is not active). Use this when you need the driver's
     * current position outside of map.tsx (e.g. Accept & Navigate flow).
     */
    lastKnownCoords: { latitude: number; longitude: number } | null;

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

    /**
     * Update the last known GPS coords (called from useDriverHeartbeat).
     */
    setLastKnownCoords: (coords: { latitude: number; longitude: number }) => void;
}

const MAX_AGE_MS = 10000; // 10 seconds

export const useNavigationLocationStore = create<NavigationLocationState>((set, get) => ({
    location: null,
    lastUpdate: null,
    lastKnownCoords: null,
    
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

    setLastKnownCoords: (coords) => {
        set({ lastKnownCoords: coords });
    },
}));
