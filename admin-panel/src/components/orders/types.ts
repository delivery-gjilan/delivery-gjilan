export type OrderStatus =
    | "AWAITING_APPROVAL"
    | "PENDING"
    | "PREPARING"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";

export type CompletedStatusFilter = "ALL" | "DELIVERED" | "CANCELLED";
export type ApprovalReason = "FIRST_ORDER" | "HIGH_VALUE" | "OUT_OF_ZONE";

export interface OrderItem {
    id?: string;
    productId: string;
    name: string;
    imageUrl?: string | null;
    quantity: number;
    basePrice?: number | null;
    unitPrice?: number | null;
    notes?: string;
    inventoryQuantity?: number | null;
}

export interface OrderSettlementLineItem {
    type: string;
    direction: string;
    amount: number;
    reason: string;
    businessId?: string | null;
    driverId?: string | null;
    ruleId?: string | null;
}

export interface OrderSettlementPreview {
    lineItems: OrderSettlementLineItem[];
    totalReceivable: number;
    totalPayable: number;
    netMargin: number;
    driverAssigned: boolean;
}

export interface OrderCoverageItem {
    productId: string;
    productName: string;
    productImageUrl?: string | null;
    orderedQty: number;
    fromStock: number;
    fromMarket: number;
    status: string;
    deducted: boolean;
}

export interface OrderCoverage {
    orderId: string;
    items: OrderCoverageItem[];
    totalItems: number;
    fullyOwnedCount: number;
    partiallyOwnedCount: number;
    marketOnlyCount: number;
    allFromStock: boolean;
    allFromMarket: boolean;
    deducted: boolean;
}

export interface RemovedOrderItem {
    id: string;
    productId: string;
    name: string;
    imageUrl?: string | null;
    removedQuantity: number;
    unitPrice: number;
    reason: string;
    removedAt?: string | null;
}

export interface OrderBusiness {
    business: {
        id: string;
        name: string;
        businessType: string;
        phoneNumber?: string | null;
        location?: Location | null;
        commissionPercentage?: number | null;
    };
    items: OrderItem[];
    removedItems?: RemovedOrderItem[];
}

export interface Location {
    latitude: number;
    longitude: number;
    address: string;
}

export interface Order {
    id: string;
    displayId: string;
    orderPrice: number;
    deliveryPrice: number;
    originalPrice?: number | null;
    originalDeliveryPrice?: number | null;
    totalPrice: number;
    orderDate: string;
    status: OrderStatus;
    preparationMinutes?: number | null;
    estimatedReadyAt?: string | null;
    preparingAt?: string | null;
    dropOffLocation: Location;
    driverNotes?: string | null;
    businesses: OrderBusiness[];
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string | null;
        adminNote?: string | null;
        flagColor?: string | null;
        totalOrders?: number | null;
        isTrustedCustomer?: boolean | null;
    } | null;
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        commissionPercentage?: number | null;
    } | null;
    cancellationReason?: string | null;
    cancelledAt?: string | null;
    adminNote?: string | null;
    needsApproval?: boolean | null;
    locationFlagged?: boolean | null;
    inventoryPrice?: number | null;
    approvalReasons?: ApprovalReason[] | null;
    settlementPreview?: OrderSettlementPreview | null;
    orderPromotions?: {
        id: string;
        promotionId: string;
        appliesTo: "PRICE" | "DELIVERY";
        discountAmount: number;
        promoCode?: string | null;
    }[] | null;
}
