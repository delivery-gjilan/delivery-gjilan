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
import { getMarginSeverity } from "@/lib/constants/orderHelpers";
import { ASSIGN_DRIVER_TO_ORDER, CREATE_TEST_ORDER, START_PREPARING, UPDATE_PREPARATION_TIME, ADMIN_CANCEL_ORDER, APPROVE_ORDER, REMOVE_ORDER_ITEM } from "@/graphql/operations/orders";
import { GRANT_FREE_DELIVERY } from "@/graphql/operations/promotions/mutations";
import { UPDATE_USER_NOTE_MUTATION } from "@/graphql/operations/users/mutations";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_ORDER_COVERAGE } from "@/graphql/operations/inventory/queries";
import { DEDUCT_ORDER_STOCK } from "@/graphql/operations/inventory/mutations";
import InventoryCoverageModal from "@/components/inventory/InventoryCoverageModal";
import OrderDetailPanel from "@/components/orders/OrderDetailPanel";
import CancelOrderModal from "@/components/orders/CancelOrderModal";
import type { CancelReasonCategory } from "@/components/orders/CancelOrderModal";
import {
    CANCEL_REASON_CATEGORY_LABELS,
    composeTaggedCancellationReason,
    getCancelReasonBadgeClass,
    parseTaggedCancellationReason,
} from "@/components/orders/cancelReason";
import { Package, Store, Search, ArrowRight, MapPin, User, Plus, ChefHat, Timer, Copy, Check, Phone, Hash, MessageSquare, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import {
    STATUS_COLORS, STATUS_FLOW, STATUS_LABELS, STATUS_OPTIONS, INCIDENT_TAG_LABELS,
    isTrustedCustomer, isApprovalModalSuppressed,
    upsertTrustMarker, removeTrustMarker,
    upsertApprovalModalSuppressMarker, removeApprovalModalSuppressMarker,
    deriveApprovalReasons, parseAdminNote,
    normalizeOrderBusinesses, getOrderBusinessesSafe, getBusinessItemsSafe,
    secondsSince, formatElapsed, elapsedUrgency,
} from "@/components/orders/helpers";
import type { DriversQuery, GetOrdersQuery, OrderCoverageQuery } from "@/gql/graphql";
import type { Order, OrderStatus, CompletedStatusFilter } from "@/components/orders/types";

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
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>
    );
}

/* ----- Status filter rail ----- */
type ActiveStatusFilter = "ALL" | OrderStatus;

