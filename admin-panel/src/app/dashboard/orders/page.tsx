"use client";

import { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { useOrders, useUpdateOrderStatus } from "@/lib/hooks/useOrders";
import { Package, Store, Search, ArrowRight, Clock, CheckCircle2 } from "lucide-react";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

type OrderStatus = "PENDING" | "ACCEPTED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

interface OrderItem {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    price: number;
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
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    ACCEPTED: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
    OUT_FOR_DELIVERY: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
    DELIVERED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
    CANCELLED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
    PENDING: "ACCEPTED",
    ACCEPTED: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
    DELIVERED: null,
    CANCELLED: null,
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
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

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [searchOrderId, setSearchOrderId] = useState<string>("");
    const [searchUserName, setSearchUserName] = useState<string>("");

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
        const nextStatus = STATUS_FLOW[order.status];
        if (!nextStatus) return;
        
        await updateStatus(order.id, nextStatus);
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        await updateStatus(orderId, newStatus);
    };

    const openDetails = (order: Order) => {
        setSelectedOrder(order);
        setDetailsOpen(true);
    };

    if (loading) {
        return <p className="text-gray-400">Loading orders...</p>;
    }

    return (
        <div className="text-white">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Orders</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    Manage and track all customer orders
                </p>
            </div>

            {/* SEARCH SECTION */}
            <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search by Order ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Search by Order ID
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                type="text"
                                placeholder="Enter order ID..."
                                value={searchOrderId}
                                onChange={(e) => setSearchOrderId(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Search by User Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Search by Customer Name or Email
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                type="text"
                                placeholder="Enter customer name or email..."
                                value={searchUserName}
                                onChange={(e) => setSearchUserName(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-sm text-gray-400">
                        Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                        {(searchOrderId || searchUserName) && " (filtered)"}
                        {" · "}
                        <span className="text-amber-400">{activeOrders.length} active</span>
                        {" · "}
                        <span className="text-green-400">{completedOrders.length} completed</span>
                    </div>
                </div>
            </div>

            {/* ACTIVE ORDERS SECTION */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-semibold text-white">
                        Active Orders ({activeOrders.length})
                    </h2>
                </div>
                
                <Table>
                    <thead>
                        <tr>
                            <Th>Order ID</Th>
                            <Th>Timestamp</Th>
                            <Th>Customer</Th>
                            <Th>Status</Th>
                            <Th>Total</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeOrders.length === 0 ? (
                            <tr>
                                <Td colSpan={6}>
                                    <div className="text-center text-neutral-500 py-8">
                                        {searchOrderId || searchUserName ? "No active orders found matching your search" : "No active orders"}
                                    </div>
                                </Td>
                            </tr>
                        ) : (
                            activeOrders.map((order) => {
                                const nextStatus = STATUS_FLOW[order.status];
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
                                        <div className="flex items-center gap-2">
                                            {nextStatus && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleNextStatus(order)}
                                                    disabled={updateLoading}
                                                    className="whitespace-nowrap"
                                                >
                                                    {STATUS_LABELS[nextStatus]}
                                                    <ArrowRight size={14} className="ml-1" />
                                                </Button>
                                            )}
                                            <Select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                                disabled={updateLoading}
                                                className={`text-xs font-medium ${STATUS_COLORS[order.status].bg} ${STATUS_COLORS[order.status].text} ${STATUS_COLORS[order.status].border} border`}
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="ACCEPTED">Accepted</option>
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
            </div>

            {/* COMPLETED ORDERS SECTION */}
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
                            <Th>Status</Th>
                            <Th>Total</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {completedOrders.length === 0 ? (
                            <tr>
                                <Td colSpan={6}>
                                    <div className="text-center text-neutral-500 py-8">
                                        {searchOrderId || searchUserName ? "No completed orders found matching your search" : "No completed orders"}
                                    </div>
                                </Td>
                            </tr>
                        ) : (
                            completedOrders.map((order) => (
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
                            ))
                        )}
                    </tbody>
                </Table>
            </div>

            {/* ORDER DETAILS MODAL */}
            <Modal
                open={detailsOpen}
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

                        {/* Businesses & Products */}
                        <div className="space-y-4">
                            {selectedOrder.businesses.map((biz, idx) => (
                                <div key={idx} className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#262626]">
                                        <Store size={18} className="text-cyan-500" />
                                        <span className="font-semibold text-white">{biz.business.name}</span>
                                        <span className="text-xs text-neutral-400">({biz.business.businessType})</span>
                                    </div>
                                    <div className="space-y-2">
                                        {biz.items.map((item, itemIdx) => (
                                            <div key={itemIdx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Package size={16} className="text-neutral-400" />
                                                    <div>
                                                        <div className="text-white text-sm">{item.name}</div>
                                                        <div className="text-xs text-neutral-400">Qty: {item.quantity}</div>
                                                    </div>
                                                </div>
                                                <div className="text-white font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
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
