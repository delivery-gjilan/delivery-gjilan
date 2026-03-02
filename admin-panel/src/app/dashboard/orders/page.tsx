"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import Dropdown from "@/components/ui/Dropdown";
import Input from "@/components/ui/Input";
import { useOrders, useUpdateOrderStatus } from "@/lib/hooks/useOrders";
import { useAuth } from "@/lib/auth-context";
import { ASSIGN_DRIVER_TO_ORDER, CREATE_TEST_ORDER, START_PREPARING, UPDATE_PREPARATION_TIME } from "@/graphql/operations/orders";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { Package, Store, Search, ArrowRight, Eye, EyeOff, MapPin, User, Plus, ChefHat, Timer, Copy, Check, Phone, Hash, MessageSquare } from "lucide-react";
import { toast } from 'sonner';

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

interface OrderItem {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    price: number;
    quantityInStock: number;
    quantityNeeded: number;
    notes?: string;
}

interface OrderBusiness {
    business: {
        id: string;
        name: string;
        businessType: string;
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
    };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

/* ---------------------------------------------------------
   STATUS CONFIG
--------------------------------------------------------- */

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string; dot: string }> = {
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
    PREPARING: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
    READY: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
    OUT_FOR_DELIVERY: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
    DELIVERED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
    CANCELLED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
};

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
    PENDING: "PREPARING",
    PREPARING: "READY",
    READY: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
    DELIVERED: null,
    CANCELLED: null,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
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

