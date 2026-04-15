export type OrderStatus =
    | 'PENDING'
    | 'PREPARING'
    | 'READY'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';

export interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
    imageUrl?: string | null;
}

export interface Order {
    id: string;
    displayId: string;
    status: OrderStatus;
    channel?: string | null;
    recipientPhone?: string | null;
    recipientName?: string | null;
    orderDate: string;
    preparingAt?: string | null;
    readyAt?: string | null;
    preparationMinutes?: number | null;
    estimatedReadyAt?: string | null;
    driverNotes?: string | null;
    user?: {
        firstName: string;
        lastName: string;
        phoneNumber?: string | null;
    } | null;
    driver?: {
        firstName: string;
        lastName: string;
    } | null;
    dropOffLocation?: {
        address: string;
    } | null;
    businesses: Array<{
        business: { id: string; name: string };
        items: OrderItem[];
    }>;
}

export const UPCOMING_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'PREPARING', 'READY'];

export const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#f97316',
    READY: '#22c55e',
    OUT_FOR_DELIVERY: '#22c55e',
    DELIVERED: '#6b7280',
    CANCELLED: '#ef4444',
};

export const STATUS_BG: Record<OrderStatus, string> = {
    PENDING: '#f59e0b22',
    PREPARING: '#f9731622',
    READY: '#22c55e22',
    OUT_FOR_DELIVERY: '#22c55e22',
    DELIVERED: '#6b728022',
    CANCELLED: '#ef444422',
};

export const STATUS_CARD_BG: Record<OrderStatus, string> = {
    PENDING: '#f59e0b14',
    PREPARING: '#f9731614',
    READY: '#22c55e14',
    OUT_FOR_DELIVERY: '#22c55e14',
    DELIVERED: '#6b728012',
    CANCELLED: '#ef444412',
};

export const STATUS_ICONS: Record<OrderStatus, string> = {
    PENDING: 'alert-circle',
    PREPARING: 'flame',
    READY: 'checkmark-circle',
    OUT_FOR_DELIVERY: 'bicycle',
    DELIVERED: 'checkbox',
    CANCELLED: 'close-circle',
};

export const ETA_OPTIONS = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '25 min', value: 25 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
];

export const PREP_PRESET_OPTIONS = [10, 15, 20, 25, 30, 45];

export const ADD_TIME_PRESETS = [5, 10, 15, 20, 30];

export const STATUS_PRIORITY: Record<OrderStatus, number> = {
    PENDING: 0,
    PREPARING: 1,
    READY: 2,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4,
    CANCELLED: 5,
};

export type ScreenState = {
    etaModal: { visible: boolean; orderId: string | null; selectedEta: number; customEta: string };
    storeCloseModal: { visible: boolean; reason: string };
    prepModal: { visible: boolean; selectedTime: number; customTime: string };
    productModalOrder: Order | null;
    addTimeModal: { order: Order | null; amount: number; customTime: string };
    removeItemModal: { data: { orderId: string; itemId: string; itemName: string; itemQuantity: number } | null; reason: string; quantityToRemove: number };
    completedView: { show: boolean; page: number };
    selectedOrder: Order | null;
};

export type ScreenAction =
    | { type: 'OPEN_ETA_MODAL'; orderId: string }
    | { type: 'CLOSE_ETA_MODAL' }
    | { type: 'SET_ETA'; eta: number }
    | { type: 'SET_CUSTOM_ETA'; value: string }
    | { type: 'OPEN_STORE_CLOSE_MODAL'; reason?: string }
    | { type: 'CLOSE_STORE_CLOSE_MODAL' }
    | { type: 'SET_CLOSING_REASON'; reason: string }
    | { type: 'OPEN_PREP_MODAL'; time: number }
    | { type: 'CLOSE_PREP_MODAL' }
    | { type: 'SET_PREP_TIME'; time: number }
    | { type: 'SET_CUSTOM_PREP_TIME'; value: string }
    | { type: 'OPEN_PRODUCT_MODAL'; order: Order }
    | { type: 'CLOSE_PRODUCT_MODAL' }
    | { type: 'OPEN_ADD_TIME_MODAL'; order: Order }
    | { type: 'CLOSE_ADD_TIME_MODAL' }
    | { type: 'SET_ADD_TIME_AMOUNT'; amount: number }
    | { type: 'SET_CUSTOM_ADD_TIME'; value: string }
    | { type: 'OPEN_REMOVE_ITEM_MODAL'; data: { orderId: string; itemId: string; itemName: string; itemQuantity: number } }
    | { type: 'CLOSE_REMOVE_ITEM_MODAL' }
    | { type: 'SET_REMOVE_ITEM_REASON'; reason: string }
    | { type: 'SET_REMOVE_ITEM_QUANTITY'; quantity: number }
    | { type: 'TOGGLE_COMPLETED' }
    | { type: 'SET_COMPLETED_PAGE'; page: number }
    | { type: 'SELECT_ORDER'; order: Order | null };
