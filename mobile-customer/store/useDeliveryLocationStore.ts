import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeliveryLocation = {
    latitude: number;
    longitude: number;
    address?: string;
    label?: string;
    isOverridden?: boolean;
};

type DeliveryLocationStore = {
    location: DeliveryLocation | null;
    setLocation: (location: DeliveryLocation | null) => void;
};

// Default location: Gjilan city center
const DEFAULT_LOCATION: DeliveryLocation = {
    latitude: 42.4635,
    longitude: 21.4694,
    address: 'Gjilan, Kosovo',
    label: 'Default location',
};

export const useDeliveryLocationStore = create<DeliveryLocationStore>()(
    persist(
        (set) => ({
            location: DEFAULT_LOCATION,
            setLocation: (location) => set({ location: location || DEFAULT_LOCATION }),
        }),
        {
            name: 'delivery-location-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
