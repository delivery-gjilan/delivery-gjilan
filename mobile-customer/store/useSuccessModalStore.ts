import { create } from 'zustand';

type SuccessModalType = 'order_created' | 'order_delivered';

interface SuccessModalState {
    visible: boolean;
    orderId: string | null;
    type: SuccessModalType | null;
    
    // Actions
    showSuccess: (orderId: string, type: SuccessModalType) => void;
    hideSuccess: () => void;
}

export const useSuccessModalStore = create<SuccessModalState>((set) => ({
    visible: false,
    orderId: null,
    type: null,

    showSuccess: (orderId: string, type: SuccessModalType) => {
        set({ visible: true, orderId, type });
    },

    hideSuccess: () => {
        set({ visible: false, orderId: null, type: null });
    },
}));
