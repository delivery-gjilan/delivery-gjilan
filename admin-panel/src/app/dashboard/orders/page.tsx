"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client/react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Dropdown from "@/components/ui/Dropdown";
import Input from "@/components/ui/Input";
import { useOrders, useUpdateOrderStatus } from "@/lib/hooks/useOrders";
import { usePrepTimeAlerts, type PrepTimeAlert } from "@/lib/hooks/usePrepTimeAlerts";
import { useAuth } from "@/lib/auth-context";
import { ASSIGN_DRIVER_TO_ORDER, CREATE_TEST_ORDER, START_PREPARING, UPDATE_PREPARATION_TIME, ADMIN_CANCEL_ORDER, APPROVE_ORDER } from "@/graphql/operations/orders";
import { GRANT_FREE_DELIVERY } from "@/graphql/operations/promotions/mutations";
import { UPDATE_USER_NOTE_MUTATION } from "@/graphql/operations/users/mutations";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_ORDER_COVERAGE } from "@/graphql/operations/inventory/queries";
import { DEDUCT_ORDER_STOCK } from "@/graphql/operations/inventory/mutations";
import InventoryCoverageModal from "@/components/inventory/InventoryCoverageModal";
import { Package, Store, Search, ArrowRight, MapPin, User, Plus, ChefHat, Timer, Copy, Check, Phone, Hash, MessageSquare, Calendar, Clock, Truck, CreditCard, Tag, X } from "lucide-react";
import { toast } from 'sonner';

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

type OrderStatus = "AWAITING_APPROVAL" | "PENDING" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
type CompletedStatusFilter = "ALL" | "DELIVERED" | "CANCELLED";
type ApprovalReason = 'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE';

interface OrderItem {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    basePrice?: number;
    unitPrice?: number;
    notes?: string;
}

interface OrderBusiness {
    business: {
        id: string;
        name: string;
        businessType: string;
        commissionPercentage?: number;
    };
    items: OrderItem[];
}

interface Location {
    latitude: number;
    longitude: number;
    address: string;
}

interface Order {
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
        appliesTo: string;
        discountAmount: number;
        promoCode?: string | null;
    }[] | null;
}

const TRUSTED_CUSTOMER_MARKER = "[TRUSTED_CUSTOMER]";
const APPROVAL_MODAL_SUPPRESS_MARKER = '[SUPPRESS_APPROVAL_MODAL]';

function isTrustedCustomer(user?: Order["user"]): boolean {
    if (!user) return false;
    if (user.isTrustedCustomer) return true;
    if ((user.flagColor || '').toLowerCase() === 'green') return true;
    return (user.adminNote || '').toUpperCase().includes(TRUSTED_CUSTOMER_MARKER);
}

function upsertTrustMarker(note?: string | null): string {
    const cleaned = String(note || '')
        .replace(TRUSTED_CUSTOMER_MARKER, '')
        .trim();
    return cleaned ? `${TRUSTED_CUSTOMER_MARKER}\n${cleaned}` : TRUSTED_CUSTOMER_MARKER;
}

function removeTrustMarker(note?: string | null): string | null {
    const cleaned = String(note || '')
        .replace(TRUSTED_CUSTOMER_MARKER, '')
        .trim();
    return cleaned || null;
}

function isApprovalModalSuppressed(user?: Order['user']): boolean {
    if (!user) return false;
    return (user.adminNote || '').toUpperCase().includes(APPROVAL_MODAL_SUPPRESS_MARKER);
}

function upsertApprovalModalSuppressMarker(note?: string | null): string {
    const cleaned = String(note || '')
        .replace(APPROVAL_MODAL_SUPPRESS_MARKER, '')
        .trim();
    return cleaned ? `${APPROVAL_MODAL_SUPPRESS_MARKER}\n${cleaned}` : APPROVAL_MODAL_SUPPRESS_MARKER;
}

function removeApprovalModalSuppressMarker(note?: string | null): string | null {
    const cleaned = String(note || '')
        .replace(APPROVAL_MODAL_SUPPRESS_MARKER, '')
        .trim();
    return cleaned || null;
}

function deriveApprovalReasons(order?: Pick<Order, 'approvalReasons' | 'locationFlagged' | 'needsApproval' | 'totalPrice'> | null): ApprovalReason[] {
    if (!order) return [];

    const normalized = new Set<ApprovalReason>();
    for (const reason of order.approvalReasons ?? []) {
        if (reason === 'FIRST_ORDER' || reason === 'HIGH_VALUE' || reason === 'OUT_OF_ZONE') {
            normalized.add(reason);
        }
    }

    if (order.locationFlagged) {
        normalized.add('OUT_OF_ZONE');
    }

    // Fallback for sparse payloads: keep high-value visibility for approval-needed orders.
    if (order.needsApproval && normalized.size === 0 && Number(order.totalPrice || 0) > 20) {
        normalized.add('HIGH_VALUE');
    }

    return Array.from(normalized);
}

function parseAdminNote(adminNote?: string | null): { tag: string; note: string } | null {
    if (!adminNote) return null;
    try {
        const p = JSON.parse(adminNote);
        if (p && typeof p === 'object' && (p.tag || p.note)) return { tag: p.tag || '', note: p.note || '' };
    } catch {}
    return null;
}

const INCIDENT_TAG_LABELS: Record<string, string> = {
    late_prep: 'Late Prep',
    driver_delay: 'Driver Delay',
    handoff_issue: 'Handoff Issue',
    customer_issue: 'Customer Issue',
    wrong_order: 'Wrong Order',
    other: 'Other',
};

const normalizeOrderBusinesses = (order: any): OrderBusiness[] => {
    if (!Array.isArray(order?.businesses)) return [];
    return order.businesses.map((biz: any) => ({
        ...biz,
        items: Array.isArray(biz?.items) ? biz.items : [],
    }));
};

const getOrderBusinessesSafe = (order: any): OrderBusiness[] => {
    return Array.isArray(order?.businesses) ? order.businesses : [];
};

const getBusinessItemsSafe = (business: any): OrderItem[] => {
    return Array.isArray(business?.items) ? business.items : [];
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

function getMarginSeverity(netMargin: number): 'healthy' | 'thin' | 'negative' {
    return netMargin < 0 ? 'negative' : netMargin < 1.5 ? 'thin' : 'healthy';
}

/* ---------------------------------------------------------
   STATUS CONFIG
--------------------------------------------------------- */

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string; dot: string }> = {
    AWAITING_APPROVAL: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
    PREPARING: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
    READY: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
    OUT_FOR_DELIVERY: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
    DELIVERED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
    CANCELLED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
};

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
    AWAITING_APPROVAL: null,
    PENDING: "PREPARING",
    PREPARING: "READY",
    READY: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
    DELIVERED: null,
    CANCELLED: null,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    AWAITING_APPROVAL: "Awaiting Approval",
    PENDING: "Pending",
    PREPARING: "Preparing",
    READY: "Ready",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
    dot: STATUS_COLORS[value as OrderStatus].dot,
    textClass: STATUS_COLORS[value as OrderStatus].text,
}));

/* ---------------------------------------------------------
   HELPER COMPONENTS
--------------------------------------------------------- */

function StatusBadge({ status }: { status: OrderStatus }) {
    const colors = STATUS_COLORS[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {STATUS_LABELS[status]}
        </span>
    );
}

