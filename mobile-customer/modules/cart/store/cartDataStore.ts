import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartStoreState } from '../types';

export const useCartDataStore = create<CartStoreState>()(
    persist(
        (set) => ({
            items: [],
        }),
        {
            name: 'cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