function StatusFilterRail({
    statusCounts,
    active,
    onChange,
}: {
    statusCounts: Record<string, number>;
    active: ActiveStatusFilter;
    onChange: (s: ActiveStatusFilter) => void;
}) {
    const activeStatuses: OrderStatus[] = ["AWAITING_APPROVAL", "PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
    const total = activeStatuses.reduce((s, st) => s + (statusCounts[st] ?? 0), 0);
    return (
        <div className="w-44 shrink-0 border-r border-zinc-800 py-2 flex flex-col gap-0.5 overflow-y-auto">
            <button
                onClick={() => onChange("ALL")}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors mx-1 ${active === "ALL" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}
            >
                <span>All Active</span>
                {total > 0 && <span className="text-xs bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 min-w-[22px] text-center">{total}</span>}
            </button>
            {activeStatuses.map((st) => {
                const count = statusCounts[st] ?? 0;
                const colors = STATUS_COLORS[st];
                const isActive = active === st;
                return (
                    <button
                        key={st}
                        onClick={() => onChange(st)}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors mx-1 ${isActive ? `${colors.bg} ${colors.text}` : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"}`}
                    >
                        <span className="flex items-center gap-2 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                            <span className="truncate text-xs">{STATUS_LABELS[st]}</span>
                        </span>
                        {count > 0 && (
                            <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[22px] text-center shrink-0 ${isActive ? `${colors.bg} ${colors.text}` : "bg-zinc-800 text-zinc-400"}`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

const ORDERS_PAGE_SIZE = 100;
const COMPLETED_PAGE_SIZE = 50;

type QueryOrder = GetOrdersQuery["orders"]["orders"][number];

const normalizeFetchedOrder = (order: QueryOrder): Order => ({
    ...order,
    businesses: normalizeOrderBusinesses(order),
});

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
    }
    return fallback;
};

export default function OrdersPage() {
    const [ordersPage, setOrdersPage] = useState(0);
    const [completedPage, setCompletedPage] = useState(0);
    const [completedStartDate, setCompletedStartDate] = useState<string>("");
    const [completedEndDate, setCompletedEndDate] = useState<string>("");
    const { orders, totalCount, hasMore, loading } = useOrders({ limit: ORDERS_PAGE_SIZE, offset: ordersPage * ORDERS_PAGE_SIZE });
    const { orders: completedOrdersRaw, totalCount: completedTotalCount, hasMore: completedHasMore, loading: completedLoading } = useOrders({
        limit: COMPLETED_PAGE_SIZE,
        offset: completedPage * COMPLETED_PAGE_SIZE,
        statuses: ["DELIVERED", "CANCELLED"],
        startDate: completedStartDate ? new Date(completedStartDate + "T00:00:00").toISOString() : undefined,
        endDate: completedEndDate ? new Date(completedEndDate + "T23:59:59.999").toISOString() : undefined,
    });
    const { update: updateStatus, loading: updateLoading } = useUpdateOrderStatus();
    const { admin } = useAuth();
    const { data: driversData } = useQuery<DriversQuery>(DRIVERS_QUERY, { pollInterval: 10000 });
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [createTestOrder, { loading: creatingTestOrder }] = useMutation(CREATE_TEST_ORDER);
    const [startPreparingMut, { loading: startPreparingLoading }] = useMutation(START_PREPARING, { refetchQueries: ["GetOrders"] });
    const [updatePrepTimeMut] = useMutation(UPDATE_PREPARATION_TIME, { refetchQueries: ["GetOrders"] });
    const [adminCancelOrderMut, { loading: cancellingOrder }] = useMutation(ADMIN_CANCEL_ORDER, { refetchQueries: ["GetOrders"] });
    const [approveOrderMut, { loading: approvingOrder }] = useMutation(APPROVE_ORDER, { refetchQueries: ["GetOrders"] });
    const [grantFreeDeliveryMut, { loading: grantingFreeDelivery }] = useMutation(GRANT_FREE_DELIVERY);
    const [updateUserNoteMut] = useMutation(UPDATE_USER_NOTE_MUTATION, { refetchQueries: ["GetOrders"] });
    const [fetchOrderCoverage, { data: coverageData, loading: coverageLoading }] = useLazyQuery<OrderCoverageQuery>(GET_ORDER_COVERAGE, { fetchPolicy: "network-only" });
    const [deductOrderStockMut, { loading: deductingStock }] = useMutation(DEDUCT_ORDER_STOCK);
    const [removeOrderItemMut, { loading: removingOrderItem }] = useMutation(REMOVE_ORDER_ITEM);

    /* ─── UI state ─── */
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
    const [activeStatusFilter, setActiveStatusFilter] = useState<ActiveStatusFilter>("ALL");
    const [completedStatusFilter, setCompletedStatusFilter] = useState<CompletedStatusFilter>("ALL");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [assigningDriverOrderId, setAssigningDriverOrderId] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());

    /* ─── Modal state ─── */
    const [prepTimeModalOrder, setPrepTimeModalOrder] = useState<Order | null>(null);
    const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>("20");
    const [editPrepTimeOrder, setEditPrepTimeOrder] = useState<Order | null>(null);
    const [editPrepTimeMinutes, setEditPrepTimeMinutes] = useState<string>("");
    const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState<string>("");
    const [cancelReasonCategory, setCancelReasonCategory] = useState<CancelReasonCategory | null>(null);
    const [cancelSettleDriver, setCancelSettleDriver] = useState<boolean>(false);
    const [cancelSettleBusiness, setCancelSettleBusiness] = useState<boolean>(false);
    const [approvalModalOrder, setApprovalModalOrder] = useState<Order | null>(null);
    const [trustUpdatingUserId, setTrustUpdatingUserId] = useState<string | null>(null);
    const [suppressionUpdatingUserId, setSuppressionUpdatingUserId] = useState<string | null>(null);
    const [dismissedApprovalOrderIds, setDismissedApprovalOrderIds] = useState<Set<string>>(new Set());
    const seenFlaggedOrderIdsRef = useRef<Set<string>>(new Set());
    const [prepTimeAlerts, setPrepTimeAlerts] = useState<PrepTimeAlert[]>([]);
    const { dismiss: dismissPrepAlert } = usePrepTimeAlerts(setPrepTimeAlerts);
    const [inventoryModalOrder, setInventoryModalOrder] = useState<Order | null>(null);
    const [removeItemDialog, setRemoveItemDialog] = useState<{ orderId: string; itemId: string; itemName: string; itemQuantity: number } | null>(null);
    const [removeItemReason, setRemoveItemReason] = useState<string>("");
    const [removeItemQuantity, setRemoveItemQuantity] = useState<number>(1);

    /* ─── Role ─── */
    const isSuperAdmin = admin?.role === "SUPER_ADMIN";
    const isAdmin = admin?.role === "ADMIN" || admin?.role === "SUPER_ADMIN";
    const isBusinessOwner = admin?.role === "BUSINESS_OWNER";
    const isBusinessEmployee = admin?.role === "BUSINESS_EMPLOYEE";
    const isBusinessUser = isBusinessOwner || isBusinessEmployee;

    /* ─── Clock ─── */
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    /* ─── Debounce search ─── */
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    /* ─── Drivers ─── */
    const drivers = useMemo(() => driversData?.drivers ?? [], [driversData]);
    const driverOptions = useMemo(() => [
        { value: "", label: "Unassigned" },
        ...drivers.map((driver) => ({ value: driver.id, label: `${driver.firstName} ${driver.lastName}` })),
    ], [drivers]);

    /* ─── Order normalization ─── */
    const normalizedOrders = useMemo(() => {
        const source = Array.isArray(orders) ? orders : [];
        return source.map(normalizeFetchedOrder);
    }, [orders]);

    const selectedOrder = useMemo(
        () => selectedOrderId ? (normalizedOrders.find((o) => o.id === selectedOrderId) ?? null) : null,
        [selectedOrderId, normalizedOrders]
    );

    const matchesSearch = useCallback((order: Order, q: string) => {
        if (!q) return true;
        const lower = q.toLowerCase();
        if (order.displayId?.toLowerCase() === lower) return true;
        if (/^\d+$/.test(q) && order.displayId?.startsWith(q)) return true;
        if (order.id.toLowerCase() === lower) return true;
        if (order.user) {
            const fullName = `${order.user.firstName} ${order.user.lastName}`.toLowerCase();
            if (fullName.includes(lower) || order.user.email.toLowerCase().includes(lower)) return true;
            if (order.user.phoneNumber && order.user.phoneNumber.includes(q)) return true;
        }
        return false;
    }, []);

    const filteredOrders = useMemo(() =>
        normalizedOrders
            .slice()
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .filter(order => matchesSearch(order, debouncedSearch)),
        [normalizedOrders, debouncedSearch, matchesSearch]
    );

    const activeOrders = useMemo(() =>
        filteredOrders
            .filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED")
            .sort((a, b) => {
                if (a.status === "AWAITING_APPROVAL" && b.status !== "AWAITING_APPROVAL") return -1;
                if (a.status !== "AWAITING_APPROVAL" && b.status === "AWAITING_APPROVAL") return 1;
                return 0;
            }),
        [filteredOrders]
    );

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const o of activeOrders) counts[o.status] = (counts[o.status] ?? 0) + 1;
        return counts;
    }, [activeOrders]);

    const visibleActiveOrders = useMemo(() =>
        activeStatusFilter === "ALL"
            ? activeOrders
            : activeOrders.filter(o => o.status === activeStatusFilter),
        [activeOrders, activeStatusFilter]
    );

    /* ─── Auto approval modal ─── */
    useEffect(() => {
        if (!isAdmin) return;
        const flaggedOrders = activeOrders.filter(o => o.needsApproval && !isApprovalModalSuppressed(o.user));
        const seen = seenFlaggedOrderIdsRef.current;
        const newFlagged = flaggedOrders.filter(o => !seen.has(o.id));
        flaggedOrders.forEach(o => seen.add(o.id));
        if (!approvalModalOrder && newFlagged.length > 0) setApprovalModalOrder(newFlagged[0]);
    }, [activeOrders, approvalModalOrder, isAdmin]);

    const completedOrders = useMemo(() => {
        const source = Array.isArray(completedOrdersRaw) ? completedOrdersRaw : [];
        return source.map(normalizeFetchedOrder);
    }, [completedOrdersRaw]);

    const filteredCompletedOrders = useMemo(() => {
        let result = completedOrders;
        if (debouncedSearch) result = result.filter(o => matchesSearch(o, debouncedSearch));
        if (completedStatusFilter !== "ALL") result = result.filter(o => o.status === completedStatusFilter);
        return result;
    }, [completedOrders, completedStatusFilter, debouncedSearch, matchesSearch]);

    /* ─── Handlers ─── */

    const handleRemoveItemConfirm = async () => {
        if (!removeItemDialog || !removeItemReason.trim()) return;
        try {
            await removeOrderItemMut({
                variables: { orderId: removeItemDialog.orderId, orderItemId: removeItemDialog.itemId, reason: removeItemReason.trim(), quantity: removeItemQuantity },
            });
            toast.success(`${removeItemQuantity}× "${removeItemDialog.itemName}" removed from order`);
            setRemoveItemDialog(null); setRemoveItemReason(""); setRemoveItemQuantity(1);
        } catch (err) { toast.error(getErrorMessage(err, "Failed to remove item")); }
    };

    const handleApproveConfirm = async () => {
        if (!approvalModalOrder) return;
        try {
            await approveOrderMut({ variables: { id: approvalModalOrder.id } });
            setDismissedApprovalOrderIds(prev => { const n = new Set(prev); n.delete(approvalModalOrder.id); return n; });
            toast.success("Order approved — moving to Pending");
            setApprovalModalOrder(null);
        } catch (err) { toast.error(getErrorMessage(err, "Failed to approve order")); }
    };

    const handleToggleTrustedCustomer = async (user: NonNullable<Order["user"]>, trust: boolean) => {
        setTrustUpdatingUserId(user.id);
        try {
            const nextNote = trust ? upsertTrustMarker(user.adminNote) : removeTrustMarker(user.adminNote);
            const nextFlagColor = trust
                ? "green"
                : (nextNote ? ((user.flagColor && user.flagColor !== "green") ? user.flagColor : "yellow") : null);
            await updateUserNoteMut({ variables: { userId: user.id, note: nextNote, flagColor: nextFlagColor } });
            toast.success(trust ? "Customer marked as trusted" : "Trusted flag removed");
        } catch (err) { toast.error(getErrorMessage(err, "Failed to update trusted customer status")); }
        finally { setTrustUpdatingUserId(null); }
    };

    const setApprovalModalSuppressionForUser = useCallback(async (user: NonNullable<Order["user"]>, suppress: boolean) => {
        setSuppressionUpdatingUserId(user.id);
        try {
            const nextNote = suppress ? upsertApprovalModalSuppressMarker(user.adminNote) : removeApprovalModalSuppressMarker(user.adminNote);
            await updateUserNoteMut({ variables: { userId: user.id, note: nextNote, flagColor: user.flagColor ?? null } });
            toast.success(suppress ? "Auto-popup muted for this customer" : "Auto-popup enabled for this customer");
        } catch (err) { toast.error(getErrorMessage(err, "Failed to update popup preference")); }
        finally { setSuppressionUpdatingUserId(null); }
    }, [updateUserNoteMut]);

    const openApprovalModalForOrder = useCallback((order: Order) => {
        if (!isAdmin || !order.needsApproval) return;
        setApprovalModalOrder(order);
    }, [isAdmin]);

    const handleDismissApprovalModal = useCallback(() => {
        if (approvalModalOrder) {
            setDismissedApprovalOrderIds(prev => { const n = new Set(prev); n.add(approvalModalOrder.id); return n; });
        }
        setApprovalModalOrder(null);
    }, [approvalModalOrder]);

    const handleNextStatus = async (order: Order) => {
        if (order.status === "PENDING") {
            setPrepTimeModalOrder(order); setPrepTimeMinutes("20"); return;
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
        } catch (err) { toast.error(getErrorMessage(err, "Failed to start preparing.")); }
    };

    const handleUpdatePrepTime = async () => {
        if (!editPrepTimeOrder) return;
        const minutes = parseInt(editPrepTimeMinutes, 10);
        if (!minutes || minutes < 1) { toast.warning("Enter a valid preparation time."); return; }
        try {
            await updatePrepTimeMut({ variables: { id: editPrepTimeOrder.id, preparationMinutes: minutes } });
            setEditPrepTimeOrder(null);
        } catch (err) { toast.error(getErrorMessage(err, "Failed to update preparation time.")); }
    };

    const handleStatusChange = async (order: Order, newStatus: string) => {
        if (order.status === "PENDING" && newStatus === "PREPARING") {
            setPrepTimeModalOrder(order); setPrepTimeMinutes("20"); return;
        }
        if (newStatus === "CANCELLED") {
            setCancelModalOrder(order);
            setCancelReason("");
            setCancelReasonCategory(null);
            setCancelSettleDriver(false);
            setCancelSettleBusiness(false);
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
            await assignDriver({ variables: { id: orderId, driverId: driverId || null }, refetchQueries: ["GetOrders"] });
        } catch (error) { toast.error(getErrorMessage(error, "Failed to assign driver")); }
        finally { setAssigningDriverOrderId(null); }
    };

    const handleAdminCancel = async () => {
        if (!cancelModalOrder) return;
        const trimmed = cancelReason.trim();
        if (!trimmed) { toast.warning("Please provide a cancellation reason."); return; }
        const taggedReason = composeTaggedCancellationReason(cancelReasonCategory, trimmed);
        try {
            await adminCancelOrderMut({ variables: { id: cancelModalOrder.id, reason: taggedReason, settleDriver: cancelSettleDriver, settleBusiness: cancelSettleBusiness } });
            toast.success("Order cancelled successfully.");
            setCancelModalOrder(null); setCancelReason(""); setCancelReasonCategory(null); setCancelSettleDriver(false); setCancelSettleBusiness(false);
        } catch (err) { toast.error(getErrorMessage(err, "Failed to cancel order.")); }
    };

    const openDetails = (order: Order) => {
        if (isAdmin && order.needsApproval && dismissedApprovalOrderIds.has(order.id) && approvalModalOrder?.id !== order.id) {
            setApprovalModalOrder(order);
        }
        setSelectedOrderId(order.id);
        if (isAdmin) fetchOrderCoverage({ variables: { orderId: order.id } });
    };

    /* ─── Loading ─── */
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

    /* ─── Shared detail panel props ─── */
    const detailPanelProps = selectedOrder ? {
        order: selectedOrder,
        isBusinessUser,
        isAdmin,
        isSuperAdmin,
        coverageData: coverageData?.orderCoverage ?? null,
        coverageLoading,
        deductingStock,
        grantingFreeDelivery,
        trustUpdatingUserId,
        suppressionUpdatingUserId,
        approvingOrder,
        now,
        onClose: () => setSelectedOrderId(null),
        onRemoveItem: (dialog: { orderId: string; itemId: string; itemName: string; itemQuantity: number }) => {
            setRemoveItemDialog(dialog); setRemoveItemReason(""); setRemoveItemQuantity(1);
        },
        onDeductStock: async () => {
            try {
                await deductOrderStockMut({ variables: { orderId: selectedOrder.id } });
                fetchOrderCoverage({ variables: { orderId: selectedOrder.id } });
                toast.success("Stock deducted successfully.");
            } catch (err) { toast.error(getErrorMessage(err, "Failed to deduct stock.")); }
        },
        onGrantFreeDelivery: async () => {
            try {
                await grantFreeDeliveryMut({ variables: { userId: selectedOrder.user!.id, orderId: selectedOrder.id } });
                toast.success(`Free delivery granted for ${selectedOrder.user!.firstName}'s next order.`);
            } catch (err) { toast.error(getErrorMessage(err, "Failed to grant free delivery.")); }
        },
        onToggleTrustedCustomer: handleToggleTrustedCustomer,
        onOpenApprovalModal: () => openApprovalModalForOrder(selectedOrder),
        onSetApprovalModalSuppression: setApprovalModalSuppressionForUser,
        onEditPrepTime: (o: Order) => { setEditPrepTimeOrder(o); setEditPrepTimeMinutes(String(o.preparationMinutes || 20)); },
    } : null;

    /* ─── Render ─── */
    return (
        <div className="text-white flex flex-col h-[calc(100vh-4rem)]">
            {/* HEADER BAR */}
            <div className="flex items-center justify-between px-1 py-3 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        <button
                            onClick={() => setActiveTab("active")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "active" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Active
                                <span className="text-xs text-zinc-500">({activeOrders.length})</span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("completed")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "completed" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                Completed
                                <span className="text-xs text-zinc-500">({completedTotalCount})</span>
                            </span>
                        </button>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <Input
                            type="text"
                            placeholder="Search by order #, name, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSuperAdmin && (
                        <Button
                            size="sm"
                            onClick={async () => {
                                try { await createTestOrder({ refetchQueries: ["GetOrders"] }); }
                                catch (err) { toast.error(getErrorMessage(err, "Failed to create test order")); }
                            }}
                            disabled={creatingTestOrder}
                            className="flex items-center gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                            <Plus size={14} />
                            {creatingTestOrder ? "Creating..." : "Mock Order"}
                        </Button>
                    )}
                </div>
            </div>

            {/* ════ ACTIVE ORDERS ════ */}
            {activeTab === "active" && (
                <div className="flex flex-1 overflow-hidden">
                    <StatusFilterRail statusCounts={statusCounts} active={activeStatusFilter} onChange={setActiveStatusFilter} />

                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
                        <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-3">
                            {activeStatusFilter === "ALL" ? "All Active Orders" : STATUS_LABELS[activeStatusFilter as OrderStatus]}
                            <span className="ml-2 text-zinc-600">({visibleActiveOrders.length})</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                            {visibleActiveOrders.length === 0 ? (
                                <div className="col-span-full text-center text-zinc-600 py-12">
                                    {debouncedSearch ? "No active orders matching your search" : "No active orders"}
                                </div>
                            ) : (
                                visibleActiveOrders.map((order) => {
                                    const nextStatus = STATUS_FLOW[order.status];
                                    const businessNames = getOrderBusinessesSafe(order).map(b => b.business.name).join(", ");
                                    const preview = !isBusinessUser ? order.settlementPreview ?? null : null;
                                    const marginSeverity = preview ? getMarginSeverity(preview.netMargin) : null;
                                    const approvalReasons = deriveApprovalReasons(order);
                                    const promoCount = (order.orderPromotions ?? []).length;
                                    const elapsed = secondsSince(order.orderDate);
                                    const urgencyClass = elapsedUrgency(elapsed);
                                    const isSelected = selectedOrder?.id === order.id;

                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => openDetails(order)}
                                            className={`bg-[#111113] border rounded-xl p-4 hover:border-zinc-700 transition-all cursor-pointer ${
                                                isSelected ? "border-violet-500/60 ring-1 ring-violet-500/20" : STATUS_COLORS[order.status].border
                                            }`}
                                        >
                                            {/* Card header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <CopyableId displayId={order.displayId} />
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-zinc-600">
                                                            {new Date(order.orderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        <span className={`text-[11px] font-semibold ${urgencyClass}`}>
                                                            {formatElapsed(elapsed)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <StatusBadge status={order.status} />
                                            </div>

                                            {/* Approval badges */}
                                            {approvalReasons.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 mb-3">
                                                    {approvalReasons.includes("FIRST_ORDER") && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-200">First order</span>
                                                    )}
                                                    {approvalReasons.includes("HIGH_VALUE") && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-200">Over €20</span>
                                                    )}
                                                    {approvalReasons.includes("OUT_OF_ZONE") && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-200">Outside zone</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Customer + Business */}
                                            <div className="mb-3 pb-3 border-b border-zinc-800/60 space-y-1.5">
                                                {order.user && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <User size={14} className="text-zinc-500 shrink-0" />
                                                        <span className="text-sm text-white font-medium">{order.user.firstName} {order.user.lastName}</span>
                                                        {typeof order.user.totalOrders === "number" && (
                                                            <span className="text-xs text-zinc-500">{order.user.totalOrders} orders</span>
                                                        )}
                                                        {order.user.phoneNumber && (
                                                            <span className="text-xs text-zinc-500">{order.user.phoneNumber}</span>
                                                        )}
                                                        {isTrustedCustomer(order.user) && (
                                                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">Trusted</span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Store size={14} className="text-violet-500 shrink-0" />
                                                    <span className="text-sm text-zinc-300 truncate">{businessNames}</span>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div className="mb-3 space-y-0.5">
                                                {getOrderBusinessesSafe(order).map((biz, idx) => (
                                                    <div key={idx}>
                                                        {getBusinessItemsSafe(biz).slice(0, 3).map((item, itemIdx) => (
                                                            <div key={itemIdx}>
                                                                <div className="text-sm text-zinc-400 flex items-center gap-2">
                                                                    <span className="text-zinc-600">x{item.quantity}</span>
                                                                    <span className="truncate">{item.name}</span>
                                                                </div>
                                                                {item.notes && <div className="text-xs text-zinc-500 italic ml-6 mt-0.5">Note: {item.notes}</div>}
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

                                            {/* Driver notes */}
                                            {order.driverNotes && (
                                                <div className="mb-3 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                                    <MessageSquare size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                    <div className="text-xs text-blue-400"><span className="font-semibold">Driver notes:</span> {order.driverNotes}</div>
                                                </div>
                                            )}

                                            {/* Needs approval */}
                                            {order.needsApproval && (
                                                <div className="mb-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                                                    <span className="text-rose-400 text-xs font-semibold">⚠ Awaiting approval — call customer before approving</span>
                                                </div>
                                            )}

                                            {/* Out of zone */}
                                            {order.locationFlagged && (
                                                <div className="mb-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
                                                    <MapPin size={13} className="text-orange-400 flex-shrink-0" />
                                                    <span className="text-orange-400 text-xs font-semibold">Outside delivery zone</span>
                                                </div>
                                            )}

                                            {/* Inventory badge */}
                                            {order.inventoryPrice != null && order.inventoryPrice > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setInventoryModalOrder(order); fetchOrderCoverage({ variables: { orderId: order.id } }); }}
                                                    className="mb-3 w-full flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-2 hover:bg-violet-500/20 transition-colors text-left"
                                                >
                                                    <Package size={13} className="text-violet-400 flex-shrink-0" />
                                                    <span className="text-violet-300 text-xs font-semibold">Stock items — €{Number(order.inventoryPrice).toFixed(2)}</span>
                                                    <span className="ml-auto text-violet-500 text-[10px] whitespace-nowrap">View →</span>
                                                </button>
                                            )}

                                            {/* Prep time alert */}
                                            {(() => {
                                                const alert = prepTimeAlerts.find(a => a.orderId === order.id);
                                                if (!alert) return null;
                                                return (
                                                    <div className="mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
                                                        <Timer size={13} className="text-amber-400 flex-shrink-0" />
                                                        <span className="text-amber-400 text-xs font-semibold flex-1">+{alert.addedMinutes} min (now {alert.newTotalMinutes} min)</span>
                                                        <button onClick={(e) => { e.stopPropagation(); dismissPrepAlert(alert.orderId); }} className="text-amber-400/60 hover:text-amber-400 text-xs leading-none ml-1">x</button>
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
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditPrepTimeOrder(order); setEditPrepTimeMinutes(String(order.preparationMinutes || 20)); }}
                                                        className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 hover:bg-violet-500/10 rounded transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            )}

                                            {/* Driver assignment */}
                                            {isSuperAdmin && (
                                                <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                                                    <Dropdown
                                                        value={order.driver?.id || ""}
                                                        onChange={(val) => handleAssignDriver(order.id, val)}
                                                        options={driverOptions}
                                                        disabled={assigningDriverOrderId === order.id}
                                                        className="w-full"
                                                    />
                                                </div>
                                            )}

                                            {/* Card footer */}
                                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                                                <div>
                                                    <div className="text-lg font-bold text-white">€{order.totalPrice.toFixed(2)}</div>
                                                    {promoCount > 0 && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                                {promoCount > 1 ? "Promotions applied" : "Promotion applied"}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {preview && (
                                                        <div className="group relative mt-1">
                                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                                marginSeverity === "healthy" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                                                : marginSeverity === "thin" ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                                                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                                                            }`}>
                                                                M {preview.netMargin >= 0 ? "+" : ""}€{preview.netMargin.toFixed(2)}
                                                            </span>
                                                            {!preview.driverAssigned && (
                                                                <span className="ml-1 inline-flex items-center rounded-full bg-zinc-500/15 border border-zinc-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">No driver</span>
                                                            )}
                                                            <div className="pointer-events-none absolute left-0 bottom-full z-[120] mb-2 rounded-md border border-zinc-700 bg-[#0a0a0d] p-2 text-left text-[11px] text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 min-w-[200px]">
                                                                <div className="font-semibold text-zinc-200 mb-1">Settlement breakdown</div>
                                                                {preview.lineItems.map((item, i) => (
                                                                    <div key={i} className="flex justify-between gap-2">
                                                                        <span className="text-zinc-500 truncate">{item.reason}</span>
                                                                        <span className={item.direction === "RECEIVABLE" ? "text-emerald-300" : "text-rose-300"}>
                                                                            {item.direction === "RECEIVABLE" ? "+" : "-"}€{item.amount.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between border-t border-zinc-700 mt-1 pt-1">
                                                                    <span className="text-zinc-500">Net margin</span>
                                                                    <span className={preview.netMargin >= 0 ? "text-emerald-300" : "text-rose-300"}>
                                                                        {preview.netMargin >= 0 ? "+" : ""}€{preview.netMargin.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    {order.needsApproval && isAdmin && (
                                                        <button
                                                            onClick={() => openApprovalModalForOrder(order)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all bg-green-500/10 text-green-400 border-green-500/30 hover:brightness-125"
                                                        >
                                                            Approve
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
                                                    {isAdmin && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => { setCancelModalOrder(order); setCancelReason(""); setCancelReasonCategory(null); setCancelSettleDriver(false); setCancelSettleBusiness(false); }}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Active pagination */}
                        {!debouncedSearch && (
                            <div className="flex items-center justify-between py-4 border-t border-zinc-800 mt-auto pt-6">
                                <span className="text-xs text-zinc-500">Page {ordersPage + 1} · {totalCount} active orders total</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.max(0, p - 1))} disabled={ordersPage === 0 || loading}>Prev</Button>
                                    <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => p + 1)} disabled={!hasMore || loading}>Next</Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {detailPanelProps && (
                        <div className="w-[480px] shrink-0 overflow-hidden border-l border-zinc-800">
                            <OrderDetailPanel {...detailPanelProps} />
                        </div>
                    )}
                </div>
            )}

            {/* ════ COMPLETED ORDERS ════ */}
            {activeTab === "completed" && (
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Completed Orders</h2>
                            <div className="flex items-center gap-1.5">
                                {(["ALL", "DELIVERED", "CANCELLED"] as const).map((f) => (
                                    <Button key={f} size="sm" variant={completedStatusFilter === f ? "outline" : "ghost"}
                                        onClick={() => setCompletedStatusFilter(f)}
                                        className={`h-8 px-3 text-xs ${f === "DELIVERED" ? "text-green-400" : f === "CANCELLED" ? "text-red-400" : ""}`}>
                                        {f === "ALL" ? `All (${completedTotalCount})` : f === "DELIVERED" ? "Delivered" : "Cancelled"}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4 bg-[#0d0d0f] border border-zinc-800 rounded-xl px-4 py-3 shrink-0 flex-wrap">
                            <Calendar size={14} className="text-zinc-500 flex-shrink-0" />
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-zinc-500">From</label>
                                <input type="date" value={completedStartDate} onChange={(e) => { setCompletedStartDate(e.target.value); setCompletedPage(0); }}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white [color-scheme:dark]" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-zinc-500">To</label>
                                <input type="date" value={completedEndDate} onChange={(e) => { setCompletedEndDate(e.target.value); setCompletedPage(0); }}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white [color-scheme:dark]" />
                            </div>
                            <div className="h-5 w-px bg-zinc-700" />
                            {[
                                { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; setCompletedStartDate(d); setCompletedEndDate(d); setCompletedPage(0); } },
                                { label: "Yesterday", fn: () => { const d = new Date(Date.now() - 86400000).toISOString().split("T")[0]; setCompletedStartDate(d); setCompletedEndDate(d); setCompletedPage(0); } },
                                { label: "Last 7d", fn: () => { setCompletedStartDate(new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]); setCompletedEndDate(new Date().toISOString().split("T")[0]); setCompletedPage(0); } },
                                { label: "This Month", fn: () => { const n = new Date(); setCompletedStartDate(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0]); setCompletedEndDate(n.toISOString().split("T")[0]); setCompletedPage(0); } },
                            ].map((preset) => (
                                <button key={preset.label} onClick={preset.fn}
                                    className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700">
                                    {preset.label}
                                </button>
                            ))}
                            {(completedStartDate || completedEndDate) && (
                                <button onClick={() => { setCompletedStartDate(""); setCompletedEndDate(""); setCompletedPage(0); }}
                                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0d0d0f] flex-1">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-900/70 border-b border-zinc-800 sticky top-0">
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
                                            <td colSpan={isBusinessUser ? 7 : 8} className="px-3 py-12 text-center text-zinc-600">
                                                {debouncedSearch ? "No completed orders matching your search"
                                                : completedStatusFilter === "ALL" ? "No completed orders yet"
                                                : `No ${completedStatusFilter.toLowerCase()} orders found`}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCompletedOrders.map((order) => {
                                            const businessNames = getOrderBusinessesSafe(order).map(b => b.business.name).join(", ");
                                            const preview = !isBusinessUser ? order.settlementPreview ?? null : null;
                                            const marginSeverity = preview ? getMarginSeverity(preview.netMargin) : null;
                                            const promoCount = (order.orderPromotions ?? []).length;
                                            return (
                                                <tr key={order.id} className="border-b border-zinc-800/70 hover:bg-zinc-900/40">
                                                    <td className="px-3 py-3 align-top">
                                                        <div className="space-y-1">
                                                            <CopyableId displayId={order.displayId} />
                                                            <div className="text-xs text-zinc-600">
                                                                {new Date(order.orderDate).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        {order.user ? (
                                                            <div>
                                                                <div className="text-zinc-200">{order.user.firstName} {order.user.lastName}</div>
                                                                {order.user.phoneNumber && <div className="text-xs text-zinc-500">{order.user.phoneNumber}</div>}
                                                            </div>
                                                        ) : <span className="text-zinc-600">-</span>}
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        <div className="text-zinc-300 max-w-[300px] truncate" title={businessNames || "-"}>{businessNames || "-"}</div>
                                                        {order.driver && <div className="text-xs text-zinc-500 mt-1">Driver: {order.driver.firstName} {order.driver.lastName}</div>}
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        {isSuperAdmin ? (
                                                            <Dropdown value={order.status} onChange={(val) => handleStatusChange(order, val)} options={STATUS_OPTIONS} disabled={updateLoading && updatingOrderId === order.id} className="min-w-[130px]" />
                                                        ) : <StatusBadge status={order.status} />}
                                                        {order.status === "CANCELLED" && order.cancellationReason && (
                                                            (() => {
                                                                const parsed = parseTaggedCancellationReason(order.cancellationReason);
                                                                return (
                                                                    <div className="mt-1 max-w-[220px]" title={order.cancellationReason}>
                                                                        {parsed.category && (
                                                                            <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getCancelReasonBadgeClass(parsed.category)}`}>
                                                                                {CANCEL_REASON_CATEGORY_LABELS[parsed.category]}
                                                                            </span>
                                                                        )}
                                                                        <div className="text-xs text-red-400/80 truncate mt-1">
                                                                            {parsed.reasonText}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 align-top font-semibold text-white">
                                                        €{order.totalPrice.toFixed(2)}
                                                        {promoCount > 0 && (
                                                            <div className="mt-1">
                                                                <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                                    {promoCount > 1 ? "Promotions applied" : "Promotion applied"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    {!isBusinessUser && (
                                                        <td className="px-3 py-3 align-top">
                                                            {preview ? (
                                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                                    marginSeverity === "healthy" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                                                    : marginSeverity === "negative" ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                                                                    : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                                                }`}>
                                                                    M {preview.netMargin >= 0 ? "+" : ""}€{preview.netMargin.toFixed(2)}
                                                                </span>
                                                            ) : <span className="text-zinc-600">-</span>}
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
                                                                    {inc.note && <div className="text-xs text-zinc-400 line-clamp-2" title={inc.note}>{inc.note}</div>}
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

                        <div className="flex items-center justify-between py-3 border-t border-zinc-800 shrink-0">
                            <span className="text-xs text-zinc-500">Page {completedPage + 1} · {completedTotalCount} completed orders total</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCompletedPage(p => Math.max(0, p - 1))} disabled={completedPage === 0 || completedLoading}>Prev</Button>
                                <Button variant="outline" size="sm" onClick={() => setCompletedPage(p => p + 1)} disabled={!completedHasMore || completedLoading}>Next</Button>
                            </div>
                        </div>
                    </div>

                    {detailPanelProps && (
                        <div className="w-[480px] shrink-0 overflow-hidden border-l border-zinc-800">
                            <OrderDetailPanel {...detailPanelProps} />
                        </div>
                    )}
                </div>
            )}

            {/* ════ PREP TIME MODAL ════ */}
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
                            <Input type="number" min="1" max="180" value={prepTimeMinutes} onChange={(e) => setPrepTimeMinutes(e.target.value)} className="text-center text-lg" placeholder="20" />
                            <div className="flex gap-2 mt-2">
                                {[10, 15, 20, 30, 45, 60].map((m) => (
                                    <button key={m} onClick={() => setPrepTimeMinutes(String(m))}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${prepTimeMinutes === String(m) ? "bg-violet-500/20 border-violet-500/50 text-violet-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                                        {m} min
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setPrepTimeModalOrder(null)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleStartPreparing} disabled={startPreparingLoading}>{startPreparingLoading ? "Starting..." : "Start Preparing"}</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════ EDIT PREP TIME MODAL ════ */}
            <Modal isOpen={!!editPrepTimeOrder} onClose={() => setEditPrepTimeOrder(null)} title="Update Preparation Time">
                {editPrepTimeOrder && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">New Preparation Time (minutes)</label>
                            <Input type="number" min="1" max="180" value={editPrepTimeMinutes} onChange={(e) => setEditPrepTimeMinutes(e.target.value)} className="text-center text-lg" />
                            <div className="flex gap-2 mt-2">
                                {[10, 15, 20, 30, 45, 60].map((m) => (
                                    <button key={m} onClick={() => setEditPrepTimeMinutes(String(m))}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${editPrepTimeMinutes === String(m) ? "bg-violet-500/20 border-violet-500/50 text-violet-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
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

            {/* ════ REMOVE ITEM MODAL ════ */}
            <Modal isOpen={!!removeItemDialog} onClose={() => { setRemoveItemDialog(null); setRemoveItemReason(""); setRemoveItemQuantity(1); }} title="Remove Item">
                {removeItemDialog && (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-300">Remove <span className="font-semibold text-white">"{removeItemDialog.itemName}"</span> from this order?</p>
                        <p className="text-xs text-zinc-500">The customer will be notified with the reason. Order total will be updated.</p>
                        {removeItemDialog.itemQuantity > 1 && (
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Quantity to remove (of {removeItemDialog.itemQuantity})</label>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setRemoveItemQuantity(Math.max(1, removeItemQuantity - 1))} disabled={removeItemQuantity <= 1}
                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 transition-colors">-</button>
                                    <span className="text-lg font-bold text-white min-w-[2ch] text-center">{removeItemQuantity}</span>
                                    <button onClick={() => setRemoveItemQuantity(Math.min(removeItemDialog.itemQuantity, removeItemQuantity + 1))} disabled={removeItemQuantity >= removeItemDialog.itemQuantity}
                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 transition-colors">+</button>
                                    <button onClick={() => setRemoveItemQuantity(removeItemDialog.itemQuantity)}
                                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${removeItemQuantity === removeItemDialog.itemQuantity ? "bg-rose-500/20 border-rose-500/50 text-rose-300" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>All</button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Reason</label>
                            <div className="flex flex-wrap gap-2">
                                {["Out of stock", "Item unavailable", "Preparation issue"].map((preset) => (
                                    <button key={preset} onClick={() => setRemoveItemReason(preset)}
                                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${removeItemReason === preset ? "bg-rose-500/20 border-rose-500/50 text-rose-300" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>{preset}</button>
                                ))}
                            </div>
                            <Input value={removeItemReason} onChange={(e) => setRemoveItemReason(e.target.value)} placeholder="Or type a custom reason..." />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" onClick={() => { setRemoveItemDialog(null); setRemoveItemReason(""); setRemoveItemQuantity(1); }}>Cancel</Button>
                            <Button variant="danger" onClick={handleRemoveItemConfirm} disabled={!removeItemReason.trim() || removingOrderItem}>
                                {removingOrderItem ? "Removing..." : `Remove ${removeItemQuantity}x`}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ════ CANCEL ORDER MODAL ════ */}
            <CancelOrderModal
                order={cancelModalOrder}
                reason={cancelReason}
                category={cancelReasonCategory}
                settleDriver={cancelSettleDriver}
                settleBusiness={cancelSettleBusiness}
                loading={cancellingOrder}
                isBusinessUser={isBusinessUser}
                onReasonChange={setCancelReason}
                onCategoryChange={setCancelReasonCategory}
                onSettleDriverChange={setCancelSettleDriver}
                onSettleBusinessChange={setCancelSettleBusiness}
                onConfirm={handleAdminCancel}
                onClose={() => { setCancelModalOrder(null); setCancelReason(""); setCancelReasonCategory(null); setCancelSettleDriver(false); setCancelSettleBusiness(false); }}
            />

            {/* ════ INVENTORY COVERAGE MODAL ════ */}
            {inventoryModalOrder && (
                <InventoryCoverageModal
                    orderId={inventoryModalOrder.id}
                    displayId={inventoryModalOrder.displayId}
                    coverage={coverageData?.orderCoverage ?? null}
                    loading={coverageLoading}
                    onClose={() => setInventoryModalOrder(null)}
                />
            )}

            {/* ════ APPROVAL MODAL ════ */}
            <Modal isOpen={!!approvalModalOrder} onClose={handleDismissApprovalModal} title="Approve Order">
                {approvalModalOrder && (
                    <div className="space-y-4">
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                            <div className="font-medium text-rose-300">Order {approvalModalOrder.displayId}</div>
                            {approvalModalOrder.user && (
                                <>
                                    <div className="text-sm text-zinc-400 mt-0.5">{approvalModalOrder.user.firstName} {approvalModalOrder.user.lastName}</div>
                                    {typeof approvalModalOrder.user.totalOrders === "number" && (
                                        <div className="text-xs text-zinc-500 mt-1">{approvalModalOrder.user.totalOrders} total orders</div>
                                    )}
                                    {approvalModalOrder.user.phoneNumber && (
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                                            <Phone size={11} className="text-zinc-600" />
                                            <a href={`tel:${approvalModalOrder.user.phoneNumber}`} className="hover:text-white transition-colors">{approvalModalOrder.user.phoneNumber}</a>
                                        </div>
                                    )}
                                    <div className="mt-2">
                                        <button type="button" disabled={trustUpdatingUserId === approvalModalOrder.user.id}
                                            onClick={() => handleToggleTrustedCustomer(approvalModalOrder.user!, !isTrustedCustomer(approvalModalOrder.user))}
                                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                                                isTrustedCustomer(approvalModalOrder.user) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                            }`}>
                                            {trustUpdatingUserId === approvalModalOrder.user.id ? "Saving..." : isTrustedCustomer(approvalModalOrder.user) ? "Trusted customer: enabled" : "Mark as trusted customer"}
                                        </button>
                                    </div>
                                    <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                                        <input type="checkbox" disabled={suppressionUpdatingUserId === approvalModalOrder.user?.id}
                                            checked={isApprovalModalSuppressed(approvalModalOrder.user)}
                                            onChange={(e) => { if (approvalModalOrder.user) void setApprovalModalSuppressionForUser(approvalModalOrder.user, e.target.checked); }}
                                            className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-900" />
                                        Don't auto-open approval modal again for this user
                                    </label>
                                </>
                            )}
                            <div className="text-sm text-zinc-500 mt-1">€{approvalModalOrder.totalPrice.toFixed(2)}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Approval flags</div>
                            {deriveApprovalReasons(approvalModalOrder).includes("FIRST_ORDER") && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium">First order — customer has no previous orders</div>
                            )}
                            {deriveApprovalReasons(approvalModalOrder).includes("HIGH_VALUE") && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">High value order (over €20)</div>
                            )}
                            {deriveApprovalReasons(approvalModalOrder).includes("OUT_OF_ZONE") && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium">Outside delivery zone — confirm drop-off address</div>
                            )}
                            {deriveApprovalReasons(approvalModalOrder).length === 0 && approvalModalOrder.needsApproval && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">Manual verification required before approval</div>
                            )}
                        </div>
                        <p className="text-sm text-zinc-400">Confirm you have called/verified this order. On approval, status moves to <span className="text-white font-medium">Pending</span> and businesses are notified.</p>
                        <div className="flex gap-3 pt-1">
                            <Button variant="outline" className="flex-1" onClick={handleDismissApprovalModal}>Go Back</Button>
                            <Button className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30" onClick={handleApproveConfirm} disabled={approvingOrder}>
                                {approvingOrder ? "Approving..." : "Approve & Send to Business"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