function CopyableId({ displayId }: { displayId: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(displayId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-300 hover:text-white transition-colors group"
            title="Copy order ID"
        >
            <Hash size={12} className="text-zinc-600" />
            {displayId}
            {copied ? (
                <Check size={12} className="text-green-400" />
            ) : (
                <Copy size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

const ORDERS_PAGE_SIZE = 100;
const COMPLETED_PAGE_SIZE = 50;
export default function OrdersPage() {
    const [ordersPage, setOrdersPage] = useState(0);
    const [completedPage, setCompletedPage] = useState(0);
    const [completedStartDate, setCompletedStartDate] = useState<string>("");
    const [completedEndDate, setCompletedEndDate] = useState<string>("");
    const { orders, totalCount, hasMore, loading } = useOrders({ limit: ORDERS_PAGE_SIZE, offset: ordersPage * ORDERS_PAGE_SIZE });
    const { orders: completedOrdersRaw, totalCount: completedTotalCount, hasMore: completedHasMore, loading: completedLoading } = useOrders({
        limit: COMPLETED_PAGE_SIZE,
        offset: completedPage * COMPLETED_PAGE_SIZE,
        statuses: ['DELIVERED', 'CANCELLED'],
        startDate: completedStartDate ? new Date(completedStartDate + "T00:00:00").toISOString() : undefined,
        endDate: completedEndDate ? new Date(completedEndDate + "T23:59:59.999").toISOString() : undefined,
    });
    const { update: updateStatus, loading: updateLoading } = useUpdateOrderStatus();
    const { admin } = useAuth();
    const { data: driversData } = useQuery(DRIVERS_QUERY, { pollInterval: 10000 });
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [createTestOrder, { loading: creatingTestOrder }] = useMutation(CREATE_TEST_ORDER);
    const [startPreparingMut, { loading: startPreparingLoading }] = useMutation(START_PREPARING, { refetchQueries: ['GetOrders'] });
    const [updatePrepTimeMut] = useMutation(UPDATE_PREPARATION_TIME, { refetchQueries: ['GetOrders'] });
    const [adminCancelOrderMut, { loading: cancellingOrder }] = useMutation(ADMIN_CANCEL_ORDER, { refetchQueries: ['GetOrders'] });
    const [approveOrderMut, { loading: approvingOrder }] = useMutation(APPROVE_ORDER, { refetchQueries: ['GetOrders'] });
    const [grantFreeDeliveryMut, { loading: grantingFreeDelivery }] = useMutation(GRANT_FREE_DELIVERY);
    const [updateUserNoteMut] = useMutation(UPDATE_USER_NOTE_MUTATION, { refetchQueries: ['GetOrders'] });
    const [fetchOrderCoverage, { data: coverageData, loading: coverageLoading }] = useLazyQuery(GET_ORDER_COVERAGE, { fetchPolicy: 'network-only' });
    const [deductOrderStockMut, { loading: deductingStock }] = useMutation(DEDUCT_ORDER_STOCK);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const [completedStatusFilter, setCompletedStatusFilter] = useState<CompletedStatusFilter>("ALL");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [assigningDriverOrderId, setAssigningDriverOrderId] = useState<string | null>(null);
    const [prepTimeModalOrder, setPrepTimeModalOrder] = useState<Order | null>(null);
    const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>("20");
    const [editPrepTimeOrder, setEditPrepTimeOrder] = useState<Order | null>(null);
    const [editPrepTimeMinutes, setEditPrepTimeMinutes] = useState<string>("");
    const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState<string>("");
    const [cancelSettleDriver, setCancelSettleDriver] = useState<boolean>(false);
    const [cancelSettleBusiness, setCancelSettleBusiness] = useState<boolean>(false);
    const [approvalModalOrder, setApprovalModalOrder] = useState<Order | null>(null);
    const [trustUpdatingUserId, setTrustUpdatingUserId] = useState<string | null>(null);
    const [suppressionUpdatingUserId, setSuppressionUpdatingUserId] = useState<string | null>(null);
    const [dismissedApprovalOrderIds, setDismissedApprovalOrderIds] = useState<Set<string>>(new Set());
    const seenFlaggedOrderIdsRef = useRef<Set<string>>(new Set());
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    const [prepTimeAlerts, setPrepTimeAlerts] = useState<PrepTimeAlert[]>([]);
    const { dismiss: dismissPrepAlert } = usePrepTimeAlerts(setPrepTimeAlerts);
    const [inventoryModalOrder, setInventoryModalOrder] = useState<Order | null>(null);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleApproveConfirm = async () => {
        if (!approvalModalOrder) return;
        try {
            await approveOrderMut({ variables: { id: approvalModalOrder.id } });
            setDismissedApprovalOrderIds((prev) => {
                const next = new Set(prev);
                next.delete(approvalModalOrder.id);
                return next;
            });
            toast.success('Order approved — moving to Pending');
            setApprovalModalOrder(null);
            setDetailsOpen(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve order');
        }
    };

    const handleToggleTrustedCustomer = async (user: NonNullable<Order['user']>, trust: boolean) => {
        setTrustUpdatingUserId(user.id);
        try {
            const nextNote = trust ? upsertTrustMarker(user.adminNote) : removeTrustMarker(user.adminNote);
            const nextFlagColor = trust
                ? 'green'
                : (nextNote ? ((user.flagColor && user.flagColor !== 'green') ? user.flagColor : 'yellow') : null);

            await updateUserNoteMut({
                variables: {
                    userId: user.id,
                    note: nextNote,
                    flagColor: nextFlagColor,
                },
            });
            toast.success(trust ? 'Customer marked as trusted' : 'Trusted flag removed');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update trusted customer status');
        } finally {
            setTrustUpdatingUserId(null);
        }
    };

    const drivers = useMemo(() => driversData?.drivers ?? [], [driversData]);
    const driverOptions = useMemo(() => [
        { value: "", label: "Unassigned" },
        ...drivers.map((d: any) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` })),
    ], [drivers]);

    const isSuperAdmin = admin?.role === "SUPER_ADMIN";
    const isAdmin = admin?.role === "ADMIN" || admin?.role === "SUPER_ADMIN";
    const isBusinessOwner = admin?.role === "BUSINESS_OWNER";
    const isBusinessEmployee = admin?.role === "BUSINESS_EMPLOYEE";
    const isBusinessUser = isBusinessOwner || isBusinessEmployee;

    const openApprovalModalForOrder = useCallback((order: Order) => {
        if (!isAdmin || !order.needsApproval) return;
        setApprovalModalOrder(order);
    }, [isAdmin]);

    const setApprovalModalSuppressionForUser = useCallback(async (user: NonNullable<Order['user']>, suppress: boolean) => {
        setSuppressionUpdatingUserId(user.id);
        try {
            const nextNote = suppress
                ? upsertApprovalModalSuppressMarker(user.adminNote)
                : removeApprovalModalSuppressMarker(user.adminNote);

            await updateUserNoteMut({
                variables: {
                    userId: user.id,
                    note: nextNote,
                    flagColor: user.flagColor ?? null,
                },
            });
            toast.success(suppress ? 'Auto-popup muted for this customer' : 'Auto-popup enabled for this customer');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update popup preference');
        } finally {
            setSuppressionUpdatingUserId(null);
        }
    }, [updateUserNoteMut]);

    const handleDismissApprovalModal = useCallback(() => {
        if (approvalModalOrder) {
            setDismissedApprovalOrderIds((prev) => {
                const next = new Set(prev);
                next.add(approvalModalOrder.id);
                return next;
            });
        }
        setApprovalModalOrder(null);
    }, [approvalModalOrder]);

    const normalizedOrders = useMemo(() => {
        const source = Array.isArray(orders) ? orders : [];
        return source.map((order: any) => ({
            ...order,
            businesses: normalizeOrderBusinesses(order),
        })) as Order[];
    }, [orders]);

    const matchesSearch = useCallback((order: Order, q: string) => {
        if (!q) return true;
        const lower = q.toLowerCase();
        // Exact match on displayId (case-insensitive)
        if (order.displayId?.toLowerCase() === lower) return true;
        // Also match if query is a number prefix of displayId for quick lookup
        if (/^\d+$/.test(q) && order.displayId?.startsWith(q)) return true;
        // Exact match on full UUID
        if (order.id.toLowerCase() === lower) return true;
        // Name / email: partial match is fine
        if (order.user) {
            const fullName = `${order.user.firstName} ${order.user.lastName}`.toLowerCase();
            if (fullName.includes(lower) || order.user.email.toLowerCase().includes(lower)) return true;
            if (order.user.phoneNumber && order.user.phoneNumber.includes(q)) return true;
        }
        return false;
    }, []);

    const filteredOrders = useMemo(() => {
        return normalizedOrders
            .slice()
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .filter(order => matchesSearch(order, debouncedSearch));
    }, [normalizedOrders, debouncedSearch, matchesSearch]);

    const activeOrders = useMemo(() =>
        filteredOrders
            .filter(order => order.status !== 'DELIVERED' && order.status !== 'CANCELLED')
            .sort((a, b) => {
                if (a.status === 'AWAITING_APPROVAL' && b.status !== 'AWAITING_APPROVAL') return -1;
                if (a.status !== 'AWAITING_APPROVAL' && b.status === 'AWAITING_APPROVAL') return 1;
                return 0;
            }),
        [filteredOrders]
    );

    useEffect(() => {
        if (!isAdmin) return;

        const flaggedOrders = activeOrders.filter((order) => {
            if (!order.needsApproval) return false;
            return !isApprovalModalSuppressed(order.user);
        });
        const seen = seenFlaggedOrderIdsRef.current;
        const newFlagged = flaggedOrders.filter((order) => !seen.has(order.id));

        flaggedOrders.forEach((order) => seen.add(order.id));

        if (!approvalModalOrder && newFlagged.length > 0) {
            setApprovalModalOrder(newFlagged[0]);
        }
    }, [activeOrders, approvalModalOrder, isAdmin]);

    const completedOrders = useMemo(() => {
        const source = Array.isArray(completedOrdersRaw) ? completedOrdersRaw : [];
        return source.map((order: any) => ({
            ...order,
            businesses: normalizeOrderBusinesses(order),
        })) as Order[];
    }, [completedOrdersRaw]);

    const filteredCompletedOrders = useMemo(() => {
        let result = completedOrders;
        if (debouncedSearch) {
            result = result.filter(order => matchesSearch(order, debouncedSearch));
        }
        if (completedStatusFilter !== "ALL") {
            result = result.filter((order) => order.status === completedStatusFilter);
        }
        return result;
    }, [completedOrders, completedStatusFilter, debouncedSearch, matchesSearch]);

    const selectedOrderTotals = useMemo(() => {
        if (!selectedOrder) {
            return null;
        }

        const itemsSubtotal = Number(selectedOrder.originalPrice ?? selectedOrder.orderPrice ?? 0);
        const itemsDiscount = roundMoney(Math.max(0, itemsSubtotal - Number(selectedOrder.orderPrice ?? 0)));
        const deliveryBase = Number(selectedOrder.originalDeliveryPrice ?? selectedOrder.deliveryPrice ?? 0);
        const deliveryDiscount = roundMoney(Math.max(0, deliveryBase - Number(selectedOrder.deliveryPrice ?? 0)));

        return {
            itemsSubtotal,
            itemsDiscount,
            deliveryBase,
            deliveryDiscount,
        };
    }, [selectedOrder]);

    /* ---- Handlers ---- */

    const handleNextStatus = async (order: Order) => {
        if (order.status === "PENDING") {
            setPrepTimeModalOrder(order);
            setPrepTimeMinutes("20");
            return;
        }

        if (isBusinessUser && order.status !== "PREPARING") return;

        const nextStatus = STATUS_FLOW[order.status];
        if (!nextStatus) return;

        setUpdatingOrderId(order.id);
        const result = await updateStatus(order.id, nextStatus);
        setUpdatingOrderId(null);
        if (!result.success) toast.error(result.error || "Failed to update order status.");
    };

    const handleStartPreparing = async () => {
        if (!prepTimeModalOrder) return;
        const minutes = parseInt(prepTimeMinutes, 10);
        if (!minutes || minutes < 1) { toast.warning("Enter a valid preparation time."); return; }
        try {
            await startPreparingMut({ variables: { id: prepTimeModalOrder.id, preparationMinutes: minutes } });
            setPrepTimeModalOrder(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to start preparing.");
        }
    };

    const handleUpdatePrepTime = async () => {
        if (!editPrepTimeOrder) return;
        const minutes = parseInt(editPrepTimeMinutes, 10);
        if (!minutes || minutes < 1) { toast.warning("Enter a valid preparation time."); return; }
        try {
            await updatePrepTimeMut({ variables: { id: editPrepTimeOrder.id, preparationMinutes: minutes } });
            setEditPrepTimeOrder(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to update preparation time.");
        }
    };

    const handleStatusChange = async (order: Order, newStatus: string) => {
        if (order.status === "PENDING" && newStatus === "PREPARING") {
            setPrepTimeModalOrder(order);
            setPrepTimeMinutes("20");
            return;
        }
        if (newStatus === "CANCELLED") {
            setCancelModalOrder(order);
            setCancelReason("");
            return;
        }
        setUpdatingOrderId(order.id);
        const result = await updateStatus(order.id, newStatus as OrderStatus);
        setUpdatingOrderId(null);
        if (!result.success) toast.error(result.error || "Failed to update order status.");
    };

    const handleAssignDriver = async (orderId: string, driverId: string) => {
        setAssigningDriverOrderId(orderId);
        try {
            await assignDriver({ variables: { id: orderId, driverId: driverId || null }, refetchQueries: ['GetOrders'] });
        } catch (error: any) {
            toast.error(error.message || "Failed to assign driver");
        } finally {
            setAssigningDriverOrderId(null);
        }
    };

    const handleOrderCardFocus = (order: Order) => {
        if (!isAdmin || !order.needsApproval) return;
        if (!dismissedApprovalOrderIds.has(order.id)) return;
        if (approvalModalOrder?.id === order.id) return;
        setApprovalModalOrder(order);
    };

    const openDetails = (order: Order) => {
        handleOrderCardFocus(order);
        setSelectedOrder(order);
        setDetailsOpen(true);
        if (isAdmin) {
            fetchOrderCoverage({ variables: { orderId: order.id } });
        }
    };

    const handleAdminCancel = async () => {
        if (!cancelModalOrder) return;
        const trimmed = cancelReason.trim();
        if (!trimmed) { toast.warning("Please provide a cancellation reason."); return; }
        try {
            await adminCancelOrderMut({ variables: {
                id: cancelModalOrder.id,
                reason: trimmed,
                settleDriver: cancelSettleDriver,
                settleBusiness: cancelSettleBusiness,
            } });
            toast.success("Order cancelled successfully.");
            setCancelModalOrder(null);
            setCancelReason("");
            setCancelSettleDriver(false);
            setCancelSettleBusiness(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel order.");
        }
    };

    /* ---- Loading ---- */

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-zinc-500">
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
                    Loading orders...
                </div>
            </div>
        );
    }

    /* ---- Render ---- */

    return (
        <div className="text-white max-w-[1600px] min-h-[calc(100vh-4rem)] flex flex-col">
            {/* HEADER BAR */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {/* Segmented tab control */}
                    <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'active'
                                    ? 'bg-zinc-700 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-300'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Active
                                <span className="text-xs text-zinc-500">({activeOrders.length})</span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'completed'
                                    ? 'bg-zinc-700 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-300'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                Completed
                                <span className="text-xs text-zinc-500">({completedTotalCount})</span>
                            </span>
                        </button>
                    </div>

                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <Input
                            type="text"
                            placeholder="Search by order #, customer name, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSuperAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try { await createTestOrder({ refetchQueries: ['GetOrders'] }); }
                                catch (err: any) { toast.error(err.message || 'Failed to create test order'); }
                            }}
                            disabled={creatingTestOrder}
                            className="flex items-center gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                            <Plus size={14} />
                            {creatingTestOrder ? 'Creating...' : 'Mock Order'}
                        </Button>
                    )}
                </div>
            </div>

            {/* ════════════════ ACTIVE ORDERS ════════════════ */}
            {activeTab === 'active' && <div className="mb-8">
                <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Active Orders</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeOrders.length === 0 ? (
                        <div className="col-span-full text-center text-zinc-600 py-12">
                            {debouncedSearch ? "No active orders matching your search" : "No active orders"}
                        </div>
                    ) : (
                        activeOrders.map((order) => {
                            const nextStatus = STATUS_FLOW[order.status];
                            const businessNames = getOrderBusinessesSafe(order).map(b => b.business.name).join(", ");
                            const preview = !isBusinessUser ? (order as any).settlementPreview : null;
                            const marginSeverity = preview ? getMarginSeverity(preview.netMargin) : null;
                            const approvalReasons = deriveApprovalReasons(order);
                            return (
                                <div
                                    key={order.id}
                                    tabIndex={0}
                                    onFocus={() => handleOrderCardFocus(order)}
                                    className={`bg-[#111113] border rounded-xl p-4 hover:border-zinc-700 transition-colors ${STATUS_COLORS[order.status].border}`}
                                >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <CopyableId displayId={order.displayId} />
                                                <div className="text-xs text-zinc-600 mt-1">
                                                    {new Date(order.orderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>

                                        {/* Approval/context badges */}
                                        {approvalReasons.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1 mb-3">
                                                {approvalReasons.includes('FIRST_ORDER') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-200">First order</span>
                                                )}
                                                {approvalReasons.includes('HIGH_VALUE') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-200">Over €20</span>
                                                )}
                                                {approvalReasons.includes('OUT_OF_ZONE') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-200">Outside delivery zone</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Customer + Business */}
                                        <div className="mb-3 pb-3 border-b border-zinc-800/60 space-y-1.5">
                                            {order.user && (
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-zinc-500" />
                                                    <span className="text-sm text-white font-medium">
                                                        {order.user.firstName} {order.user.lastName}
                                                    </span>
                                                    {typeof order.user.totalOrders === 'number' && (
                                                        <>
                                                            <span className="text-zinc-700">·</span>
                                                            <span className="text-xs text-zinc-500">{order.user.totalOrders} total orders</span>
                                                        </>
                                                    )}
                                                    {order.user.phoneNumber && (
                                                        <>
                                                            <span className="text-zinc-700">·</span>
                                                            <span className="text-xs text-zinc-500">{order.user.phoneNumber}</span>
                                                        </>
                                                    )}
                                                    {isTrustedCustomer(order.user) && (
                                                        <span className="ml-1 inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                            Trusted
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Store size={14} className="text-violet-500" />
                                                <span className="text-sm text-zinc-300">{businessNames}</span>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div className="mb-3 space-y-1">
                                            {getOrderBusinessesSafe(order).map((biz, idx) => (
                                                <div key={idx}>
                                                    {getBusinessItemsSafe(biz).slice(0, 3).map((item, itemIdx) => (
                                                        <div key={itemIdx}>
                                                            <div className="text-sm text-zinc-400 flex items-center gap-2">
                                                                <span className="text-zinc-600">×{item.quantity}</span>
                                                                <span>{item.name}</span>
                                                            </div>
                                                            {item.notes && (
                                                                <div className="text-xs text-zinc-500 italic ml-6 mt-0.5">
                                                                    Note: {item.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {getBusinessItemsSafe(biz).length > 3 && (
                                                        <div className="text-xs text-zinc-600 ml-6">+{getBusinessItemsSafe(biz).length - 3} more</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Address */}
                                        <div className="mb-3 flex items-start gap-2">
                                            <MapPin size={14} className="text-zinc-600 mt-0.5 flex-shrink-0" />
                                            <span className="text-xs text-zinc-500 line-clamp-1">{order.dropOffLocation.address}</span>
                                        </div>

                                        {/* Driver Notes */}
                                        {order.driverNotes && (
                                            <div className="mb-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                                <MessageSquare size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                <div className="text-xs text-blue-400">
                                                    <span className="font-semibold">Driver notes:</span> {order.driverNotes}
                                                </div>
                                            </div>
                                        )}

                                        {/* Needs approval banner */}
                                        {order.needsApproval && (
                                            <div className="mb-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                                                <span className="text-rose-400 text-xs font-semibold">⚠ Awaiting approval — call customer before approving</span>
                                            </div>
                                        )}

                                        {/* Out of zone badge */}
                                        {order.locationFlagged && (
                                            <div className="mb-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
                                                <MapPin size={13} className="text-orange-400 flex-shrink-0" />
                                                <span className="text-orange-400 text-xs font-semibold">Outside delivery zone</span>
                                            </div>
                                        )}

                                        {/* Inventory coverage badge */}
                                        {order.inventoryPrice != null && order.inventoryPrice > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setInventoryModalOrder(order); fetchOrderCoverage({ variables: { orderId: order.id } }); }}
                                                className="mb-3 w-full flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-2 hover:bg-violet-500/20 transition-colors text-left cursor-pointer"
                                            >
                                                <Package size={13} className="text-violet-400 flex-shrink-0" />
                                                <span className="text-violet-300 text-xs font-semibold">📦 Stock items — €{Number(order.inventoryPrice).toFixed(2)} from your inventory</span>
                                                <span className="ml-auto text-violet-500 text-[10px] whitespace-nowrap">View →</span>
                                            </button>
                                        )}

                                        {/* Prep time extended alert */}
                                        {(() => {
                                            const alert = prepTimeAlerts.find((a) => a.orderId === order.id);
                                            if (!alert) return null;
                                            return (
                                                <div className="mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
                                                    <Timer size={13} className="text-amber-400 flex-shrink-0" />
                                                    <span className="text-amber-400 text-xs font-semibold flex-1">
                                                        +{alert.addedMinutes} min (now {alert.newTotalMinutes} min)
                                                    </span>
                                                    <button
                                                        onClick={() => dismissPrepAlert(alert.orderId)}
                                                        className="text-amber-400/60 hover:text-amber-400 text-xs leading-none ml-1"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })()}

                                        {/* Prep time */}
                                        {order.status === "PREPARING" && order.preparationMinutes && (
                                            <div className="mb-3 flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2 text-violet-400 text-sm">
                                                    <Timer size={14} />
                                                    <span>~{order.estimatedReadyAt ? Math.max(0, Math.round((new Date(order.estimatedReadyAt).getTime() - now) / 60000)) : order.preparationMinutes} min</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditPrepTimeOrder(order);
                                                        setEditPrepTimeMinutes(String(order.preparationMinutes || 20));
                                                    }}
                                                    className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1"
                                                >
                                                    Edit
                                                </Button>
                                            </div>
                                        )}

                                        {/* Driver assignment (super admin) */}
                                        {isSuperAdmin && (
                                            <div className="mb-3">
                                                <Dropdown
                                                    value={order.driver?.id || ""}
                                                    onChange={(val) => handleAssignDriver(order.id, val)}
                                                    options={driverOptions}
                                                    disabled={assigningDriverOrderId === order.id}
                                                    className="w-full"
                                                />
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                                            <div>
                                                <div className="text-lg font-bold text-white">${order.totalPrice.toFixed(2)}</div>
                                                {preview && (
                                                    <div className="group relative">
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                            marginSeverity === 'healthy'
                                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                                : marginSeverity === 'thin'
                                                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                                        }`}>
                                                            M {preview.netMargin >= 0 ? '+' : ''}${preview.netMargin.toFixed(2)}
                                                        </span>
                                                        {!preview.driverAssigned && (
                                                            <span className="ml-1 inline-flex items-center rounded-full bg-zinc-500/15 border border-zinc-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                                                                No driver
                                                            </span>
                                                        )}
                                                        <div className="pointer-events-none absolute left-0 bottom-full z-[120] mb-2 rounded-md border border-zinc-700 bg-[#0a0a0d] p-2 text-left text-[11px] text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                                                            <div className="font-semibold text-zinc-200 mb-1">Settlement breakdown</div>
                                                            {preview.lineItems.map((item: any, i: number) => (
                                                                <div key={i} className="flex justify-between gap-2">
                                                                    <span className="text-zinc-500 truncate">{item.reason}</span>
                                                                    <span className={item.direction === 'RECEIVABLE' ? 'text-emerald-300' : 'text-rose-300'}>
                                                                        {item.direction === 'RECEIVABLE' ? '+' : '-'}${item.amount.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <div className="flex justify-between border-t border-zinc-700 mt-1 pt-1">
                                                                <span className="text-zinc-500">Net margin</span>
                                                                <span className={preview.netMargin >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                                                                    {preview.netMargin >= 0 ? '+' : ''}${preview.netMargin.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {order.needsApproval && isAdmin && (
                                                    <button
                                                        onClick={() => openApprovalModalForOrder(order)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all bg-green-500/10 text-green-400 border-green-500/30 hover:brightness-125"
                                                    >
                                                        ✓ Approve
                                                    </button>
                                                )}
                                                {nextStatus && (() => {
                                                    const c = STATUS_COLORS[nextStatus];
                                                    return (
                                                        <button
                                                            onClick={() => handleNextStatus(order)}
                                                            disabled={updateLoading && updatingOrderId === order.id}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${c.bg} ${c.text} ${c.border} hover:brightness-125`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                                            {STATUS_LABELS[nextStatus]}
                                                            <ArrowRight size={12} />
                                                        </button>
                                                    );
                                                })()}
                                                {isSuperAdmin && (
                                                    <Dropdown
                                                        value={order.status}
                                                        onChange={(val) => handleStatusChange(order, val)}
                                                        options={STATUS_OPTIONS}
                                                        disabled={updateLoading && updatingOrderId === order.id}
                                                        className="min-w-[130px]"
                                                    />
                                                )}
                                                {isAdmin && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setCancelModalOrder(order); setCancelReason(""); setCancelSettleDriver(false); setCancelSettleBusiness(false); }}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => openDetails(order)}>Details</Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
            </div>}

            {/* ════════════════ COMPLETED ORDERS ════════════════ */}
            {activeTab === 'completed' && (
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Completed Orders</h2>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant={completedStatusFilter === "ALL" ? "outline" : "ghost"}
                                onClick={() => setCompletedStatusFilter("ALL")}
                                className="h-8 px-3 text-xs"
                            >
                                All ({completedTotalCount})
                            </Button>
                            <Button
                                size="sm"
                                variant={completedStatusFilter === "DELIVERED" ? "outline" : "ghost"}
                                onClick={() => setCompletedStatusFilter("DELIVERED")}
                                className="h-8 px-3 text-xs text-green-400"
                            >
                                Delivered
                            </Button>
                            <Button
                                size="sm"
                                variant={completedStatusFilter === "CANCELLED" ? "outline" : "ghost"}
                                onClick={() => setCompletedStatusFilter("CANCELLED")}
                                className="h-8 px-3 text-xs text-red-400"
                            >
                                Cancelled
                            </Button>
                        </div>
                    </div>

                    {/* Date range filters */}
                    <div className="flex items-center gap-3 mb-4 bg-[#0d0d0f] border border-zinc-800 rounded-xl px-4 py-3">
                        <Calendar size={14} className="text-zinc-500 flex-shrink-0" />
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-500">From</label>
                            <input
                                type="date"
                                value={completedStartDate}
                                onChange={(e) => { setCompletedStartDate(e.target.value); setCompletedPage(0); }}
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-500">To</label>
                            <input
                                type="date"
                                value={completedEndDate}
                                onChange={(e) => { setCompletedEndDate(e.target.value); setCompletedPage(0); }}
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                            />
                        </div>

                        {/* Quick presets */}
                        <div className="h-5 w-px bg-zinc-700" />
                        {[
                            { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; setCompletedStartDate(d); setCompletedEndDate(d); setCompletedPage(0); } },
                            { label: "Yesterday", fn: () => { const d = new Date(Date.now() - 86400000).toISOString().split("T")[0]; setCompletedStartDate(d); setCompletedEndDate(d); setCompletedPage(0); } },
                            { label: "Last 7d", fn: () => { setCompletedStartDate(new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]); setCompletedEndDate(new Date().toISOString().split("T")[0]); setCompletedPage(0); } },
                            { label: "This Month", fn: () => { const n = new Date(); setCompletedStartDate(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0]); setCompletedEndDate(n.toISOString().split("T")[0]); setCompletedPage(0); } },
                        ].map((preset) => (
                            <button
                                key={preset.label}
                                onClick={preset.fn}
                                className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                            >
                                {preset.label}
                            </button>
                        ))}

                        {(completedStartDate || completedEndDate) && (
                            <button
                                onClick={() => { setCompletedStartDate(""); setCompletedEndDate(""); setCompletedPage(0); }}
                                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <X size={12} />
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0d0d0f]">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-900/70 border-b border-zinc-800">
                                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                                    <th className="px-3 py-2.5 font-medium">Order</th>
                                    <th className="px-3 py-2.5 font-medium">Customer</th>
                                    <th className="px-3 py-2.5 font-medium">Business</th>
                                    <th className="px-3 py-2.5 font-medium">Status</th>
                                    <th className="px-3 py-2.5 font-medium">Total</th>
                                    {!isBusinessUser && <th className="px-3 py-2.5 font-medium">Margin</th>}
                                    <th className="px-3 py-2.5 font-medium">Incident</th>
                                    <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompletedOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={isBusinessUser ? 7 : 8}
                                            className="px-3 py-12 text-center text-zinc-600"
                                        >
                                            {debouncedSearch
                                                ? "No completed orders matching your search"
                                                : completedStatusFilter === "ALL"
                                                    ? "No completed orders yet"
                                                    : `No ${completedStatusFilter.toLowerCase()} orders found`}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCompletedOrders.map((order) => {
                                        const businessNames = getOrderBusinessesSafe(order).map((b) => b.business.name).join(", ");
                                        const preview = !isBusinessUser ? (order as any).settlementPreview : null;
                                        const marginSeverity = preview ? getMarginSeverity(preview.netMargin) : null;
                                        return (
                                            <tr key={order.id} className="border-b border-zinc-800/70 hover:bg-zinc-900/40">
                                                <td className="px-3 py-3 align-top">
                                                    <div className="space-y-1">
                                                        <CopyableId displayId={order.displayId} />
                                                        <div className="text-xs text-zinc-600">
                                                            {new Date(order.orderDate).toLocaleString([], {
                                                                month: "short",
                                                                day: "2-digit",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 align-top">
                                                    {order.user ? (
                                                        <div>
                                                            <div className="text-zinc-200">
                                                                {order.user.firstName} {order.user.lastName}
                                                            </div>
                                                            {order.user.phoneNumber && (
                                                                <div className="text-xs text-zinc-500">{order.user.phoneNumber}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-top">
                                                    <div className="text-zinc-300 max-w-[300px] truncate" title={businessNames || "-"}>
                                                        {businessNames || "-"}
                                                    </div>
                                                    {order.driver && (
                                                        <div className="text-xs text-zinc-500 mt-1">
                                                            Driver: {order.driver.firstName} {order.driver.lastName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-top">
                                                    {isSuperAdmin ? (
                                                        <Dropdown
                                                            value={order.status}
                                                            onChange={(val) => handleStatusChange(order, val)}
                                                            options={STATUS_OPTIONS}
                                                            disabled={updateLoading && updatingOrderId === order.id}
                                                            className="min-w-[130px]"
                                                        />
                                                    ) : (
                                                        <StatusBadge status={order.status} />
                                                    )}
                                                    {order.status === "CANCELLED" && order.cancellationReason && (
                                                        <div className="text-xs text-red-400/80 mt-1 max-w-[220px] truncate" title={order.cancellationReason}>
                                                            {order.cancellationReason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-top font-semibold text-white">
                                                    ${order.totalPrice.toFixed(2)}
                                                </td>
                                                {!isBusinessUser && (
                                                    <td className="px-3 py-3 align-top">
                                                        {preview ? (
                                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                                marginSeverity === 'healthy'
                                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                                    : marginSeverity === 'negative'
                                                                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                                                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                            }`}>
                                                                M {preview.netMargin >= 0 ? '+' : ''}€{preview.netMargin.toFixed(2)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-600">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-3 py-3 align-top max-w-[160px]">
                                                    {(() => {
                                                        const inc = parseAdminNote(order.adminNote);
                                                        if (!inc) return <span className="text-zinc-700 text-xs">—</span>;
                                                        return (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold uppercase tracking-wide">
                                                                    {INCIDENT_TAG_LABELS[inc.tag] ?? inc.tag}
                                                                </span>
                                                                {inc.note && (
                                                                    <div className="text-xs text-zinc-400 line-clamp-2" title={inc.note}>{inc.note}</div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 py-3 align-top text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => openDetails(order)}>Details</Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Completed orders pagination */}
                    <div className="flex items-center justify-between py-3 border-t border-zinc-800 mt-auto">
                        <span className="text-xs text-zinc-500">
                            Page {completedPage + 1} · {completedTotalCount} completed orders total
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCompletedPage(p => Math.max(0, p - 1))}
                                disabled={completedPage === 0 || completedLoading}
                            >
                                ← Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCompletedPage(p => p + 1)}
                                disabled={!completedHasMore || completedLoading}
                            >
                                Next →
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ ACTIVE ORDERS PAGINATION ════════════════ */}
            {activeTab === 'active' && !debouncedSearch && (
                <div className="flex items-center justify-between py-4 border-t border-zinc-800 mt-auto">
                    <span className="text-xs text-zinc-500">
                        Page {ordersPage + 1} · {totalCount} active orders total
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOrdersPage(p => Math.max(0, p - 1))}
                            disabled={ordersPage === 0 || loading}
                        >
                            ← Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOrdersPage(p => p + 1)}
                            disabled={!hasMore || loading}
                        >
                            Next →
                        </Button>
                    </div>
                </div>
            )}

            {/* ════════════════ ORDER DETAILS MODAL ════════════════ */}
            <Modal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="Order Details">
                {selectedOrder && (() => {
                    const isCompleted = selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'CANCELLED';
                    const businessList = getOrderBusinessesSafe(selectedOrder);
                    const totalItems = businessList.reduce((s, biz) => s + getBusinessItemsSafe(biz).reduce((ss, item) => ss + (item.quantity || 1), 0), 0);
                    const preview = !isBusinessUser ? (selectedOrder as any).settlementPreview : null;
                    const marginSeverity = preview ? getMarginSeverity(preview.netMargin) : null;

                    return (
                        <div className="space-y-5">
                            {/* ── Header: ID + status + time ── */}
                            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-lg font-bold text-white">{selectedOrder.displayId}</span>
                                        <StatusBadge status={selectedOrder.status} />
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={11} />
                                            {new Date(selectedOrder.orderDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {new Date(selectedOrder.orderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <span className="text-zinc-700">·</span>
                                        <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Customer + Driver row ── */}
                            <div className="grid grid-cols-2 gap-3">
                                {selectedOrder.user && (
                                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User size={13} className="text-zinc-500" />
                                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Customer</span>
                                        </div>
                                        <div className="text-white text-sm font-medium">
                                            {selectedOrder.user.firstName} {selectedOrder.user.lastName}
                                        </div>
                                        <div className="text-zinc-500 text-xs mt-0.5">{selectedOrder.user.email}</div>
                                        {typeof selectedOrder.user.totalOrders === 'number' && (
                                            <div className="text-zinc-500 text-xs mt-0.5">{selectedOrder.user.totalOrders} total orders</div>
                                        )}
                                        {selectedOrder.user.phoneNumber && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <Phone size={11} className="text-zinc-600" />
                                                <span className="text-zinc-400 text-xs">{selectedOrder.user.phoneNumber}</span>
                                            </div>
                                        )}
                                        <div className="mt-2 flex items-center gap-2">
                                            {isTrustedCustomer(selectedOrder.user) && (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                    Trusted customer
                                                </span>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    disabled={trustUpdatingUserId === selectedOrder.user.id}
                                                    onClick={() => handleToggleTrustedCustomer(selectedOrder.user!, !isTrustedCustomer(selectedOrder.user))}
                                                    className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                                >
                                                    {trustUpdatingUserId === selectedOrder.user.id
                                                        ? 'Saving...'
                                                        : isTrustedCustomer(selectedOrder.user)
                                                            ? 'Untrust'
                                                            : 'Mark trusted'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Truck size={13} className="text-zinc-500" />
                                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Driver</span>
                                    </div>
                                    {selectedOrder.driver ? (
                                        <>
                                            <div className="text-white text-sm font-medium">
                                                {selectedOrder.driver.firstName} {selectedOrder.driver.lastName}
                                            </div>
                                            <div className="text-zinc-500 text-xs mt-0.5">{selectedOrder.driver.email}</div>
                                        </>
                                    ) : (
                                        <div className="text-zinc-600 text-sm">Not assigned</div>
                                    )}
                                </div>
                            </div>

                            {/* ── Cancellation info ── */}
                            {selectedOrder.status === 'CANCELLED' && (selectedOrder.cancellationReason || selectedOrder.cancelledAt) && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                    <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1.5 font-semibold">Cancellation</div>
                                    {selectedOrder.cancelledAt && (
                                        <div className="text-xs text-zinc-500 mb-1">
                                            {new Date(selectedOrder.cancelledAt).toLocaleString()}
                                        </div>
                                    )}
                                    {selectedOrder.cancellationReason && (
                                        <div className="text-sm text-red-200">{selectedOrder.cancellationReason}</div>
                                    )}
                                </div>
                            )}

                            {/* ── Delivery address ── */}
                            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <MapPin size={13} className="text-zinc-500" />
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Delivery Address</span>
                                </div>
                                <span className="text-white text-sm">{selectedOrder.dropOffLocation.address}</span>
                            </div>

                            {/* ── Driver Notes ── */}
                            {selectedOrder.driverNotes && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <MessageSquare size={13} className="text-blue-400" />
                                        <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Delivery Instructions</span>
                                    </div>
                                    <span className="text-blue-200 text-sm">{selectedOrder.driverNotes}</span>
                                </div>
                            )}

                            {/* ── Needs approval ── */}
                            {selectedOrder.needsApproval && (
                                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                                    <div className="text-[10px] text-rose-400 uppercase tracking-wider mb-1.5 font-semibold">Awaiting Approval</div>
                                    <p className="text-rose-200 text-sm">This order requires manual approval. Call the customer to verify, then click Approve.</p>
                                    {deriveApprovalReasons(selectedOrder).length > 0 && (
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {deriveApprovalReasons(selectedOrder).includes('FIRST_ORDER') && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-200">First order</span>
                                            )}
                                            {deriveApprovalReasons(selectedOrder).includes('HIGH_VALUE') && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-200">Over €20</span>
                                            )}
                                            {deriveApprovalReasons(selectedOrder).includes('OUT_OF_ZONE') && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-200">Outside delivery zone</span>
                                            )}
                                        </div>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => openApprovalModalForOrder(selectedOrder)}
                                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-green-500/10 text-green-400 border-green-500/30 hover:brightness-125 disabled:opacity-50"
                                        >
                                            ✓ Approve Order
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ── Location flagged ── */}
                            {selectedOrder.locationFlagged && (
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                                    <div className="text-[10px] text-orange-400 uppercase tracking-wider mb-1.5 font-semibold">Outside Delivery Zone</div>
                                    <p className="text-orange-200 text-sm">The drop-off location is outside all active delivery zones. Confirm with the customer before dispatching.</p>
                                </div>
                            )}

                            {/* ── Items grouped by business ── */}
                            <div className="space-y-4">
                                {businessList.map((biz, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2 px-1">
                                            <Store size={14} className="text-violet-500" />
                                            <span className="font-medium text-white text-sm">{biz.business.name}</span>
                                            <span className="text-[10px] text-zinc-600 uppercase">{biz.business.businessType}</span>
                                        </div>

                                        <div className="overflow-hidden border border-zinc-800 rounded-lg">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-[#09090b] border-b border-zinc-800">
                                                        <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                                                        <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Price</th>
                                                        <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getBusinessItemsSafe(biz).map((item, itemIdx) => {
                                                        const displayUnitPrice = Number(item.unitPrice ?? item.basePrice ?? 0);
                                                        const displayLineTotal = Number(item.quantity || 0) * displayUnitPrice;
                                                        const invQty = (item as any).inventoryQuantity ?? 0;
                                                        const marketQty = item.quantity - invQty;
                                                        return (
                                                            <tr key={itemIdx} className="border-b border-zinc-800/60 hover:bg-zinc-900/30">
                                                                <td className="px-3 py-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        {item.imageUrl && (
                                                                            <img src={item.imageUrl} alt={item.name} className="w-7 h-7 rounded object-cover" />
                                                                        )}
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-white text-sm truncate">{item.name}</div>
                                                                            <div className="text-zinc-600 text-xs">×{item.quantity}</div>
                                                                            {item.notes && (
                                                                                <div className="text-blue-400 text-xs italic mt-1">
                                                                                    Note: {item.notes}
                                                                                </div>
                                                                            )}
                                                                            {invQty > 0 && (
                                                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                                                                                        📦 {invQty} from your stock
                                                                                    </span>
                                                                                    {marketQty > 0 && (
                                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 border border-zinc-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                                                                                            🛒 {marketQty} from market
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {invQty === 0 && item.quantity > 0 && (() => {
                                                                                const covMap = coverageData?.orderCoverage?.orderId === selectedOrder?.id
                                                                                    ? new Map(coverageData.orderCoverage.items.map((c: any) => [c.productId, c]))
                                                                                    : null;
                                                                                const hasCovData = covMap !== null;
                                                                                if (hasCovData && covMap!.size > 0) {
                                                                                    return (
                                                                                        <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-zinc-500/10 border border-zinc-600/30 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                                                                                            🛒 Buy from market
                                                                                        </span>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right text-sm text-zinc-300">€{displayUnitPrice.toFixed(2)}</td>
                                                                <td className="px-3 py-2.5 text-right text-sm font-medium text-white">
                                                                    €{displayLineTotal.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Price breakdown ── */}
                            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <CreditCard size={13} className="text-zinc-500" />
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Price Breakdown</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Subtotal</span>
                                    <span className="text-zinc-300">€{Number(selectedOrderTotals?.itemsSubtotal ?? selectedOrder.orderPrice).toFixed(2)}</span>
                                </div>
                                {(selectedOrderTotals?.itemsDiscount ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500 flex items-center gap-1"><Tag size={11} /> Promotions</span>
                                        <span className="text-emerald-300">-€{Number(selectedOrderTotals?.itemsDiscount ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 flex items-center gap-1"><Truck size={11} /> Delivery</span>
                                    <span className="text-amber-300">€{Number(selectedOrderTotals?.deliveryBase ?? selectedOrder.deliveryPrice).toFixed(2)}</span>
                                </div>
                                {(selectedOrderTotals?.deliveryDiscount ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Delivery Promotion</span>
                                        <span className="text-emerald-300">-€{Number(selectedOrderTotals?.deliveryDiscount ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-800">
                                    <span className="text-emerald-300">Total</span>
                                    <span className="text-emerald-300">€{selectedOrder.totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* ── Applied Promotions ── */}
                            {(selectedOrder.orderPromotions?.length ?? 0) > 0 && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Tag size={13} className="text-emerald-400" />
                                        <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Applied Promotions</span>
                                    </div>
                                    {selectedOrder.orderPromotions!.map((promo) => (
                                        <div key={promo.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                                    {promo.appliesTo === 'DELIVERY' ? 'Delivery' : 'Order'}
                                                </span>
                                                {promo.promoCode && (
                                                    <span className="font-mono text-xs text-zinc-400">{promo.promoCode}</span>
                                                )}
                                            </div>
                                            <span className="text-emerald-300 font-semibold">-€{promo.discountAmount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Settlement / Platform margin (admin only) ── */}
                            {!isBusinessUser && preview && (() => {
                                const severity = getMarginSeverity(preview.netMargin);
                                const borderClass = severity === 'healthy' ? 'border-emerald-500/30' : severity === 'negative' ? 'border-rose-500/30' : 'border-zinc-500/30';
                                const bgClass = severity === 'healthy' ? 'bg-emerald-500/10' : severity === 'negative' ? 'bg-rose-500/10' : 'bg-zinc-500/10';
                                const textClass = severity === 'healthy' ? 'text-emerald-300' : severity === 'negative' ? 'text-rose-300' : 'text-zinc-400';
                                return (
                                    <div className={`border rounded-xl p-4 space-y-3 ${bgClass} ${borderClass}`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] uppercase tracking-wider font-medium ${textClass}`}>Platform Margin</span>
                                            <div className="flex items-center gap-2">
                                                {!preview.driverAssigned && (
                                                    <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                                        No driver
                                                    </span>
                                                )}
                                                <span className={`text-lg font-bold ${textClass}`}>
                                                    {preview.netMargin >= 0 ? '+' : ''}€{preview.netMargin.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                                            <span>Receivable <span className="text-emerald-300 font-semibold">€{preview.totalReceivable.toFixed(2)}</span></span>
                                            <span>Payable <span className="text-rose-300 font-semibold">€{preview.totalPayable.toFixed(2)}</span></span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                                            {preview.lineItems.map((li: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-700/40 bg-[#09090b]/70 px-2.5 py-1.5">
                                                    <span className="text-zinc-500 truncate mr-2">{li.reason}</span>
                                                    <span className={`font-semibold whitespace-nowrap ${li.direction === 'RECEIVABLE' ? 'text-emerald-200' : 'text-rose-300'}`}>
                                                        {li.direction === 'RECEIVABLE' ? '+' : '-'}€{li.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Inventory Coverage (admin only) ── */}
                            {isAdmin && (() => {
                                const coverage = coverageData?.orderCoverage;
                                if (coverageLoading) {
                                    return (
                                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                            <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-2">Fulfillment Guide</div>
                                            <div className="text-xs text-zinc-600">Loading coverage...</div>
                                        </div>
                                    );
                                }
                                if (!coverage || coverage.orderId !== selectedOrder.id) return null;
                                if (coverage.allFromMarket) return null; // Nothing from stock — no need to show

                                const statusColor = (s: string) => {
                                    if (s === 'FULLY_OWNED') return 'text-violet-300 bg-violet-500/10 border-violet-500/30';
                                    if (s === 'PARTIALLY_OWNED') return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
                                    return 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30';
                                };
                                const stockItems = coverage.items.filter((i: any) => i.fromStock > 0);
                                const marketItems = coverage.items.filter((i: any) => i.fromMarket > 0 && i.fromStock === 0);
                                const mixedItems = coverage.items.filter((i: any) => i.fromMarket > 0 && i.fromStock > 0);

                                return (
                                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package size={13} className="text-violet-400" />
                                                <span className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold">Fulfillment Guide</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {coverage.deducted ? (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">✓ Stock deducted</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={deductingStock}
                                                        onClick={async () => {
                                                            try {
                                                                await deductOrderStockMut({ variables: { orderId: selectedOrder.id } });
                                                                fetchOrderCoverage({ variables: { orderId: selectedOrder.id } });
                                                                toast.success('Stock deducted successfully.');
                                                            } catch (err: any) {
                                                                toast.error(err.message || 'Failed to deduct stock.');
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:brightness-125 disabled:opacity-50"
                                                    >
                                                        {deductingStock ? 'Running...' : '↺ Force re-deduct'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items from your stock */}
                                        {(stockItems.length > 0 || mixedItems.length > 0) && (
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-violet-300/70 font-medium uppercase tracking-wider flex items-center gap-1">
                                                    📦 Pick from your stock
                                                </div>
                                                {[...stockItems, ...mixedItems].map((item: any) => (
                                                    <div key={item.productId} className="flex items-center justify-between text-xs bg-violet-500/5 rounded-lg px-2 py-1.5">
                                                        <span className="text-zinc-300 font-medium truncate mr-2">{item.productName}</span>
                                                        <span className="text-violet-300 font-semibold whitespace-nowrap">×{item.fromStock}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Items to buy from market */}
                                        {(marketItems.length > 0 || mixedItems.length > 0) && (
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-zinc-400/70 font-medium uppercase tracking-wider flex items-center gap-1">
                                                    🛒 Buy from market
                                                </div>
                                                {[...marketItems, ...mixedItems].map((item: any) => (
                                                    <div key={`${item.productId}-mkt`} className="flex items-center justify-between text-xs bg-zinc-500/5 rounded-lg px-2 py-1.5">
                                                        <span className="text-zinc-400 truncate mr-2">{item.productName}</span>
                                                        <span className="text-zinc-300 font-semibold whitespace-nowrap">×{item.fromMarket}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* ── Comp delivery action (active orders only) ── */}
                            {isAdmin && selectedOrder.user && !isCompleted && (
                                <div className="pt-2 border-t border-zinc-800">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={grantingFreeDelivery}
                                        onClick={async () => {
                                            try {
                                                await grantFreeDeliveryMut({ variables: { userId: selectedOrder.user!.id, orderId: selectedOrder.id } });
                                                toast.success(`Free delivery granted for ${selectedOrder.user!.firstName}'s next order.`);
                                            } catch (err: any) {
                                                toast.error(err.message || 'Failed to grant free delivery.');
                                            }
                                        }}
                                        className="w-full border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                                    >
                                        {grantingFreeDelivery ? 'Granting...' : '🎁 Comp next delivery (free delivery on next order)'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>

            {/* ════════════════ PREP TIME MODAL ════════════════ */}
            <Modal isOpen={!!prepTimeModalOrder} onClose={() => setPrepTimeModalOrder(null)} title="Start Preparing">
                {prepTimeModalOrder && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                            <ChefHat size={24} />
                            <div>
                                <div className="font-medium">Order {prepTimeModalOrder.displayId}</div>
                                <div className="text-sm text-zinc-500 mt-1">How long will it take to prepare?</div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">Preparation Time (minutes)</label>
                            <Input
                                type="number" min="1" max="180"
                                value={prepTimeMinutes}
                                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                                className="text-center text-lg"
                                placeholder="20"
                            />
                            <div className="flex gap-2 mt-2">
                                {[10, 15, 20, 30, 45, 60].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setPrepTimeMinutes(String(m))}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${
                                            prepTimeMinutes === String(m)
                                                ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                                                : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                        }`}
                                    >
                                        {m} min
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setPrepTimeModalOrder(null)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleStartPreparing} disabled={startPreparingLoading}>
                                {startPreparingLoading ? "Starting..." : "Start Preparing"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════════════════ EDIT PREP TIME MODAL ════════════════ */}
            <Modal isOpen={!!editPrepTimeOrder} onClose={() => setEditPrepTimeOrder(null)} title="Update Preparation Time">
                {editPrepTimeOrder && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">New Preparation Time (minutes)</label>
                            <Input
                                type="number" min="1" max="180"
                                value={editPrepTimeMinutes}
                                onChange={(e) => setEditPrepTimeMinutes(e.target.value)}
                                className="text-center text-lg"
                            />
                            <div className="flex gap-2 mt-2">
                                {[10, 15, 20, 30, 45, 60].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setEditPrepTimeMinutes(String(m))}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${
                                            editPrepTimeMinutes === String(m)
                                                ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                                                : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                        }`}
                                    >
                                        {m} min
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setEditPrepTimeOrder(null)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleUpdatePrepTime}>Update Time</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════════════════ CANCEL ORDER MODAL ════════════════ */}
            <Modal isOpen={!!cancelModalOrder} onClose={() => { setCancelModalOrder(null); setCancelReason(""); setCancelSettleDriver(false); setCancelSettleBusiness(false); }} title="Cancel Order">                {cancelModalOrder && (() => {
                    const preview = !isBusinessUser ? (cancelModalOrder as any).settlementPreview : null;
                    const hasDriver = !!cancelModalOrder.driver;
                    const businessReceivable = preview
                        ? preview.lineItems.filter((li: any) => li.direction === 'RECEIVABLE' && li.businessId).reduce((s: number, li: any) => s + li.amount, 0)
                        : 0;
                    const driverPayable = preview
                        ? preview.lineItems.filter((li: any) => li.direction === 'PAYABLE' && li.driverId).reduce((s: number, li: any) => s + li.amount, 0)
                        : 0;
                    return (
                        <div className="space-y-4">
                            {/* Order summary */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <div className="font-medium text-red-400">Order {cancelModalOrder.displayId}</div>
                                {cancelModalOrder.user && (
                                    <div className="text-sm text-zinc-400 mt-0.5">
                                        {cancelModalOrder.user.firstName} {cancelModalOrder.user.lastName}
                                    </div>
                                )}
                                <div className="text-sm text-zinc-500 mt-1">${cancelModalOrder.totalPrice.toFixed(2)}</div>
                            </div>

                            {/* Financial impact */}
                            {preview && (
                                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 space-y-2">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Settlement on Cancellation</div>
                                    <div className="text-[10px] text-zinc-600 mb-1">Check to create a settlement for that party even though the order is cancelled.</div>
                                    <div className="space-y-2">
                                        {/* Business → Platform */}
                                        <label className="flex items-center justify-between gap-3 cursor-pointer group">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={cancelSettleBusiness}
                                                    onChange={(e) => setCancelSettleBusiness(e.target.checked)}
                                                    className="w-4 h-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-sky-400 cursor-pointer"
                                                />
                                                <span className="text-xs text-zinc-400 select-none">
                                                    <span className="text-sky-400 font-medium">Business</span>
                                                    <span className="text-zinc-600 mx-1">→</span>
                                                    <span className="text-zinc-300">Platform</span>
                                                    <span className="text-zinc-600 ml-1 text-[10px]">(commission + markup)</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className={`font-semibold text-sm transition-colors ${
                                                    cancelSettleBusiness ? "text-sky-300" : "text-zinc-500"
                                                }`}>
                                                    ~€{businessReceivable.toFixed(2)}
                                                </span>
                                                <span className={`text-[10px] font-normal ${
                                                    cancelSettleBusiness ? "text-sky-400" : "text-zinc-600"
                                                }`}>
                                                    {cancelSettleBusiness ? "settle" : "skip"}
                                                </span>
                                            </div>
                                        </label>

                                        {/* Platform → Driver */}
                                        <label className={`flex items-center justify-between gap-3 ${
                                            hasDriver ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                                        }`}>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={cancelSettleDriver}
                                                    onChange={(e) => setCancelSettleDriver(e.target.checked)}
                                                    disabled={!hasDriver}
                                                    className="w-4 h-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-amber-400 cursor-pointer disabled:cursor-not-allowed"
                                                />
                                                <span className="text-xs text-zinc-400 select-none">
                                                    <span className="text-zinc-300">Platform</span>
                                                    <span className="text-zinc-600 mx-1">→</span>
                                                    <span className={hasDriver ? "text-amber-400 font-medium" : "text-zinc-500"}>
                                                        {hasDriver
                                                            ? `Driver (${cancelModalOrder.driver!.firstName} ${cancelModalOrder.driver!.lastName})`
                                                            : "Driver (no driver assigned)"}
                                                    </span>
                                                    <span className="text-zinc-600 ml-1 text-[10px]">(delivery commission)</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className={`font-semibold text-sm transition-colors ${
                                                    hasDriver
                                                        ? cancelSettleDriver ? "text-amber-300" : "text-zinc-500"
                                                        : "text-zinc-600"
                                                }`}>
                                                    ~€{driverPayable.toFixed(2)}
                                                </span>
                                                <span className={`text-[10px] font-normal ${
                                                    !hasDriver ? "text-zinc-600" :
                                                    cancelSettleDriver ? "text-amber-400" : "text-zinc-600"
                                                }`}>
                                                    {!hasDriver ? "n/a" : cancelSettleDriver ? "settle" : "skip"}
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">
                                    Cancellation Reason <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="e.g. Customer requested cancellation by phone, restaurant closed early..."
                                    rows={3}
                                    className="w-full rounded-lg bg-[#09090b] border border-zinc-800 text-white text-sm px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => { setCancelModalOrder(null); setCancelReason(""); setCancelSettleDriver(false); setCancelSettleBusiness(false); }}>
                                    Go Back
                                </Button>
                                <Button
                                    className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                                    onClick={handleAdminCancel}
                                    disabled={cancellingOrder || !cancelReason.trim()}
                                >
                                    {cancellingOrder ? "Cancelling..." : "Confirm Cancel"}
                                </Button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ── Inventory Coverage Modal ── */}
            {inventoryModalOrder && (
                <InventoryCoverageModal
                    orderId={inventoryModalOrder.id}
                    displayId={inventoryModalOrder.displayId}
                    coverage={coverageData?.orderCoverage as any}
                    loading={coverageLoading}
                    onClose={() => setInventoryModalOrder(null)}
                />
            )}

            {/* ── Approval Confirmation Modal ── */}
            <Modal isOpen={!!approvalModalOrder} onClose={handleDismissApprovalModal} title="Approve Order">
                {approvalModalOrder && (
                    <div className="space-y-4">
                        {/* Order summary */}
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                            <div className="font-medium text-rose-300">Order {approvalModalOrder.displayId}</div>
                            {approvalModalOrder.user && (
                                <>
                                    <div className="text-sm text-zinc-400 mt-0.5">
                                        {approvalModalOrder.user.firstName} {approvalModalOrder.user.lastName}
                                    </div>
                                    {typeof approvalModalOrder.user.totalOrders === 'number' && (
                                        <div className="text-xs text-zinc-500 mt-1">
                                            {approvalModalOrder.user.totalOrders} total orders
                                        </div>
                                    )}
                                    {approvalModalOrder.user.phoneNumber && (
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                                            <Phone size={11} className="text-zinc-600" />
                                            <a href={`tel:${approvalModalOrder.user.phoneNumber}`} className="hover:text-white transition-colors">
                                                {approvalModalOrder.user.phoneNumber}
                                            </a>
                                        </div>
                                    )}
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            disabled={trustUpdatingUserId === approvalModalOrder.user.id}
                                            onClick={() => handleToggleTrustedCustomer(approvalModalOrder.user!, !isTrustedCustomer(approvalModalOrder.user))}
                                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                                                isTrustedCustomer(approvalModalOrder.user)
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                        >
                                            {trustUpdatingUserId === approvalModalOrder.user.id
                                                ? 'Saving...'
                                                : isTrustedCustomer(approvalModalOrder.user)
                                                    ? 'Trusted customer: enabled'
                                                    : 'Mark as trusted customer'}
                                        </button>
                                    </div>
                                    <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                                        <input
                                            type="checkbox"
                                            disabled={suppressionUpdatingUserId === approvalModalOrder.user?.id}
                                            checked={isApprovalModalSuppressed(approvalModalOrder.user)}
                                            onChange={(e) => {
                                                if (!approvalModalOrder.user) return;
                                                void setApprovalModalSuppressionForUser(approvalModalOrder.user, e.target.checked);
                                            }}
                                            className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-900"
                                        />
                                        Don't auto-open approval modal again for this user
                                    </label>
                                </>
                            )}
                            <div className="text-sm text-zinc-500 mt-1">€{approvalModalOrder.totalPrice.toFixed(2)}</div>
                        </div>

                        {/* Reason flags */}
                        <div className="space-y-2">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Approval flags</div>
                            {deriveApprovalReasons(approvalModalOrder).includes('FIRST_ORDER') && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium">
                                    🆕 First order — customer has no previous orders
                                </div>
                            )}
                            {deriveApprovalReasons(approvalModalOrder).includes('HIGH_VALUE') && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                                    💰 High value order (over €20)
                                </div>
                            )}
                            {deriveApprovalReasons(approvalModalOrder).includes('OUT_OF_ZONE') && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium">
                                    📍 Outside delivery zone — confirm drop-off address with customer
                                </div>
                            )}
                            {deriveApprovalReasons(approvalModalOrder).length === 0 && approvalModalOrder.needsApproval && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                                    ⚠ Manual verification required before approval
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-zinc-400">
                            Confirm you have called/verified this order. On approval, status moves to <span className="text-white font-medium">Pending</span> and businesses are notified.
                        </p>

                        <div className="flex gap-3 pt-1">
                            <Button variant="outline" className="flex-1" onClick={handleDismissApprovalModal}>
                                Go Back
                            </Button>
                            <Button
                                className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                                onClick={handleApproveConfirm}
                                disabled={approvingOrder}
                            >
                                {approvingOrder ? "Approving..." : "✓ Approve & Send to Business"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
