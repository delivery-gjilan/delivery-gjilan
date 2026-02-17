"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { useOrders, useUpdateOrderStatus } from "@/lib/hooks/useOrders";
import { useAuth } from "@/lib/auth-context";
import { ASSIGN_DRIVER_TO_ORDER } from "@/graphql/operations/orders";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { Package, Store, Search, ArrowRight, Clock, CheckCircle2, Eye, EyeOff, MapPin, User } from "lucide-react";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

type OrderStatus = "PENDING" | "ACCEPTED" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

interface OrderItem {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    price: number;
    quantityInStock: number;
    quantityNeeded: number;
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
    orderPrice: number;
    deliveryPrice: number;
    totalPrice: number;
    orderDate: string;
    status: OrderStatus;
    dropOffLocation: Location;
    businesses: OrderBusiness[];
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    ACCEPTED: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
    READY: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
    OUT_FOR_DELIVERY: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
    DELIVERED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
    CANCELLED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
    PENDING: "ACCEPTED",
    ACCEPTED: "READY",
    READY: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
    DELIVERED: null,
    CANCELLED: null,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    READY: "Ready",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
};

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function OrdersPage() {
    const { orders, loading } = useOrders();
    const { update: updateStatus, loading: updateLoading } = useUpdateOrderStatus();
    const { admin } = useAuth();
    const { data: driversData } = useQuery(DRIVERS_QUERY, { pollInterval: 10000 });
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [searchOrderId, setSearchOrderId] = useState<string>("");
    const [searchUserName, setSearchUserName] = useState<string>("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [assigningDriverOrderId, setAssigningDriverOrderId] = useState<string | null>(null);

    const drivers = useMemo(() => driversData?.drivers ?? [], [driversData]);

    const isSuperAdmin = admin?.role === "SUPER_ADMIN";
    const isBusinessAdmin = admin?.role === "BUSINESS_ADMIN";

    // Sort orders once by most recent first, then filter - this prevents re-sorting on status changes
    const filteredOrders = useMemo(() => {
        return (orders as Order[])
            .slice() // Create a copy to avoid mutating original array
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .filter(order => {
                // Filter by Order ID
                if (searchOrderId && !order.id.toLowerCase().includes(searchOrderId.toLowerCase())) {
                    return false;
                }

                // Filter by User Name
                if (searchUserName && order.user) {
                    const fullName = `${order.user.firstName} ${order.user.lastName}`.toLowerCase();
                    const email = order.user.email.toLowerCase();
                    const search = searchUserName.toLowerCase();
                    
                    if (!fullName.includes(search) && !email.includes(search)) {
                        return false;
                    }
                }

                return true;
            });
    }, [orders, searchOrderId, searchUserName]);

    // Split orders into active and completed
    const activeOrders = useMemo(() => {
        return filteredOrders.filter(
            (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
        );
    }, [filteredOrders]);

    const completedOrders = useMemo(() => {
        return filteredOrders.filter(
            (order) => order.status === 'DELIVERED' || order.status === 'CANCELLED'
        );
    }, [filteredOrders]);

    const handleNextStatus = async (order: Order) => {
        const nextStatus = isBusinessAdmin
            ? order.status === "PENDING"
                ? "ACCEPTED"
                : order.status === "ACCEPTED"
                  ? "READY"
                  : null
            : STATUS_FLOW[order.status];

        if (!nextStatus) return;

        setUpdatingOrderId(order.id);
        const result = await updateStatus(order.id, nextStatus);
        setUpdatingOrderId(null);

        if (!result.success) {
            alert(result.error || "Failed to update order status.");
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        setUpdatingOrderId(orderId);
        const result = await updateStatus(orderId, newStatus);
        setUpdatingOrderId(null);

        if (!result.success) {
            alert(result.error || "Failed to update order status.");
        }
    };

    const openDetails = (order: Order) => {
        setSelectedOrder(order);
        setDetailsOpen(true);
    };

    const handleAssignDriver = async (orderId: string, driverId: string | null) => {
        setAssigningDriverOrderId(orderId);
        try {
            await assignDriver({
                variables: {
                    id: orderId,
                    driverId: driverId || null,
                },
                refetchQueries: ['GetOrders'],
            });
        } catch (error: any) {
            alert(error.message || "Failed to assign driver");
        } finally {
            setAssigningDriverOrderId(null);
        }
    };

    if (loading) {
        return <p className="text-gray-400">Loading orders...</p>;
    }

    return (
        <div className="text-white">
            {/* SEARCH SECTION - Only for Super Admin */}
            {isSuperAdmin && (
                <div className="mb-4 flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            type="text"
                            placeholder="Order ID"
                            value={searchOrderId}
                            onChange={(e) => setSearchOrderId(e.target.value)}
                            className="pl-9 py-2 text-sm"
                        />
                    </div>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            type="text"
                            placeholder="Customer name or email"
                            value={searchUserName}
                            onChange={(e) => setSearchUserName(e.target.value)}
                            className="pl-9 py-2 text-sm"
                        />
                    </div>
                    <div className="text-sm text-gray-400">
                        <span className="text-amber-400">{activeOrders.length}</span> active · 
                        <span className="text-green-400 ml-1">{completedOrders.length}</span> completed
                    </div>
                </div>
            )}

            {/* ACTIVE ORDERS SECTION */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <h2 className="text-xl font-semibold text-white">
                            Active Orders ({activeOrders.length})
                        </h2>
                    </div>
                    <Button
                        variant={showCompleted ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center gap-2"
                    >
                        {showCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showCompleted ? "Hide" : "Show"} Completed
                    </Button>
                </div>
                
                {isBusinessAdmin ? (
                    /* CARD VIEW FOR BUSINESS ADMIN */
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {activeOrders.length === 0 ? (
                            <div className="col-span-full text-center text-neutral-500 py-8">
                                No active orders
                            </div>
                        ) : (
                            activeOrders.map((order) => {
                                const nextStatus =
                                    order.status === "PENDING"
                                        ? "ACCEPTED"
                                        : order.status === "ACCEPTED"
                                          ? "READY"
                                          : null;
                                return (
                                    <div key={order.id} className="bg-[#161616] border border-[#262626] rounded-lg p-4 hover:border-[#404040] transition-colors">
                                        {/* Order Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="font-mono text-xs text-neutral-400">#{order.id.slice(0, 8)}</div>
                                                <div className="text-xs text-neutral-500 mt-1">
                                                    {new Date(order.orderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[order.status].bg} ${STATUS_COLORS[order.status].text}`}>
                                                {STATUS_LABELS[order.status]}
                                            </span>
                                        </div>

                                        {/* Customer Info */}
                                        {order.user && (
                                            <div className="mb-3 pb-3 border-b border-[#262626]">
                                                <div className="text-white text-sm font-medium">
                                                    {order.user.firstName} {order.user.lastName}
                                                </div>
                                            </div>
                                        )}

                                        {/* Items Preview */}
                                        <div className="mb-3 space-y-1">
                                            {order.businesses.map((biz, idx) => (
                                                <div key={idx}>
                                                    {biz.items.slice(0, 2).map((item, itemIdx) => (
                                                        <div key={itemIdx} className="text-sm text-neutral-400 flex items-center gap-2">
                                                            <Package size={14} />
                                                            <span>{item.quantity}x {item.name}</span>
                                                        </div>
                                                    ))}
                                                    {biz.items.length > 2 && (
                                                        <div className="text-xs text-neutral-500 ml-6">+{biz.items.length - 2} more items</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Delivery Address */}
                                        <div className="mb-3 flex items-start gap-2">
                                            <MapPin size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-neutral-400 line-clamp-2">
                                                {order.dropOffLocation.address}
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                                            <div className="text-lg font-bold text-white">
                                                ${order.totalPrice.toFixed(2)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {nextStatus && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleNextStatus(order)}
                                                        disabled={updateLoading && updatingOrderId === order.id}
                                                    >
                                                        {STATUS_LABELS[nextStatus]}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDetails(order)}
                                                >
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* TABLE VIEW FOR SUPER ADMIN */
                    <Table>
                        <thead>
                            <tr>
                                <Th>Order ID</Th>
                                <Th>Timestamp</Th>
                                <Th>Customer</Th>
                                <Th>Business</Th>
                                <Th>Driver</Th>
                                <Th>Status</Th>
                                <Th>Total</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeOrders.length === 0 ? (
                                <tr>
                                    <Td colSpan={8}>
                                        <div className="text-center text-neutral-500 py-8">
                                            {searchOrderId || searchUserName ? "No active orders found matching your search" : "No active orders"}
                                        </div>
                                    </Td>
                                </tr>
                            ) : (
                                activeOrders.map((order) => {
                                    const nextStatus = STATUS_FLOW[order.status];
                                    const businessNames = order.businesses.map(b => b.business.name).join(", ");
                                    return (
                                    <tr key={order.id}>
                                        <Td>
                                            <span className="font-mono text-xs text-white">
                                                {order.id}
                                            </span>
                                        </Td>
                                        <Td>
                                            <div className="text-sm">
                                                <div className="text-white">{new Date(order.orderDate).toLocaleDateString()}</div>
                                                <div className="text-neutral-400 text-xs">
                                                    {new Date(order.orderDate).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>
                                            {order.user ? (
                                                <div className="text-sm">
                                                    <div className="text-white font-medium">
                                                        {order.user.firstName} {order.user.lastName}
                                                    </div>
                                                    <div className="text-neutral-400 text-xs">
                                                        {order.user.email}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-neutral-500 text-sm">N/A</span>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-white">
                                                {businessNames}
                                            </div>
                                        </Td>
                                        <Td>
                                            <Select
                                                value={order.driver?.id || ""}
                                                onChange={(e) => handleAssignDriver(order.id, e.target.value || null)}
                                                disabled={assigningDriverOrderId === order.id}
                                                className="text-xs"
                                            >
                                                <option value="">Unassigned</option>
                                                {drivers.map((driver: any) => (
                                                    <option key={driver.id} value={driver.id}>
                                                        {driver.firstName} {driver.lastName}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Td>
                                        <Td>
                                            <div className="flex items-center gap-2">
                                                {nextStatus && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleNextStatus(order)}
                                                        disabled={updateLoading && updatingOrderId === order.id}
                                                        className="whitespace-nowrap"
                                                    >
                                                        {STATUS_LABELS[nextStatus]}
                                                        <ArrowRight size={14} className="ml-1" />
                                                    </Button>
                                                )}
                                                <Select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                                    disabled={updateLoading && updatingOrderId === order.id}
                                                    className={`text-xs font-medium ${STATUS_COLORS[order.status].bg} ${STATUS_COLORS[order.status].text} ${STATUS_COLORS[order.status].border} border`}
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="ACCEPTED">Accepted</option>
                                                    <option value="READY">Ready</option>
                                                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                                    <option value="DELIVERED">Delivered</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </Select>
                                            </div>
                                        </Td>
                                        <Td>
                                            <span className="font-semibold text-white">${order.totalPrice.toFixed(2)}</span>
                                        </Td>
                                        <Td>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openDetails(order)}
                                            >
                                                View Details
                                            </Button>
                                        </Td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </Table>
                )}
            </div>

            {/* COMPLETED ORDERS SECTION */}
            {showCompleted && (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h2 className="text-xl font-semibold text-white">
                        Completed Orders ({completedOrders.length})
                    </h2>
                </div>
                
                <Table>
                    <thead>
                        <tr>
                            <Th>Order ID</Th>
                            <Th>Timestamp</Th>
                            <Th>Customer</Th>
                            <Th>Business</Th>
                            <Th>Driver</Th>
                            <Th>Status</Th>
                            <Th>Total</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {completedOrders.length === 0 ? (
                            <tr>
                                <Td colSpan={8}>
                                    <div className="text-center text-neutral-500 py-8">
                                        {searchOrderId || searchUserName ? "No completed orders found matching your search" : "No completed orders"}
                                    </div>
                                </Td>
                            </tr>
                        ) : (
                            completedOrders.map((order) => {
                                const businessNames = order.businesses.map(b => b.business.name).join(", ");
                                return (
                                <tr key={order.id}>
                                    <Td>
                                        <span className="font-mono text-xs text-white">
                                            {order.id}
                                        </span>
                                    </Td>
                                    <Td>
                                        <div className="text-sm">
                                            <div className="text-white">{new Date(order.orderDate).toLocaleDateString()}</div>
                                            <div className="text-neutral-400 text-xs">
                                                {new Date(order.orderDate).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        {order.user ? (
                                            <div className="text-sm">
                                                <div className="text-white font-medium">
                                                    {order.user.firstName} {order.user.lastName}
                                                </div>
                                                <div className="text-neutral-400 text-xs">
                                                    {order.user.email}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-neutral-500 text-sm">N/A</span>
                                        )}
                                    </Td>
                                    <Td>
                                        <div className="text-sm text-white">
                                            {businessNames}
                                        </div>
                                    </Td>
                                    <Td>
                                        {order.driver ? (
                                            <div className="text-sm">
                                                <div className="text-white font-medium">
                                                    {order.driver.firstName} {order.driver.lastName}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-neutral-500 text-sm">Unassigned</span>
                                        )}
                                    </Td>
                                    <Td>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status].bg} ${STATUS_COLORS[order.status].text} ${STATUS_COLORS[order.status].border} border inline-block`}>
                                            {STATUS_LABELS[order.status]}
                                        </span>
                                    </Td>
                                    <Td>
                                        <span className="font-semibold text-white">${order.totalPrice.toFixed(2)}</span>
                                    </Td>
                                    <Td>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openDetails(order)}
                                        >
                                            View Details
                                        </Button>
                                    </Td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </Table>
            </div>
            )}

            {/* ORDER DETAILS MODAL */}
            <Modal
                isOpen={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                title="Order Details"
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        {/* Order Info */}
                        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
                            <div>
                                <div className="text-xs text-neutral-400">Order ID</div>
                                <div className="font-mono text-sm text-white">{selectedOrder.id}</div>
                            </div>
                            <div className={`px-4 py-2 rounded-lg font-medium ${STATUS_COLORS[selectedOrder.status].bg} ${STATUS_COLORS[selectedOrder.status].text} ${STATUS_COLORS[selectedOrder.status].border} border-2`}>
                                {STATUS_LABELS[selectedOrder.status]}
                            </div>
                        </div>

                        {/* Customer Info */}
                        {selectedOrder.user && (
                            <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                                <div className="text-xs text-neutral-400 mb-2">Customer</div>
                                <div className="text-white font-medium">
                                    {selectedOrder.user.firstName} {selectedOrder.user.lastName}
                                </div>
                                <div className="text-sm text-neutral-400 mt-1">
                                    {selectedOrder.user.email}
                                </div>
                            </div>
                        )}

                        {/* Driver Info */}
                        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                            <div className="text-xs text-neutral-400 mb-2">Assigned Driver</div>
                            {selectedOrder.driver ? (
                                <>
                                    <div className="text-white font-medium">
                                        {selectedOrder.driver.firstName} {selectedOrder.driver.lastName}
                                    </div>
                                    <div className="text-sm text-neutral-400 mt-1">
                                        {selectedOrder.driver.email}
                                    </div>
                                </>
                            ) : (
                                <div className="text-neutral-500">No driver assigned</div>
                            )}
                        </div>

                        {/* Businesses & Products - Table View */}
                        <div className="space-y-6">
                            {selectedOrder.businesses.filter(biz => biz.business.businessType === 'MARKET').map((biz, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <Store size={16} className="text-cyan-500" />
                                            <span className="font-semibold text-white text-sm">{biz.business.name}</span>
                                            <span className="text-xs text-neutral-400">({biz.business.businessType})</span>
                                        </div>
                                    </div>

                                    {/* Products Table */}
                                    <div className="overflow-x-auto border border-[#262626] rounded-lg">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-[#0a0a0a] border-b border-[#262626]">
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-neutral-400 uppercase">Product</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold text-neutral-400 uppercase">In Stock</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold text-neutral-400 uppercase">Need to Buy</th>
                                                    <th className="px-3 py-2 text-right text-xs font-bold text-neutral-400 uppercase">Unit Price</th>
                                                    <th className="px-3 py-2 text-right text-xs font-bold text-neutral-400 uppercase">Total</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold text-neutral-400 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {biz.items.map((item, itemIdx) => {
                                                    const isFullyInStock = item.quantityNeeded === 0;
                                                    const isPartial = item.quantityInStock > 0 && item.quantityNeeded > 0;
                                                    const isNeedToBuy = item.quantityInStock === 0 && item.quantityNeeded > 0;

                                                    let rowBg = "";
                                                    if (isFullyInStock) rowBg = "bg-green-500/10 border-l-4 border-green-500";
                                                    else if (isPartial) rowBg = "bg-yellow-500/5 border-l-4 border-yellow-500";
                                                    else if (isNeedToBuy) rowBg = "bg-amber-500/10 border-l-4 border-amber-500";

                                                    let statusBadge = "";
                                                    let statusColor = "";
                                                    if (isFullyInStock) {
                                                        statusBadge = "✓ In Stock";
                                                        statusColor = "bg-green-500/20 text-green-300";
                                                    } else if (isPartial) {
                                                        statusBadge = "⚠ Partial";
                                                        statusColor = "bg-yellow-500/20 text-yellow-300";
                                                    } else if (isNeedToBuy) {
                                                        statusBadge = "⚠ Need All";
                                                        statusColor = "bg-amber-500/20 text-amber-300";
                                                    }

                                                    return (
                                                        <tr
                                                            key={itemIdx}
                                                            className={`border-b border-[#262626] hover:bg-[#15151] transition-colors ${rowBg}`}
                                                        >
                                                            <td className="px-3 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {item.imageUrl && (
                                                                        <img
                                                                            src={item.imageUrl}
                                                                            alt={item.name}
                                                                            className="w-8 h-8 rounded object-cover"
                                                                        />
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        <div className="text-white text-sm font-semibold truncate">{item.name}</div>
                                                                        {item.category && (
                                                                            <div className="text-xs text-neutral-400">{item.category}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <div
                                                                    className={`inline-block px-2 py-1 rounded text-sm font-bold ${
                                                                        item.quantityInStock > 0 ? "bg-green-500/20 text-green-300" : "text-neutral-500"
                                                                    }`}
                                                                >
                                                                    {item.quantityInStock}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <div
                                                                    className={`inline-block px-2 py-1 rounded text-sm font-bold ${
                                                                        item.quantityNeeded > 0 ? "bg-amber-500/20 text-amber-300" : "text-neutral-500"
                                                                    }`}
                                                                >
                                                                    {item.quantityNeeded}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-right">
                                                                <span className="text-white text-sm font-semibold">${item.price.toFixed(2)}</span>
                                                            </td>
                                                            <td className="px-3 py-3 text-right">
                                                                <div className="text-right">
                                                                    <div className="text-white font-bold">
                                                                        ${((item.quantityInStock + item.quantityNeeded) * item.price).toFixed(2)}
                                                                    </div>
                                                                    {isPartial && (
                                                                        <div className="text-xs text-neutral-400">
                                                                            ${(item.quantityInStock * item.price).toFixed(2)} have
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                                                    {statusBadge}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            {selectedOrder.businesses.filter(biz => biz.business.businessType === 'MARKET').length === 0 && (
                                <div className="text-center text-neutral-400 py-8">
                                    No market items in this order
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Subtotal</span>
                                <span className="text-white">${selectedOrder.orderPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Delivery Fee</span>
                                <span className="text-white">${selectedOrder.deliveryPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#262626]">
                                <span className="text-white">Total</span>
                                <span className="text-cyan-400">${selectedOrder.totalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Delivery Address */}
                        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                            <div className="text-xs text-neutral-400 mb-1">Delivery Address</div>
                            <div className="text-white text-sm">{selectedOrder.dropOffLocation.address}</div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
