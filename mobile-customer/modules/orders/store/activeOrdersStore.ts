import { create } from 'zustand';
import type { GetOrdersQuery, OrderStatus } from '@/gql/graphql';

export type ActiveOrder = GetOrdersQuery['orders']['orders'][number];

interface DriverConnectionPatch {
    activeOrderId?: string | null;
    navigationPhase?: string | null;
    remainingEtaSeconds?: number | null;
    etaUpdatedAt?: string | null;
}

interface OrderLifecyclePatch {
    status?: OrderStatus;
    updatedAt?: string;
    preparingAt?: string | null;
    estimatedReadyAt?: string | null;
    outForDeliveryAt?: string | null;
    readyAt?: string | null;
    deliveredAt?: string | null;
    preparationMinutes?: number | null;
}

interface ActiveOrdersState {
    activeOrders: ActiveOrder[];
    hasActiveOrders: boolean;

    // Actions
    setActiveOrders: (orders: ActiveOrder[]) => void;
    updateOrder: (order: ActiveOrder) => void;
    removeOrder: (orderId: string) => void;
    clearActiveOrders: () => void;
    /** Patch driver.driverConnection on an existing order (e.g. from live-tracking subscription). */
    patchDriverConnection: (orderId: string, patch: DriverConnectionPatch) => void;
    /** Patch a small set of lifecycle fields without replacing the whole order object. */
    patchOrderLifecycle: (orderId: string, patch: OrderLifecyclePatch) => void;
}

const TERMINAL_STATUSES = ['DELIVERED', 'CANCELLED'];

// Track recently-removed order IDs so that a stale cache-and-network backfill
// cannot revive an order that the subscription just removed.
const _recentlyRemoved = new Map<string, number>();
const RECENTLY_REMOVED_TTL_MS = 10_000; // 10 seconds

function markRecentlyRemoved(orderId: string) {
    _recentlyRemoved.set(orderId, Date.now());
}

function isRecentlyRemoved(orderId: string): boolean {
    const ts = _recentlyRemoved.get(orderId);
    if (!ts) return false;
    if (Date.now() - ts > RECENTLY_REMOVED_TTL_MS) {
        _recentlyRemoved.delete(orderId);
        return false;
    }
    return true;
}

export const useActiveOrdersStore = create<ActiveOrdersState>()((set) => ({
    activeOrders: [],
    hasActiveOrders: false,

    setActiveOrders: (orders) => {
        // Defensive: filter out terminal statuses and recently-removed orders
        // so a stale Apollo cache backfill cannot revive a delivered/cancelled order.
        const filtered = orders.filter(
            (o) =>
                !TERMINAL_STATUSES.includes(o.status) &&
                !isRecentlyRemoved(String(o.id)),
        );
        set({
            activeOrders: filtered,
            hasActiveOrders: filtered.length > 0,
        });
    },

    updateOrder: (updatedOrder) =>
        set((state) => {
            const existingIndex = state.activeOrders.findIndex((order) => order.id === updatedOrder.id);

            let newOrders: ActiveOrder[];

            // If order is completed (DELIVERED or CANCELLED), remove it
            if (updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'CANCELLED') {
                markRecentlyRemoved(String(updatedOrder.id));
                newOrders = state.activeOrders.filter((order) => order.id !== updatedOrder.id);
            } else {
                // Update existing or add new order
                if (existingIndex >= 0) {
                    newOrders = [...state.activeOrders];
                    newOrders[existingIndex] = updatedOrder;
                } else {
                    newOrders = [...state.activeOrders, updatedOrder];
                }
            }

            return {
                activeOrders: newOrders,
                hasActiveOrders: newOrders.length > 0,
            };
        }),

    removeOrder: (orderId) =>
        set((state) => {
            markRecentlyRemoved(orderId);
            const newOrders = state.activeOrders.filter((order) => order.id !== orderId);
            return {
                activeOrders: newOrders,
                hasActiveOrders: newOrders.length > 0,
            };
        }),

    clearActiveOrders: () =>
        set({
            activeOrders: [],
            hasActiveOrders: false,
        }),

    patchDriverConnection: (orderId, patch) =>
        set((state) => {
            const idx = state.activeOrders.findIndex((o) => o.id === orderId);
            if (idx < 0) return state;

            const order = state.activeOrders[idx];
            const existingDriver = order.driver;
            const existingConnection = existingDriver?.driverConnection;

            const newOrders = [...state.activeOrders];
            newOrders[idx] = {
                ...order,
                driver: existingDriver ? {
                    ...existingDriver,
                    driverConnection: { ...(existingConnection ?? {}), ...patch },
                } : existingDriver,
            } as ActiveOrder;
            return { activeOrders: newOrders };
        }),

    patchOrderLifecycle: (orderId, patch) =>
        set((state) => {
            const idx = state.activeOrders.findIndex((o) => o.id === orderId);
            if (idx < 0) return state;

            const order = state.activeOrders[idx];
            const newOrders = [...state.activeOrders];
            newOrders[idx] = {
                ...order,
                ...patch,
            } as ActiveOrder;

            return { activeOrders: newOrders };
        }),
}));
