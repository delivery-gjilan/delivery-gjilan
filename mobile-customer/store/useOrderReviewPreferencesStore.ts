import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OrderReviewPreferencesState {
    hiddenForAll: boolean;
    hiddenBusinessIds: string[];
    handledOrderIds: string[];
    markOrderHandled: (orderId: string) => void;
    hideForBusiness: (businessId: string) => void;
    hideForAll: () => void;
}

export const useOrderReviewPreferencesStore = create<OrderReviewPreferencesState>()(
    persist(
        (set, get) => ({
            hiddenForAll: false,
            hiddenBusinessIds: [],
            handledOrderIds: [],

            markOrderHandled: (orderId) => {
                if (!orderId) return;
                const state = get();
                if (state.handledOrderIds.includes(orderId)) return;
                set({ handledOrderIds: [...state.handledOrderIds, orderId] });
            },

            hideForBusiness: (businessId) => {
                if (!businessId) return;
                const state = get();
                if (state.hiddenBusinessIds.includes(businessId)) return;
                set({ hiddenBusinessIds: [...state.hiddenBusinessIds, businessId] });
            },

            hideForAll: () => {
                set({ hiddenForAll: true });
            },
        }),
        {
            name: 'order-review-preferences',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                hiddenForAll: state.hiddenForAll,
                hiddenBusinessIds: state.hiddenBusinessIds,
                handledOrderIds: state.handledOrderIds,
            }),
        },
    ),
);
