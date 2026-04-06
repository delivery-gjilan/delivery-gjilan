import { create } from 'zustand';

const SKIP_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OrderAcceptState {
    pendingOrder: any | null;
    autoCountdown: boolean;
    accepting: boolean;
    acceptError: string | null;
    /** True while showing the "someone else took this order" overlay (3-second auto-dismiss). */
    takenByOther: boolean;
    /** Map of orderId → timestamp when it was skipped. Entries expire after SKIP_TTL_MS. */
    skippedAt: Map<string, number>;
    /** Ref-level debounce: prevents double-tap firing two mutations. */
    _acceptingRef: boolean;

    setPendingOrder: (order: any | null, autoCountdown?: boolean) => void;
    skipOrder: () => void;
    setAccepting: (v: boolean) => void;
    setAcceptError: (msg: string | null) => void;
    setTakenByOther: (v: boolean) => void;
    /** Returns IDs that are still within the TTL window. */
    getActiveSkippedIds: () => Set<string>;
    /** True if accept is already in-flight (debounce check). */
    tryLockAccept: () => boolean;
}

export const useOrderAcceptStore = create<OrderAcceptState>((set, get) => ({
    pendingOrder: null,
    autoCountdown: true,
    accepting: false,
    acceptError: null,
    takenByOther: false,
    skippedAt: new Map(),
    _acceptingRef: false,

    setPendingOrder: (order, autoCountdown = true) =>
        set({ pendingOrder: order, autoCountdown }),

    skipOrder: () => {
        const { pendingOrder, skippedAt, autoCountdown } = get();
        const now = Date.now();
        if (pendingOrder && autoCountdown) {
            const next = new Map(skippedAt);
            next.set(pendingOrder.id, now);
            // Prune entries older than TTL while we're here
            next.forEach((ts, id) => { if (now - ts >= SKIP_TTL_MS) next.delete(id); });
            set({ skippedAt: next, pendingOrder: null });
        } else {
            set({ pendingOrder: null });
        }
    },

    setAccepting: (v) => {
        (get() as any)._acceptingRef = v;
        set({ accepting: v });
    },

    setAcceptError: (msg) => set({ acceptError: msg }),

    setTakenByOther: (v) => set({ takenByOther: v }),

    getActiveSkippedIds: () => {
        const { skippedAt } = get();
        const now = Date.now();
        const ids = new Set<string>();
        skippedAt.forEach((ts, id) => {
            if (now - ts < SKIP_TTL_MS) ids.add(id);
        });
        return ids;
    },

    tryLockAccept: () => {
        const state = get() as any;
        if (state._acceptingRef) return false;
        state._acceptingRef = true;
        return true;
    },
}));
