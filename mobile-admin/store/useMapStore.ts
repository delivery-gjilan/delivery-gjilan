import { create } from 'zustand';

export type MapFilter = 'all' | 'orders' | 'drivers' | 'businesses';
export type OrderStatusFilter = 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY';

interface MapStore {
    filter: MapFilter;
    orderStatusFilter: OrderStatusFilter;
    selectedDriverId: string | null;
    selectedOrderId: string | null;
    selectedBusinessId: string | null;
    showDriverLabels: boolean;
    showRoutes: boolean;

    setFilter: (filter: MapFilter) => void;
    setOrderStatusFilter: (filter: OrderStatusFilter) => void;
    selectDriver: (id: string | null) => void;
    selectOrder: (id: string | null) => void;
    selectBusiness: (id: string | null) => void;
    toggleDriverLabels: () => void;
    toggleRoutes: () => void;
    clearSelection: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
    filter: 'all',
    orderStatusFilter: 'ALL',
    selectedDriverId: null,
    selectedOrderId: null,
    selectedBusinessId: null,
    showDriverLabels: true,
    showRoutes: true,

    setFilter: (filter) => set({ filter }),
    setOrderStatusFilter: (filter) => set({ orderStatusFilter: filter }),
    selectDriver: (id) => set({ selectedDriverId: id, selectedOrderId: null, selectedBusinessId: null }),
    selectOrder: (id) => set({ selectedOrderId: id, selectedDriverId: null, selectedBusinessId: null }),
    selectBusiness: (id) => set({ selectedBusinessId: id, selectedDriverId: null, selectedOrderId: null }),
    toggleDriverLabels: () => set((s) => ({ showDriverLabels: !s.showDriverLabels })),
    toggleRoutes: () => set((s) => ({ showRoutes: !s.showRoutes })),
    clearSelection: () => set({ selectedDriverId: null, selectedOrderId: null, selectedBusinessId: null }),
}));
