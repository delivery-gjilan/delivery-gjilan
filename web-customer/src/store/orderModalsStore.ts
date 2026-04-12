import { create } from "zustand";

type OrderModalType = "order_created" | "order_delivered" | "awaiting_approval";

interface OrderModalsState {
    successVisible: boolean;
    successType: OrderModalType | null;
    successOrderId: string | null;

    awaitingVisible: boolean;
    awaitingOrderId: string | null;
    awaitingReasons: string[];

    showOrderSuccess: (orderId: string) => void;
    showOrderDelivered: (orderId: string) => void;
    hideOrderSuccess: () => void;

    showAwaitingApproval: (orderId: string, reasons: string[]) => void;
    hideAwaitingApproval: () => void;
}

export const useOrderModalsStore = create<OrderModalsState>((set) => ({
    successVisible: false,
    successType: null,
    successOrderId: null,

    awaitingVisible: false,
    awaitingOrderId: null,
    awaitingReasons: [],

    showOrderSuccess: (orderId) =>
        set({ successVisible: true, successType: "order_created", successOrderId: orderId }),

    showOrderDelivered: (orderId) =>
        set({ successVisible: true, successType: "order_delivered", successOrderId: orderId }),

    hideOrderSuccess: () =>
        set({ successVisible: false, successType: null, successOrderId: null }),

    showAwaitingApproval: (orderId, reasons) =>
        set({ awaitingVisible: true, awaitingOrderId: orderId, awaitingReasons: reasons }),

    hideAwaitingApproval: () =>
        set({ awaitingVisible: false, awaitingOrderId: null, awaitingReasons: [] }),
}));
