import { create } from 'zustand';

interface AwaitingApprovalModalState {
    visible: boolean;
    orderId: string | null;
    autoOpenOrderId: string | null;
    requestAutoOpen: (orderId: string) => void;
    openModal: (orderId: string) => void;
    consumeAutoOpen: (orderId: string) => void;
    hideModal: () => void;
}

export const useAwaitingApprovalModalStore = create<AwaitingApprovalModalState>((set) => ({
    visible: false,
    orderId: null,
    autoOpenOrderId: null,

    requestAutoOpen: (orderId) => {
        set({ autoOpenOrderId: orderId });
    },

    openModal: (orderId) => {
        set({ visible: true, orderId });
    },

    consumeAutoOpen: (orderId) => {
        set((state) => {
            if (state.autoOpenOrderId !== orderId) {
                return state;
            }

            return {
                autoOpenOrderId: null,
            };
        });
    },

    hideModal: () => {
        set({ visible: false, orderId: null });
    },
}));