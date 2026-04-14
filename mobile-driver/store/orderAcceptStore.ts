import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DriverOrder } from '@/utils/types';

const SKIP_TTL_MS = 10 * 60 * 1000; // 10 minutes

type TimestampMap = Record<string, number>;

const pruneTimestampMap = (entries: TimestampMap, now: number): TimestampMap => {
    const next: TimestampMap = {};
    Object.entries(entries).forEach(([id, ts]) => {
        if (now - ts < SKIP_TTL_MS) {
            next[id] = ts;
        }
    });
    return next;
};

interface OrderAcceptState {
    pendingOrder: DriverOrder | null;
    autoCountdown: boolean;
    accepting: boolean;
    acceptError: string | null;
    /** True while showing the "someone else took this order" overlay (3-second auto-dismiss). */
    takenByOther: boolean;
    /** Map of orderId → timestamp when it was skipped. Entries expire after SKIP_TTL_MS. */
    skippedAt: TimestampMap;
    /** Map of orderId → last timestamp this driver saw it assigned to them. */
    seenAssignedAt: TimestampMap;
    /** Ref-level debounce: prevents double-tap firing two mutations. */
    _acceptingRef: boolean;

    setPendingOrder: (order: DriverOrder | null, autoCountdown?: boolean) => void;
    skipOrder: () => void;
    setAccepting: (v: boolean) => void;
    setAcceptError: (msg: string | null) => void;
    setTakenByOther: (v: boolean) => void;
    markAssignedOrders: (orderIds: string[]) => void;
    /** Returns IDs that are still within the TTL window. */
    getActiveSkippedIds: (currentlyAssignedIds?: Iterable<string>) => Set<string>;
    /** True if accept is already in-flight (debounce check). */
    tryLockAccept: () => boolean;
}

export const useOrderAcceptStore = create<OrderAcceptState>()(
    persist(
        (set, get) => ({
            pendingOrder: null,
            autoCountdown: true,
            accepting: false,
            acceptError: null,
            takenByOther: false,
            skippedAt: {},
            seenAssignedAt: {},
            _acceptingRef: false,

            setPendingOrder: (order, autoCountdown = true) =>
                set({ pendingOrder: order, autoCountdown }),

            skipOrder: () => {
                const { pendingOrder, skippedAt, autoCountdown } = get();
                const now = Date.now();
                if (pendingOrder && autoCountdown) {
                    set({
                        skippedAt: pruneTimestampMap({
                            ...skippedAt,
                            [pendingOrder.id]: now,
                        }, now),
                        pendingOrder: null,
                    });
                } else {
                    set({ pendingOrder: null });
                }
            },

            setAccepting: (v) => {
                get()._acceptingRef = v;
                set({ accepting: v });
            },

            setAcceptError: (msg) => set({ acceptError: msg }),

            setTakenByOther: (v) => set({ takenByOther: v }),

            markAssignedOrders: (orderIds) => {
                const now = Date.now();
                const nextSeenAssignedAt = pruneTimestampMap({ ...get().seenAssignedAt }, now);
                orderIds.forEach((id) => {
                    nextSeenAssignedAt[id] = now;
                });
                set({ seenAssignedAt: nextSeenAssignedAt });
            },

            getActiveSkippedIds: (currentlyAssignedIds = []) => {
                const now = Date.now();
                const assignedSet = new Set(currentlyAssignedIds);
                const { skippedAt, seenAssignedAt } = get();
                const ids = new Set<string>();

                Object.entries(pruneTimestampMap(skippedAt, now)).forEach(([id]) => {
                    ids.add(id);
                });

                Object.entries(pruneTimestampMap(seenAssignedAt, now)).forEach(([id]) => {
                    if (!assignedSet.has(id)) {
                        ids.add(id);
                    }
                });

                return ids;
            },

            tryLockAccept: () => {
                const state = get();
                if (state._acceptingRef) return false;
                state._acceptingRef = true;
                return true;
            },
        }),
        {
            name: 'driver-order-accept-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                skippedAt: state.skippedAt,
                seenAssignedAt: state.seenAssignedAt,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const now = Date.now();
                state.skippedAt = pruneTimestampMap(state.skippedAt, now);
                state.seenAssignedAt = pruneTimestampMap(state.seenAssignedAt, now);
            },
        },
    ),
);
