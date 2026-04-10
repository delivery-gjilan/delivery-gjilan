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

export const useDeliveryLocationStore = create<DeliveryLocationStore>()(
    persist(
        (set) => ({
            location: null,
            setLocation: (location) => set({ location }),
        }),
        {
            name: 'delivery-location-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
