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
    imageUrl?: string;
    quantity: number;
    basePrice?: number;
    unitPrice?: number;
    notes?: string;
    inventoryQuantity?: number;
}

export interface OrderBusiness {
    business: {
        id: string;
        name: string;
        businessType: string;
        commissionPercentage?: number;
    };
    items: OrderItem[];
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
    originalPrice?: number;
    originalDeliveryPrice?: number;
    totalPrice: number;
    orderDate: string;
    status: OrderStatus;
    preparationMinutes?: number;
    estimatedReadyAt?: string;
    preparingAt?: string;
    dropOffLocation: Location;
    driverNotes?: string;
    businesses: OrderBusiness[];
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string;
        adminNote?: string | null;
        flagColor?: string | null;
        totalOrders?: number | null;
        isTrustedCustomer?: boolean | null;
    };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        commissionPercentage?: number;
    } | null;
    cancellationReason?: string | null;
    cancelledAt?: string | null;
    adminNote?: string | null;
    needsApproval?: boolean | null;
    locationFlagged?: boolean | null;
    inventoryPrice?: number | null;
    approvalReasons?: ApprovalReason[] | null;
    orderPromotions?: {
        id: string;
        promotionId: string;
        appliesTo: "PRICE" | "DELIVERY";
        discountAmount: number;
        promoCode?: string | null;
    }[] | null;
}
