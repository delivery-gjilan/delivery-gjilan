"use client";

import { useQuery, useSubscription, useMutation } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import Image from "next/image";
import Link from "next/link";
import { use, useState, useMemo } from "react";
import {
    ArrowLeft,
    MapPin,
    Phone,
    Clock,
    Package,
    Check,
    X,
    Star,
    Loader2,
    Navigation,
} from "lucide-react";
import { GET_ORDER, CANCEL_ORDER, SUBMIT_ORDER_REVIEW } from "@/graphql/operations/orders";
import { ORDER_STATUS_UPDATED, ORDER_DRIVER_LIVE_TRACKING } from "@/graphql/operations/orders";
import dynamic from "next/dynamic";
const OrderTrackingMap = dynamic(() => import("@/components/orders/OrderTrackingMap"), { ssr: false });

const STATUS_FLOW = [
    "AWAITING_APPROVAL",
    "PENDING",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
];

const statusColors: Record<string, "default" | "success" | "warning" | "danger"> = {
    AWAITING_APPROVAL: "warning",
    PENDING: "warning",
    PREPARING: "warning",
    READY: "default",
    OUT_FOR_DELIVERY: "default",
    DELIVERED: "success",
    CANCELLED: "danger",
};

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    const { user } = useAuth();
    const { t } = useTranslations();

    const { data, loading, refetch } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !user,
        fetchPolicy: "no-cache",
        errorPolicy: "all",
    });

    const order = (data as any)?.order;

    // Subscribe to status updates
    useSubscription(ORDER_STATUS_UPDATED, {
        variables: { orderId },
        skip: !user || !order,
        onData: () => refetch(),
    });

    // Driver live tracking
    const { data: trackingData } = useSubscription(ORDER_DRIVER_LIVE_TRACKING, {
        variables: { orderId },
        skip: !user || !order || !["READY", "OUT_FOR_DELIVERY"].includes(order?.status),
    });

    const driverLocation = (trackingData as any)?.orderDriverLiveTracking;

    const [cancelOrder, { loading: cancelLoading }] = useMutation(CANCEL_ORDER);
    const [submitReview, { loading: reviewLoading }] = useMutation(SUBMIT_ORDER_REVIEW);

    const [rating, setRating] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSent, setReviewSent] = useState(false);
    const orderItems = Array.isArray(order?.businesses)
        ? order.businesses.flatMap((b: any) => (Array.isArray(b?.items) ? b.items : []))
        : [];

    const canCancel = order?.status === "PENDING";
    const isActive = !!order?.status && ["AWAITING_APPROVAL", "PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(
        order.status
    );
    const canReview = order?.status === "DELIVERED" && !order?.reviewSubmitted && !reviewSent;
    const showMap = isActive && ["READY", "OUT_FOR_DELIVERY"].includes(order?.status ?? "");

    const currentStepIndex = useMemo(
        () => (order ? STATUS_FLOW.indexOf(order.status) : -1),
        [order]
    );

    const handleCancel = async () => {
        if (!confirm(t("orders.cancel_confirm"))) return;
        try {
            await cancelOrder({ variables: { id: orderId } });
            refetch();
        } catch {
            // ignore
        }
    };

    const handleReview = async () => {
        if (rating < 1) return;
        try {
            await submitReview({
                variables: { input: { orderId, rating, comment: reviewComment || null } },
            });
            setReviewSent(true);
        } catch {
            // ignore
        }
    };

    if (!user) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <p className="text-[var(--foreground-secondary)]">{t("auth.login_required")}</p>
                <Link href="/login">
                    <Button>{t("auth.login")}</Button>
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center">
                <p className="text-[var(--muted)]">{t("orders.not_found")}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/profile"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)]"
                >
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="text-lg font-bold">
                        {t("orders.order")} #{order.displayId ?? order.orderNumber ?? orderId.slice(-6)}
                    </h1>
                    <p className="text-xs text-[var(--muted)]">{formatDate(order.orderDate ?? order.createdAt ?? order.updatedAt)}</p>
                </div>
                <Badge variant={statusColors[order.status] ?? "default"} className="ml-auto">
                    {order.status?.replace(/_/g, " ")}
                </Badge>
            </div>

            {/* Live Map */}
            {showMap && (
                <div className="rounded-[var(--radius)] overflow-hidden border border-[var(--border)]">
                    <OrderTrackingMap
                        dropoff={{
                            latitude: order.dropOffLocation?.latitude ?? order.dropOffLocation?.lat ?? 0,
                            longitude: order.dropOffLocation?.longitude ?? order.dropOffLocation?.lng ?? 0,
                        }}
                        pickup={
                            order.pickupLocations?.[0]
                                ? { latitude: order.pickupLocations[0].latitude ?? order.pickupLocations[0].lat, longitude: order.pickupLocations[0].longitude ?? order.pickupLocations[0].lng }
                                : order.businesses?.[0]?.business?.location
                                    ? {
                                        latitude: order.businesses[0].business.location.latitude,
                                        longitude: order.businesses[0].business.location.longitude,
                                    }
                                    : null
                        }
                        driverLocation={
                            driverLocation
                                ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
                                : null
                        }
                        driver={order.driver ?? null}
                        businessImageUrl={order.businesses?.[0]?.business?.imageUrl ?? null}
                        orderStatus={order.status}
                    />
                </div>
            )}

            {/* Status Timeline */}
            {order.status !== "CANCELLED" && (
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex items-center gap-1">
                        {STATUS_FLOW.map((status, idx) => (
                            <div key={status} className="flex items-center flex-1">
                                <div
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                                        idx <= currentStepIndex
                                            ? "bg-[var(--primary)] text-white"
                                            : "bg-[var(--background-secondary)] text-[var(--muted)]"
                                    )}
                                >
                                    {idx < currentStepIndex ? <Check size={10} /> : idx + 1}
                                </div>
                                {idx < STATUS_FLOW.length - 1 && (
                                    <div
                                        className={cn(
                                            "h-0.5 flex-1 mx-0.5",
                                            idx < currentStepIndex ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                        )}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-center text-[var(--foreground-secondary)] mt-2">
                        {order.status?.replace(/_/g, " ")}
                    </p>
                </div>
            )}

            {/* Driver Info */}
            {order.driver && (
                <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background-secondary)]">
                        <Navigation size={16} className="text-[var(--primary)]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium">{order.driver.firstName} {order.driver.lastName}</p>
                        <p className="text-xs text-[var(--muted)]">{t("orders.your_driver")}</p>
                    </div>
                    {order.driver.phoneNumber && (
                        <a
                            href={`tel:${order.driver.phoneNumber}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white"
                        >
                            <Phone size={14} />
                        </a>
                    )}
                </div>
            )}

            {/* Delivery Address */}
            {order.dropOffLocation && (
                <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
                    <MapPin size={16} className="shrink-0 text-[var(--primary)] mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">{t("orders.delivery_address")}</p>
                        <p className="text-xs text-[var(--muted)]">{order.dropOffLocation.address}</p>
                    </div>
                </div>
            )}

            {/* Order Items */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                <h3 className="text-sm font-semibold">{t("orders.items_title")}</h3>
                {orderItems.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3">
                        {item.imageUrl && (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-[var(--background-secondary)]">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name ?? ""}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.name ?? item.productId}</p>
                            <p className="text-xs text-[var(--muted)]">x{item.quantity}</p>
                        </div>
                        <span className="text-sm font-medium">{formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}</span>
                    </div>
                ))}
            </div>

            {/* Price Summary */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">{t("common.subtotal")}</span>
                    <span>{formatPrice(order.orderPrice ?? order.subtotal ?? order.totalPrice - (order.deliveryPrice ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">{t("common.delivery")}</span>
                    <span>{formatPrice(order.deliveryPrice ?? 0)}</span>
                </div>
                {Number(order.prioritySurcharge ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--foreground-secondary)]">{t("cart.priority_fee")}</span>
                        <span>+{formatPrice(Number(order.prioritySurcharge ?? 0))}</span>
                    </div>
                )}
                {Number(order.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--foreground-secondary)]">{t("cart.promo")}</span>
                        <span className="text-[var(--success)]">-{formatPrice(Number(order.discountAmount ?? 0))}</span>
                    </div>
                )}
                <hr className="border-[var(--border)]" />
                <div className="flex justify-between font-bold">
                    <span>{t("common.total")}</span>
                    <span>{formatPrice(order.totalPrice)}</span>
                </div>
            </div>


            {/* Cancel order info */}
            {canCancel && (
                <div className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-[var(--danger)]/30 text-[var(--danger)] py-2 text-xs font-medium bg-[var(--danger)]/5">
                    <span>{t("orders.cancel_order_phone_only")}</span>
                    <a href="tel:045205045" className="underline font-bold">045 205 045</a>
                </div>
            )}

            {/* Review */}
            {canReview && (
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                    <h3 className="text-sm font-semibold">{t("orders.rate_order")}</h3>
                    <div className="flex gap-1 justify-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setRating(s)}>
                                <Star
                                    size={28}
                                    className={cn(
                                        "transition-colors",
                                        s <= rating ? "fill-yellow-400 text-yellow-400" : "text-[var(--border)]"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={t("orders.review_placeholder")}
                        rows={2}
                        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <Button size="sm" onClick={handleReview} disabled={reviewLoading || rating < 1}>
                        {reviewLoading ? <Loader2 size={14} className="animate-spin" /> : t("orders.submit_review")}
                    </Button>
                </div>
            )}

            {reviewSent && (
                <div className="text-center py-4">
                    <Badge variant="success">{t("orders.review_submitted")}</Badge>
                </div>
            )}
        </div>
    );
}
