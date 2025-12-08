"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import Select from "@/components/ui/Select";
import { useOrders, useUpdateOrderStatus, useCancelOrder } from "@/lib/hooks/useOrders";

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
}

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: "text-yellow-400",
    ACCEPTED: "text-blue-400",
    OUT_FOR_DELIVERY: "text-purple-400",
    DELIVERED: "text-green-400",
    CANCELLED: "text-red-400",
};

const STATUS_BG: Record<OrderStatus, string> = {
    PENDING: "bg-yellow-900/20",
    ACCEPTED: "bg-blue-900/20",
    OUT_FOR_DELIVERY: "bg-purple-900/20",
    DELIVERED: "bg-green-900/20",
    CANCELLED: "bg-red-900/20",
};

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function OrdersPage() {
    const { orders, loading, refetch } = useOrders();
    const { update: updateStatus, loading: updateLoading } = useUpdateOrderStatus();
    const { cancel: cancelOrder, loading: cancelLoading } = useCancelOrder();

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
    const [newStatus, setNewStatus] = useState<OrderStatus>("ACCEPTED");

    const filteredOrders = statusFilter === "ALL" 
        ? (orders as Order[])
        : (orders as Order[]).filter(o => o.status === statusFilter);

    const handleStatusChange = async (order: Order) => {
        const result = await updateStatus(order.id, newStatus);
        if (result.success) {
            await refetch();
            setSelectedOrder(null);
        } else {
            alert(`Error: ${result.error}`);
        }
    };

    const handleCancel = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel this order?")) return;
        
        const result = await cancelOrder(orderId);
        if (result.success) {
            await refetch();
        } else {
            alert(`Error: ${result.error}`);
        }
    };

    const openDetails = (order: Order) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setDetailsOpen(true);
    };

    if (loading) {
        return <p className="text-gray-400">Loading orders...</p>;
    }

    return (
        <div className="text-white">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Orders</h1>
                <div className="flex items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Filter by Status
                        </label>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "ALL")}
                        >
                            <option value="ALL">All Orders</option>
                            <option value="PENDING">Pending</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                        </Select>
                    </div>
                    <div className="text-sm text-gray-400">
                        {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>

            {/* ORDERS TABLE */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <Th>Order ID</Th>
                            <Th>Date</Th>
                            <Th>Status</Th>
                            <Th>Items</Th>
                            <Th>Order Price</Th>
                            <Th>Delivery</Th>
                            <Th>Total</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => (
                            <tr key={order.id}>
                                <Td>
                                    <span className="font-mono text-xs">
                                        {order.id.substring(0, 8)}...
                                    </span>
                                </Td>
                                <Td>
                                    {new Date(order.orderDate).toLocaleDateString()} at{" "}
                                    {new Date(order.orderDate).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Td>
                                <Td>
                                    <span
                                        className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[order.status]} ${STATUS_BG[order.status]}`}
                                    >
                                        {order.status.replace(/_/g, " ")}
                                    </span>
                                </Td>
                                <Td>
                                    {order.businesses.reduce(
                                        (sum, b) => sum + b.items.length,
                                        0
                                    )}{" "}
                                    items
                                </Td>
                                <Td>${order.orderPrice.toFixed(2)}</Td>
                                <Td>${order.deliveryPrice.toFixed(2)}</Td>
                                <Td>
                                    <span className="font-semibold">${order.totalPrice.toFixed(2)}</span>
                                </Td>
                                <Td>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="text-xs px-3"
                                            onClick={() => openDetails(order)}
                                        >
                                            View
                                        </Button>
                                        {order.status !== "DELIVERED" &&
                                            order.status !== "CANCELLED" && (
                                                <Button
                                                    variant="danger"
                                                    className="text-xs px-3"
                                                    onClick={() => handleCancel(order.id)}
                                                    disabled={cancelLoading}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                    </div>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {filteredOrders.length === 0 && (
                    <p className="text-gray-400 text-center py-6">
                        No orders found.
                    </p>
                )}
            </div>

            {/* ORDER DETAILS MODAL */}
            <Modal
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                title="Order Details"
            >
                {selectedOrder && (
                    <div className="space-y-4">
                        {/* Order Summary */}
                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Order ID:</span>
                                <span className="font-mono">{selectedOrder.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Date:</span>
                                <span>
                                    {new Date(selectedOrder.orderDate).toLocaleDateString()}{" "}
                                    {new Date(selectedOrder.orderDate).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <span
                                    className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[selectedOrder.status]} ${STATUS_BG[selectedOrder.status]}`}
                                >
                                    {selectedOrder.status.replace(/_/g, " ")}
                                </span>
                            </div>
                        </div>

                        {/* Delivery Location */}
                        <div className="bg-gray-800/50 rounded p-4 space-y-2">
                            <h3 className="font-semibold mb-2">Delivery Location</h3>
                            <p className="text-sm text-gray-300">
                                {selectedOrder.dropOffLocation.address}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Latitude:</span>
                                    <p>{selectedOrder.dropOffLocation.latitude.toFixed(6)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Longitude:</span>
                                    <p>{selectedOrder.dropOffLocation.longitude.toFixed(6)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Businesses & Items */}
                        {selectedOrder.businesses.map((ob, idx) => (
                            <div key={idx} className="bg-gray-800/50 rounded p-4">
                                <h3 className="font-semibold mb-3">
                                    {ob.business.name}
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({ob.business.businessType})
                                    </span>
                                </h3>
                                <div className="space-y-2">
                                    {ob.items.map((item) => (
                                        <div
                                            key={item.productId}
                                            className="flex justify-between items-center text-sm"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-gray-500">
                                                    Qty: {item.quantity}
                                                </p>
                                            </div>
                                            <p className="text-right">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Pricing */}
                        <div className="bg-gray-800/50 rounded p-4 space-y-2 border-t border-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Order Total:</span>
                                <span>${selectedOrder.orderPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Delivery Fee:</span>
                                <span>${selectedOrder.deliveryPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold border-t border-gray-700 pt-2 mt-2">
                                <span>Grand Total:</span>
                                <span className="text-green-400">
                                    ${selectedOrder.totalPrice.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Status Update */}
                        {selectedOrder.status !== "DELIVERED" &&
                            selectedOrder.status !== "CANCELLED" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-400">
                                        Update Status
                                    </label>
                                    <Select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="ACCEPTED">Accepted</option>
                                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                        <option value="DELIVERED">Delivered</option>
                                    </Select>
                                    <Button
                                        variant="primary"
                                        className="w-full"
                                        onClick={() => handleStatusChange(selectedOrder)}
                                        disabled={updateLoading || newStatus === selectedOrder.status}
                                    >
                                        {updateLoading ? "Updating..." : "Update Status"}
                                    </Button>
                                </div>
                            )}

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setDetailsOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
