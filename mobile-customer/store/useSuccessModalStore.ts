import { create } from 'zustand';

type SuccessModalType = 'order_created' | 'order_delivered';
type SuccessModalPhase = 'loading' | 'success';

interface SuccessModalState {
    visible: boolean;
    orderId: string | null;
    type: SuccessModalType | null;
    phase: SuccessModalPhase;
    suppressCartBarUntil: number;
    
    // Actions
    showLoading: (type: SuccessModalType) => void;
    showSuccess: (orderId: string, type: SuccessModalType) => void;
    hideSuccess: () => void;
    suppressCartBarFor: (durationMs: number) => void;
}

export const useSuccessModalStore = create<SuccessModalState>((set) => ({
    visible: false,
    orderId: null,
    type: null,
    phase: 'success',
    suppressCartBarUntil: 0,

    showLoading: (type) => {
        set({ visible: true, orderId: null, type, phase: 'loading' });
    },

    showSuccess: (orderId: string, type: SuccessModalType) => {
        set({ visible: true, orderId, type, phase: 'success' });
    },

    hideSuccess: () => {
        set({ visible: false, orderId: null, type: null, phase: 'success' });
    },

    suppressCartBarFor: (durationMs) => {
        const until = Date.now() + Math.max(0, durationMs);
        set((state) => ({
            suppressCartBarUntil: Math.max(state.suppressCartBarUntil, until),
        }));
    },
}));
