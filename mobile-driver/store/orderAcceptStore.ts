import { create } from 'zustand';

interface OrderAcceptState {
    pendingOrder: any | null;
    autoCountdown: boolean;
    accepting: boolean;
    /** In-memory set of order IDs the driver has already skipped in this session. */
    skippedIds: Set<string>;

    setPendingOrder: (order: any | null, autoCountdown?: boolean) => void;
    skipOrder: () => void;
    setAccepting: (v: boolean) => void;
}

export const useOrderAcceptStore = create<OrderAcceptState>((set, get) => ({
    pendingOrder: null,
    autoCountdown: true,
    accepting: false,
    skippedIds: new Set(),

    setPendingOrder: (order, autoCountdown = true) =>
        set({ pendingOrder: order, autoCountdown }),

    skipOrder: () => {
        const { pendingOrder, skippedIds, autoCountdown } = get();
        if (pendingOrder && autoCountdown) {
            skippedIds.add(pendingOrder.id); // mutate-in-place; not reactive (intentional)
        }
        set({ pendingOrder: null });
    },

    setAccepting: (v) => set({ accepting: v }),
}));