function TimeDisplay({ date }: { date: string }) {
    const d = new Date(date);
    return (
        <div className="text-sm">
            <div className="text-zinc-300">{d.toLocaleDateString([], { month: "short", day: "numeric" })}</div>
            <div className="text-zinc-500 text-xs">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
    );
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function OrdersPage() {
    const { orders, loading } = useOrders();
    const { update: updateStatus, loading: updateLoading } = useUpdateOrderStatus();
    const { admin } = useAuth();
    const { data: driversData } = useQuery(DRIVERS_QUERY, { pollInterval: 10000 });
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [createTestOrder, { loading: creatingTestOrder }] = useMutation(CREATE_TEST_ORDER);
    const [startPreparingMut, { loading: startPreparingLoading }] = useMutation(START_PREPARING, { refetchQueries: ['GetOrders'] });
    const [updatePrepTimeMut] = useMutation(UPDATE_PREPARATION_TIME, { refetchQueries: ['GetOrders'] });

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [assigningDriverOrderId, setAssigningDriverOrderId] = useState<string | null>(null);
    const [prepTimeModalOrder, setPrepTimeModalOrder] = useState<Order | null>(null);
    const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>("20");
    const [editPrepTimeOrder, setEditPrepTimeOrder] = useState<Order | null>(null);
    const [editPrepTimeMinutes, setEditPrepTimeMinutes] = useState<string>("");

    const drivers = useMemo(() => driversData?.drivers ?? [], [driversData]);
    const driverOptions = useMemo(() => [
        { value: "", label: "Unassigned" },
        ...drivers.map((d: any) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` })),
    ], [drivers]);

    const isSuperAdmin = admin?.role === "SUPER_ADMIN";
    const isBusinessOwner = admin?.role === "BUSINESS_OWNER";
    const isBusinessEmployee = admin?.role === "BUSINESS_EMPLOYEE";
    const isBusinessUser = isBusinessOwner || isBusinessEmployee;

    const filteredOrders = useMemo(() => {
        return (orders as Order[])
            .slice()
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .filter(order => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                if (order.displayId?.toLowerCase().includes(q)) return true;
                if (order.id.toLowerCase().includes(q)) return true;
                if (order.user) {
                    const fullName = `${order.user.firstName} ${order.user.lastName}`.toLowerCase();
                    if (fullName.includes(q) || order.user.email.toLowerCase().includes(q)) return true;
                }
                return false;
            });
    }, [orders, searchQuery]);

    const activeOrders = useMemo(() =>
        filteredOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'),
        [filteredOrders]
    );

    const completedOrders = useMemo(() =>
        filteredOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED'),
        [filteredOrders]
    );

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

    const openDetails = (order: Order) => { setSelectedOrder(order); setDetailsOpen(true); };

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
        <div className="text-white max-w-[1600px]">
            {/* HEADER BAR */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <Input
                            type="text"
                            placeholder="Search by order ID, customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 py-2 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-zinc-400">{activeOrders.length} active</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-zinc-400">{completedOrders.length} completed</span>
                        </span>
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
                    <Button
                        variant={showCompleted ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center gap-2"
                    >
                        {showCompleted ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showCompleted ? "Hide" : "Show"} Completed
                    </Button>
                </div>
            </div>

            {/* ════════════════ ACTIVE ORDERS ════════════════ */}
            <div className="mb-8">
                <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Active Orders</h2>

                {isBusinessUser ? (
                    /* ── Card View (Business Users) ── */
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {activeOrders.length === 0 ? (
                            <div className="col-span-full text-center text-zinc-600 py-12">No active orders</div>
                        ) : (
                            activeOrders.map((order) => {
                                const nextStatus = order.status === "PENDING" ? "PREPARING" : order.status === "PREPARING" ? "READY" : null;
                                return (
                                    <div key={order.id} className="bg-[#111113] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
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

                                        {/* Customer */}
                                        {order.user && (
                                            <div className="mb-3 pb-3 border-b border-zinc-800/60">
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-zinc-500" />
                                                    <span className="text-sm text-white font-medium">
                                                        {order.user.firstName} {order.user.lastName}
                                                    </span>
                                                </div>
                                                {order.user.phoneNumber && (
                                                    <div className="flex items-center gap-2 mt-1 ml-[22px]">
                                                        <Phone size={12} className="text-zinc-600" />
                                                        <span className="text-xs text-zinc-500">{order.user.phoneNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Items */}
                                        <div className="mb-3 space-y-1">
                                            {order.businesses.map((biz, idx) => (
                                                <div key={idx}>
                                                    {biz.items.slice(0, 3).map((item, itemIdx) => (
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
                                                    {biz.items.length > 3 && (
                                                        <div className="text-xs text-zinc-600 ml-6">+{biz.items.length - 3} more</div>
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

                                        {/* Prep time */}
                                        {order.status === "PREPARING" && order.preparationMinutes && (
                                            <div className="mb-3 flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2 text-violet-400 text-sm">
                                                    <Timer size={14} />
                                                    <span>~{order.preparationMinutes} min</span>
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

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                                            <div className="text-lg font-bold text-white">${order.totalPrice.toFixed(2)}</div>
                                            <div className="flex items-center gap-2">
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
                                                        </button>
                                                    );
                                                })()}
                                                <Button variant="outline" size="sm" onClick={() => openDetails(order)}>Details</Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* ── Table View (Super Admin) ── */
                    <Table>
                        <thead>
                            <tr>
                                <Th>Order</Th>
                                <Th>Time</Th>
                                <Th>Customer</Th>
                                <Th>Business</Th>
                                <Th>Driver</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Total</Th>
                                <Th></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeOrders.length === 0 ? (
                                <tr>
                                    <Td colSpan={8}>
                                        <div className="text-center text-zinc-600 py-12">
                                            {searchQuery ? "No active orders matching your search" : "No active orders"}
                                        </div>
                                    </Td>
                                </tr>
                            ) : (
                                activeOrders.map((order) => {
                                    const nextStatus = STATUS_FLOW[order.status];
                                    const businessNames = order.businesses.map(b => b.business.name).join(", ");
                                    return (
                                        <tr key={order.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <Td><CopyableId displayId={order.displayId} /></Td>
                                            <Td><TimeDisplay date={order.orderDate} /></Td>
                                            <Td>
                                                {order.user ? (
                                                    <div>
                                                        <div className="text-sm text-white font-medium">
                                                            {order.user.firstName} {order.user.lastName}
                                                        </div>
                                                        <div className="text-zinc-500 text-xs">{order.user.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 text-sm">N/A</span>
                                                )}
                                            </Td>
                                            <Td><span className="text-sm text-zinc-300">{businessNames}</span></Td>
                                            <Td>
                                                <Dropdown
                                                    value={order.driver?.id || ""}
                                                    onChange={(val) => handleAssignDriver(order.id, val)}
                                                    options={driverOptions}
                                                    disabled={assigningDriverOrderId === order.id}
                                                    className="min-w-[160px]"
                                                />
                                            </Td>
                                            <Td>
                                                <div className="flex items-center gap-2">
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
                                                                <ArrowRight size={14} />
                                                            </button>
                                                        );
                                                    })()}
                                                    <Dropdown
                                                        value={order.status}
                                                        onChange={(val) => handleStatusChange(order, val)}
                                                        options={STATUS_OPTIONS}
                                                        disabled={updateLoading && updatingOrderId === order.id}
                                                        className="min-w-[150px]"
                                                    />
                                                </div>
                                            </Td>
                                            <Td className="text-right">
                                                <span className="font-semibold text-white">${order.totalPrice.toFixed(2)}</span>
                                            </Td>
                                            <Td>
                                                <Button variant="ghost" size="sm" onClick={() => openDetails(order)}>Details</Button>
                                            </Td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                )}
            </div>

            {/* ════════════════ COMPLETED ORDERS ════════════════ */}
            {showCompleted && (
                <div className="mb-8">
                    <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Completed Orders</h2>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Order</Th>
                                <Th>Time</Th>
                                <Th>Customer</Th>
                                <Th>Business</Th>
                                <Th>Driver</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Total</Th>
                                <Th></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedOrders.length === 0 ? (
                                <tr>
                                    <Td colSpan={8}>
                                        <div className="text-center text-zinc-600 py-12">
                                            {searchQuery ? "No completed orders matching your search" : "No completed orders yet"}
                                        </div>
                                    </Td>
                                </tr>
                            ) : (
                                completedOrders.map((order) => {
                                    const businessNames = order.businesses.map(b => b.business.name).join(", ");
                                    return (
                                        <tr key={order.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <Td><CopyableId displayId={order.displayId} /></Td>
                                            <Td><TimeDisplay date={order.orderDate} /></Td>
                                            <Td>
                                                {order.user ? (
                                                    <div>
                                                        <div className="text-sm text-white font-medium">
                                                            {order.user.firstName} {order.user.lastName}
                                                        </div>
                                                        <div className="text-zinc-500 text-xs">{order.user.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 text-sm">N/A</span>
                                                )}
                                            </Td>
                                            <Td><span className="text-sm text-zinc-300">{businessNames}</span></Td>
                                            <Td>
                                                {order.driver ? (
                                                    <span className="text-sm text-zinc-300">
                                                        {order.driver.firstName} {order.driver.lastName}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-600 text-sm">—</span>
                                                )}
                                            </Td>
                                            <Td><StatusBadge status={order.status} /></Td>
                                            <Td className="text-right">
                                                <span className="font-semibold text-white">${order.totalPrice.toFixed(2)}</span>
                                            </Td>
                                            <Td>
                                                <Button variant="ghost" size="sm" onClick={() => openDetails(order)}>Details</Button>
                                            </Td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </div>
            )}

            {/* ════════════════ ORDER DETAILS MODAL ════════════════ */}
            <Modal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="Order Details">
                {selectedOrder && (
                    <div className="space-y-5">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg font-bold text-white">{selectedOrder.displayId}</span>
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {new Date(selectedOrder.orderDate).toLocaleString()}
                                </div>
                            </div>
                            <StatusBadge status={selectedOrder.status} />
                        </div>

                        {/* Customer + Driver grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {selectedOrder.user && (
                                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Customer</div>
                                    <div className="text-white text-sm font-medium">
                                        {selectedOrder.user.firstName} {selectedOrder.user.lastName}
                                    </div>
                                    <div className="text-zinc-500 text-xs mt-0.5">{selectedOrder.user.email}</div>
                                    {selectedOrder.user.phoneNumber && (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Phone size={11} className="text-zinc-600" />
                                            <span className="text-zinc-400 text-xs">{selectedOrder.user.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Driver</div>
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

                        {/* Delivery address */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Delivery Address</div>
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                                <span className="text-white text-sm">{selectedOrder.dropOffLocation.address}</span>
                            </div>
                        </div>

                        {/* Driver Notes */}
                        {selectedOrder.driverNotes && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                                <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1.5 font-semibold">Delivery Instructions</div>
                                <div className="flex items-start gap-2">
                                    <MessageSquare size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-blue-200 text-sm">{selectedOrder.driverNotes}</span>
                                </div>
                            </div>
                        )}

                        {/* Items by business */}
                        <div className="space-y-4">
                            {selectedOrder.businesses.map((biz, idx) => (
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
                                                    {biz.business.businessType === 'MARKET' && (
                                                        <>
                                                            <th className="px-3 py-2 text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">In Stock</th>
                                                            <th className="px-3 py-2 text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Need</th>
                                                        </>
                                                    )}
                                                    <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Price</th>
                                                    <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {biz.items.map((item, itemIdx) => {
                                                    let rowBorder = "";
                                                    if (biz.business.businessType === 'MARKET') {
                                                        if (item.quantityNeeded === 0) rowBorder = "border-l-2 border-l-green-500/50";
                                                        else if (item.quantityInStock > 0) rowBorder = "border-l-2 border-l-yellow-500/50";
                                                        else rowBorder = "border-l-2 border-l-amber-500/50";
                                                    }
                                                    return (
                                                        <tr key={itemIdx} className={`border-b border-zinc-800/60 hover:bg-zinc-900/30 ${rowBorder}`}>
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
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {biz.business.businessType === 'MARKET' && (
                                                                <>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <span className={`text-sm font-medium ${item.quantityInStock > 0 ? "text-green-400" : "text-zinc-600"}`}>
                                                                            {item.quantityInStock}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <span className={`text-sm font-medium ${item.quantityNeeded > 0 ? "text-amber-400" : "text-zinc-600"}`}>
                                                                            {item.quantityNeeded}
                                                                        </span>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="px-3 py-2.5 text-right text-sm text-zinc-300">${item.price.toFixed(2)}</td>
                                                            <td className="px-3 py-2.5 text-right text-sm font-medium text-white">
                                                                ${(item.quantity * item.price).toFixed(2)}
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

                        {/* Totals */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Subtotal</span>
                                <span className="text-zinc-300">${selectedOrder.orderPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Delivery</span>
                                <span className="text-zinc-300">${selectedOrder.deliveryPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold pt-1.5 border-t border-zinc-800">
                                <span className="text-white">Total</span>
                                <span className="text-violet-400">${selectedOrder.totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
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
        </div>
    );
}
