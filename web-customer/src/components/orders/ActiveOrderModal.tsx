"use client";

import { useQuery, useSubscription, useMutation } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
    X,
    Phone,
    MapPin,
    Clock,
    Check,
    Package,
    Loader2,
    UtensilsCrossed,
    Bike,
    ShieldCheck,
    Timer,
    CheckCheck,
} from "lucide-react";
import { GET_ORDER, CANCEL_ORDER } from "@/graphql/operations/orders";
import { ORDER_STATUS_UPDATED, ORDER_DRIVER_LIVE_TRACKING } from "@/graphql/operations/orders";
import dynamic from "next/dynamic";
const OrderTrackingMap = dynamic(() => import("@/components/orders/OrderTrackingMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#0a0a1a] flex items-center justify-center">
            <Loader2 size={32} className="text-white/30 animate-spin" />
        </div>
    ),
});

/* ── Status config ───────────────────────────────────────────── */

const ACTIVE_STATUSES = ["AWAITING_APPROVAL", "PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

const STATUS_FLOW_RESTAURANT = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const STATUS_FLOW_MARKET = ["PENDING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

const STATUS_STEP_ICONS: Record<string, typeof Clock> = {
    PENDING: Timer,
    PREPARING: UtensilsCrossed,
    READY: Package,
    OUT_FOR_DELIVERY: Bike,
    DELIVERED: CheckCheck,
};

const STATUS_STEP_LABELS: Record<string, string> = {
    PENDING: "orders.details.placed_at",
    PREPARING: "orders.details.preparing_at",
    READY: "orders.details.ready_at",
    OUT_FOR_DELIVERY: "orders.details.picked_up_at",
    DELIVERED: "orders.details.delivered_at",
};

const STATUS_META: Record<string, { label: string; color: string; accent: string; icon: typeof Package }> = {
    AWAITING_APPROVAL: { label: "Awaiting approval", color: "text-amber-400", accent: "bg-amber-500", icon: ShieldCheck },
    PENDING: { label: "Waiting for confirmation", color: "text-amber-400", accent: "bg-amber-500", icon: Clock },
    PREPARING: { label: "Being prepared", color: "text-orange-400", accent: "bg-orange-500", icon: UtensilsCrossed },
    READY: { label: "Ready for pickup", color: "text-blue-400", accent: "bg-blue-500", icon: Package },
    OUT_FOR_DELIVERY: { label: "On the way", color: "text-emerald-400", accent: "bg-emerald-500", icon: Bike },
    DELIVERED: { label: "Delivered", color: "text-emerald-400", accent: "bg-emerald-500", icon: Check },
    CANCELLED: { label: "Cancelled", color: "text-red-400", accent: "bg-red-500", icon: X },
};

const isMarketType = (type?: string | null) => type === "MARKET" || type === "PHARMACY";

const getCustomerVisibleStatus = (status: string, businessType?: string | null) => {
    if (isMarketType(businessType)) return status === "PREPARING" ? "READY" : status;
    return status === "READY" ? "PREPARING" : status;
};

/* ── ETA countdown hook ──────────────────────────────────────── */

const ETA_TTL_MS = 20_000;

function useEtaCountdown(etaSeconds: number | null | undefined, etaUpdatedAt: string | null | undefined) {
    const [seconds, setSeconds] = useState<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (etaSeconds == null || !etaUpdatedAt) { setSeconds(null); return; }
        const updatedAtMs = new Date(etaUpdatedAt).getTime();
        if (Date.now() - updatedAtMs > ETA_TTL_MS) { setSeconds(null); return; }

        const elapsed = Math.floor((Date.now() - updatedAtMs) / 1000);
        const remaining = Math.max(0, etaSeconds - elapsed);
        setSeconds(remaining);

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setSeconds((prev) => (prev != null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [etaSeconds, etaUpdatedAt]);

    return seconds;
}

/* ── Props ───────────────────────────────────────────────────── */

interface ActiveOrderModalProps {
    orderId: string;
    onClose: () => void;
}

/* ── Component ───────────────────────────────────────────────── */

export function ActiveOrderModal({ orderId, onClose }: ActiveOrderModalProps) {
    const { user } = useAuth();
    const { t } = useTranslations();

    /* ── Data ── */
    const { data, loading: orderLoading, refetch } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !user,
        fetchPolicy: "cache-and-network",
    });

    const order = (data as any)?.order;
    const status: string = order?.status ?? "";
    const isActive = ACTIVE_STATUSES.includes(status);

    // Live status subscription
    useSubscription(ORDER_STATUS_UPDATED, {
        variables: { orderId },
        skip: !user || !order,
        onData: () => refetch(),
    });

    // Driver live tracking
    const showTracking = ["READY", "OUT_FOR_DELIVERY"].includes(status);
    const { data: trackingData } = useSubscription(ORDER_DRIVER_LIVE_TRACKING, {
        variables: { orderId },
        skip: !user || !showTracking,
    });

    const liveTracking = (trackingData as any)?.orderDriverLiveTracking;

    // ETA
    const etaFromDriver = useEtaCountdown(
        liveTracking?.remainingEtaSeconds ?? order?.driver?.driverConnection?.remainingEtaSeconds,
        liveTracking?.etaUpdatedAt ?? order?.driver?.driverConnection?.etaUpdatedAt
    );

    const etaMinutes = etaFromDriver != null ? Math.ceil(etaFromDriver / 60) : order?.preparationMinutes ?? null;

    // Cancel
    const [cancelOrder, { loading: cancelLoading }] = useMutation(CANCEL_ORDER);
    const canCancel = status === "PENDING";

    const handleCancel = useCallback(async () => {
        if (!confirm(t("orders.cancel_confirm"))) return;
        try {
            await cancelOrder({ variables: { id: orderId } });
            refetch();
        } catch { /* ignore */ }
    }, [cancelOrder, orderId, refetch, t]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Close when order completes
    useEffect(() => {
        if (order && !isActive && status !== "") onClose();
    }, [order, isActive, status, onClose]);

    /* ── Derived ── */
    const meta = STATUS_META[status] ?? STATUS_META.PENDING;
    const StatusIcon = meta.icon;
    const businessName = order?.businesses?.[0]?.business?.name ?? "";
    const businessImageUrl = order?.businesses?.[0]?.business?.imageUrl ?? null;
    const businessLocation = order?.pickupLocations?.[0] ?? order?.businesses?.[0]?.business?.location ?? null;
    const dropoff = order?.dropOffLocation ?? null;
    const driver = order?.driver ?? null;
    const driverLoc = liveTracking
        ? { latitude: liveTracking.latitude, longitude: liveTracking.longitude }
        : driver?.driverLocation ?? null;

    const orderItems = useMemo(() =>
        Array.isArray(order?.businesses)
            ? order.businesses.flatMap((b: any) => (Array.isArray(b?.items) ? b.items : []))
            : [],
        [order]
    );

    const primaryBusinessType = order?.businesses?.[0]?.business?.businessType as string | undefined;
    const customerVisibleStatus = getCustomerVisibleStatus(status, primaryBusinessType);
    const isMarket = isMarketType(primaryBusinessType);
    const statusFlow = isMarket ? STATUS_FLOW_MARKET : STATUS_FLOW_RESTAURANT;

    const currentStepIndex = useMemo(() => {
        if (status === "AWAITING_APPROVAL" || status === "CANCELLED") return -1;
        return statusFlow.indexOf(customerVisibleStatus as typeof statusFlow[number]);
    }, [status, customerVisibleStatus, statusFlow]);

    /* ── Render ── */
    return (
        <div className="fixed inset-0 z-[70] flex pointer-events-none">
            {/* Loading overlay while order data fetches */}
            {orderLoading && !order && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 pointer-events-auto">
                    <Loader2 size={36} className="animate-spin text-white" />
                </div>
            )}
            {/* ── Map area (full screen behind panel) ── */}
            <div className="relative flex-1 min-h-0 pointer-events-auto bg-[#0a0a1a]">
                {dropoff && (
                    <OrderTrackingMap
                        dropoff={dropoff}
                        pickup={businessLocation}
                        driverLocation={showTracking ? driverLoc : null}
                        driver={driver}
                        businessImageUrl={businessImageUrl}
                        orderStatus={status}
                        interactive
                        className="h-full"
                    />
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors z-10 pointer-events-auto"
                >
                    <X size={20} />
                </button>
            </div>

            {/* ── Right panel ── */}
            <div className="relative w-[340px] shrink-0 bg-[var(--card)] border-l border-[var(--border)] shadow-2xl shadow-black/40 z-10 pointer-events-auto flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.accent} text-white shrink-0`}>
                        <StatusIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] leading-tight truncate">{meta.label}</p>
                        <p className="text-[12px] text-[var(--muted)] leading-tight mt-0.5">
                            Order #{order?.displayId ?? orderId.slice(0, 8)}
                            {businessName ? <span className="text-[var(--foreground)]/60"> · {businessName}</span> : ""}
                        </p>
                    </div>
                    {etaMinutes != null && etaMinutes > 0 && (
                        <div className="flex flex-col items-center shrink-0 bg-[var(--background)] rounded-xl px-3 py-2 border border-[var(--border)]">
                            <span className="text-[18px] font-black leading-none text-[var(--foreground)]">{etaMinutes}</span>
                            <span className="text-[9px] font-medium text-[var(--muted)] uppercase tracking-wide">min</span>
                        </div>
                    )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {/* Status stepper */}
                    {status !== "CANCELLED" && status !== "AWAITING_APPROVAL" && (
                        <div className="flex items-start justify-between">
                            {statusFlow.map((step, idx) => {
                                const done = idx < currentStepIndex;
                                const active = idx === currentStepIndex;
                                const StepIcon = STATUS_STEP_ICONS[step] ?? Clock;
                                const isLast = idx === statusFlow.length - 1;

                                const iconColor = done
                                    ? "text-emerald-500"
                                    : active
                                    ? meta.color
                                    : "text-[var(--muted)]/40";
                                const leftLineColor = idx <= currentStepIndex
                                    ? "bg-emerald-500"
                                    : "bg-[var(--border)]";
                                const rightLineColor = idx < currentStepIndex
                                    ? "bg-emerald-500"
                                    : "bg-[var(--border)]";

                                return (
                                    <div key={step} className="flex-1 flex flex-col items-center">
                                        <div className="flex items-center w-full">
                                            {idx > 0 ? (
                                                <div className={cn("flex-1 h-[2px]", leftLineColor)} />
                                            ) : (
                                                <div className="flex-1" />
                                            )}
                                            <div
                                                className={cn(
                                                    "flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-all duration-300",
                                                    done && "bg-emerald-500/10",
                                                    active && "border-2 scale-110",
                                                    !done && !active && "bg-[var(--background-secondary)]",
                                                )}
                                                style={active ? { borderColor: `var(--primary)`, backgroundColor: `var(--primary-alpha, rgba(99,102,241,0.08))` } : undefined}
                                            >
                                                {done ? (
                                                    <Check size={13} className="text-emerald-500" />
                                                ) : (
                                                    <StepIcon size={13} className={iconColor} />
                                                )}
                                            </div>
                                            {!isLast ? (
                                                <div className={cn("flex-1 h-[2px]", rightLineColor)} />
                                            ) : (
                                                <div className="flex-1" />
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                "text-[9px] mt-1 text-center leading-tight",
                                                active && "font-bold",
                                                active ? meta.color : done ? "text-emerald-500" : "text-[var(--muted)]",
                                            )}
                                        >
                                            {t(STATUS_STEP_LABELS[step] ?? "")}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Awaiting approval notice */}
                    {status === "AWAITING_APPROVAL" && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                            <ShieldCheck size={16} className="shrink-0 text-amber-500 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-amber-500">Order pending approval</p>
                                <p className="text-[11px] text-[var(--muted)] mt-0.5">Your order is being reviewed. You&apos;ll be notified once it&apos;s confirmed.</p>
                            </div>
                        </div>
                    )}

                    {/* Driver card */}
                    {driver && (
                        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                            <div className="relative h-11 w-11 shrink-0 rounded-full bg-[var(--background-secondary)] overflow-hidden flex items-center justify-center">
                                {driver.imageUrl ? (
                                    <Image src={driver.imageUrl} alt="" fill className="object-cover" sizes="44px" />
                                ) : (
                                    <span className="text-xs font-bold text-[var(--muted)]">
                                        {(driver.firstName?.[0] ?? "").toUpperCase()}
                                        {(driver.lastName?.[0] ?? "").toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold truncate">{driver.firstName} {driver.lastName}</p>
                                <p className="text-[11px] text-[var(--muted)]">{t("orders.your_driver")}</p>
                            </div>
                            {driver.phoneNumber && (
                                <a
                                    href={`tel:${driver.phoneNumber}`}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0 hover:bg-emerald-600 transition-colors"
                                >
                                    <Phone size={14} />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Delivery address */}
                    {dropoff?.address && (
                        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--background-secondary)] shrink-0">
                                <MapPin size={14} className="text-[var(--muted)]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium text-[var(--muted)]">{t("orders.delivery_address")}</p>
                                <p className="text-[13px] font-medium leading-tight">{dropoff.address}</p>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-[var(--border)]" />

                    {/* Order items — always visible */}
                    <div>
                        <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Items</p>
                        <div className="space-y-2">
                            {orderItems.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3">
                                    {item.imageUrl ? (
                                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--background-secondary)]">
                                            <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                                        </div>
                                    ) : (
                                        <div className="h-10 w-10 shrink-0 rounded-lg bg-[var(--background-secondary)] flex items-center justify-center">
                                            <Package size={16} className="text-[var(--muted)]" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium truncate">{item.name}</p>
                                        {item.childItems?.length > 0 && (
                                            <p className="text-[10px] text-[var(--muted)] truncate">
                                                {item.childItems.map((c: any) => c.name).join(", ")}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-[13px] font-semibold">{formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}</span>
                                        <span className="text-[10px] text-[var(--muted)]">×{item.quantity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Price summary */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2 text-[13px]">
                        <div className="flex justify-between text-[var(--muted)]">
                            <span>{t("common.subtotal")}</span>
                            <span className="text-[var(--foreground)]">{formatPrice(order?.orderPrice ?? 0)}</span>
                        </div>
                        <div className="flex justify-between text-[var(--muted)]">
                            <span>{t("common.delivery")}</span>
                            <span className="text-[var(--foreground)]">{order?.deliveryPrice === 0 ? "Free" : formatPrice(order?.deliveryPrice ?? 0)}</span>
                        </div>
                        {order?.orderPromotions?.map((promo: any) => (
                            <div key={promo.id} className="flex justify-between text-emerald-500 font-medium">
                                <span>{promo.promoCode ?? t("cart.promo")}</span>
                                <span>-{formatPrice(promo.discountAmount ?? 0)}</span>
                            </div>
                        ))}
                        <div className="border-t border-[var(--border)]" />
                        <div className="flex justify-between font-bold text-[15px]">
                            <span>{t("common.total")}</span>
                            <span>{formatPrice(order?.totalPrice ?? 0)}</span>
                        </div>
                    </div>

                    {/* Cancel order info */}
                    {canCancel && (
                        <div className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-500 py-3 text-xs font-medium bg-red-500/5">
                            <span>{t("orders.cancel_order_phone_only")}</span>
                            <a href="tel:045205045" className="underline font-bold">045 205 045</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
