import { create } from 'zustand';
import { Order } from '@/gql/graphql';

interface DriverConnectionPatch {
    activeOrderId?: string | null;
    navigationPhase?: string | null;
    remainingEtaSeconds?: number | null;
    etaUpdatedAt?: string | null;
}

interface ActiveOrdersState {
    activeOrders: Order[];
    hasActiveOrders: boolean;

    // Actions
    setActiveOrders: (orders: Order[]) => void;
    updateOrder: (order: Order) => void;
    removeOrder: (orderId: string) => void;
    clearActiveOrders: () => void;
    /** Patch driver.driverConnection on an existing order (e.g. from live-tracking subscription). */
    patchDriverConnection: (orderId: string, patch: DriverConnectionPatch) => void;
}

export const useActiveOrdersStore = create<ActiveOrdersState>()((set) => ({
    activeOrders: [],
    hasActiveOrders: false,

    setActiveOrders: (orders) =>
        set({
            activeOrders: orders,
            hasActiveOrders: orders.length > 0,
        }),

    updateOrder: (updatedOrder) =>
        set((state) => {
            const existingIndex = state.activeOrders.findIndex((order) => order.id === updatedOrder.id);

            let newOrders: Order[];

            // If order is completed (DELIVERED or CANCELLED), remove it
            if (updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'CANCELLED') {
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

            const order = state.activeOrders[idx] as any;
            const driver = order.driver ?? {};
            const prev = driver.driverConnection ?? {};

            const newOrders = [...state.activeOrders];
            newOrders[idx] = {
                ...order,
                driver: {
                    ...driver,
                    driverConnection: { ...prev, ...patch },
                },
            };
            return { activeOrders: newOrders };
        }),
}));
