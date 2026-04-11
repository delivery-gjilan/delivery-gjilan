import { create } from 'zustand';

interface OrderReviewPromptState {
    activeOrderId: string | null;
    queuedOrderIds: string[];
    requestPrompt: (orderId: string) => void;
    closePrompt: () => void;
    clearAll: () => void;
}

export const useOrderReviewPromptStore = create<OrderReviewPromptState>((set) => ({
    activeOrderId: null,
    queuedOrderIds: [],

    requestPrompt: (orderId) => {
        set((state) => {
            if (!orderId) return state;
            if (state.activeOrderId === orderId) return state;
            if (state.queuedOrderIds.includes(orderId)) return state;

            if (!state.activeOrderId) {
                return { ...state, activeOrderId: orderId };
            }

            return {
                ...state,
                queuedOrderIds: [...state.queuedOrderIds, orderId],
            };
        });
    },

    closePrompt: () => {
        set((state) => {
            if (state.queuedOrderIds.length === 0) {
                return {
                    ...state,
                    activeOrderId: null,
                };
            }

            const [nextOrderId, ...rest] = state.queuedOrderIds;
            return {
                ...state,
                activeOrderId: nextOrderId,
                queuedOrderIds: rest,
            };
        });
    },

    clearAll: () => {
        set({ activeOrderId: null, queuedOrderIds: [] });
    },
}));
