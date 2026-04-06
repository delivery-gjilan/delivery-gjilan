import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ─── Types ─── */
export type NavigationPhase = 'to_pickup' | 'to_dropoff';

export interface NavigationDestination {
    latitude: number;
    longitude: number;
    label: string;
}

export interface NavigationOrder {
    id: string;
    status: string;
    businessName: string;
    customerName: string;
    customerPhone: string | null;
    pickup: NavigationDestination;
    dropoff: NavigationDestination | null;
}

interface NavigationState {
    /* ── State ── */
    isNavigating: boolean;
    phase: NavigationPhase;
    order: NavigationOrder | null;
    destination: NavigationDestination | null;
    originLocation: { latitude: number; longitude: number } | null;
    isMuted: boolean;

    /* ── Progress (updated by SDK callbacks) ── */
    distanceRemainingM: number | null;
    durationRemainingS: number | null;
    fractionTraveled: number | null;

    /* ── Actions ── */
    startNavigation: (order: NavigationOrder, phase: NavigationPhase, originLocation: { latitude: number; longitude: number }) => void;
    advanceToDropoff: () => void;
    stopNavigation: () => void;
    toggleMute: () => void;
    updateProgress: (distance: number, duration: number, fraction: number) => void;
}

export const useNavigationStore = create<NavigationState>()(persist((set, get) => ({
    /* ── Initial state ── */
    isNavigating: false,
    phase: 'to_pickup',
    order: null,
    destination: null,
    originLocation: null,
    isMuted: false,
    distanceRemainingM: null,
    durationRemainingS: null,
    fractionTraveled: null,

    /* ── Actions ── */
    startNavigation: (order, phase, originLocation) => {
        const destination = phase === 'to_dropoff' ? order.dropoff : order.pickup;
        set({
            isNavigating: true,
            phase,
            order,
            destination,
            originLocation,
            distanceRemainingM: null,
            durationRemainingS: null,
            fractionTraveled: null,
        });
    },

    advanceToDropoff: () => {
        const { order } = get();
        if (!order?.dropoff) return;
        set({
            phase: 'to_dropoff',
            destination: order.dropoff,
            distanceRemainingM: null,
            durationRemainingS: null,
            fractionTraveled: null,
        });
    },

    stopNavigation: () => {
        set({
            isNavigating: false,
            phase: 'to_pickup',
            order: null,
            destination: null,
            originLocation: null,
            distanceRemainingM: null,
            durationRemainingS: null,
            fractionTraveled: null,
        });
    },

    toggleMute: () => {
        set((s) => ({ isMuted: !s.isMuted }));
    },

    updateProgress: (distance, duration, fraction) => {
        set({
            distanceRemainingM: distance,
            durationRemainingS: duration,
            fractionTraveled: fraction,
        });
    },
}),
{
    name: 'navigation-state',
    storage: createJSONStorage(() => AsyncStorage),
    // Only persist the fields needed to resume navigation after a kill.
    // Progress metrics are runtime-only.
    partialize: (s) => ({
        isNavigating: s.isNavigating,
        phase: s.phase,
        order: s.order,
        destination: s.destination,
        originLocation: s.originLocation,
        isMuted: s.isMuted,
    }),
}));
