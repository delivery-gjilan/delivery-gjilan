"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "@/localization";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    MapPin,
    Minus,
    Plus,
    Trash2,
    Ticket,
    Loader2,
    Check,
    ChevronRight,
    Zap,
    AlertTriangle,
    X,
} from "lucide-react";

import { GET_MY_ADDRESSES } from "@/graphql/operations/addresses";
import { CALCULATE_DELIVERY_PRICE } from "@/graphql/operations/deliveryPricing";
import { VALIDATE_PROMOTIONS, GET_APPLICABLE_PROMOTIONS } from "@/graphql/operations/promotions";
import { CREATE_ORDER } from "@/graphql/operations/orders";
import { GET_SERVICE_ZONES } from "@/graphql/operations/serviceZone";
import { GET_BUSINESS_MINIMUM } from "@/graphql/operations/businesses";
import { GET_PRIORITY_SURCHARGE_AMOUNT } from "@/graphql/operations/orders";
import dynamic from "next/dynamic";
const AddressPickerMap = dynamic(() => import("@/components/checkout/AddressPickerMap"), { ssr: false });
import { isPointInPolygon } from "@/lib/pointInPolygon";
import { useOrderModalsStore } from "@/store/orderModalsStore";
import type { GqlAddress, GqlDeliveryZone, GqlPromotion } from "@/types/graphql";

type CheckoutStep = 1 | 2 | 3;

interface SelectedLocation {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
    addressId?: string;
}

interface CheckoutFlowProps {
    onClose: () => void;
    /** When true renders as a drawer (close X + no background page navigation) */
    drawerMode?: boolean;
}

export function CheckoutFlow({ onClose, drawerMode = false }: CheckoutFlowProps) {
    const { t } = useTranslations();
    const { user } = useAuth();

    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const updateItemNotes = useCartStore((s) => s.updateItemNotes);
    const clearCart = useCartStore((s) => s.clearCart);
    const getTotal = useCartStore((s) => s.getTotal);
    const getItemCount = useCartStore((s) => s.getItemCount);

    const subtotal = getTotal();
    const itemCount = getItemCount();
    const businessIds = useMemo(
        () => Array.from(new Set(items.map((i) => i.businessId))),
        [items]
    );

    const [step, setStep] = useState<CheckoutStep>(1);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [driverNotes, setDriverNotes] = useState("");
    const [isPriority, setIsPriority] = useState(false);
    const [deliveryPrice, setDeliveryPrice] = useState(2.0);
    const [deliveryPriceLoading, setDeliveryPriceLoading] = useState(false);
    const [promoResult, setPromoResult] = useState<{
        promotionId: string | null;
        discountAmount: number;
        freeDeliveryApplied: boolean;
        effectiveDeliveryPrice: number;
        totalPrice: number;
    } | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [addressOutOfZone, setAddressOutOfZone] = useState(false);

    const { data: addressesData } = useQuery(GET_MY_ADDRESSES, { fetchPolicy: "cache-and-network", skip: !user });
    const { data: zonesData } = useQuery(GET_SERVICE_ZONES, { fetchPolicy: "cache-and-network" });
    const { data: businessMinData } = useQuery(GET_BUSINESS_MINIMUM, {
        variables: { id: businessIds[0] },
        skip: !businessIds[0],
    });
    const { data: surchargeData } = useQuery(GET_PRIORITY_SURCHARGE_AMOUNT);

    const [calculateDeliveryPriceFn] = useLazyQuery(CALCULATE_DELIVERY_PRICE, { fetchPolicy: "network-only" });
    const [validatePromotionsFn, { loading: promoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS, { fetchPolicy: "network-only" });
    const [createOrderMutation, { loading: orderLoading }] = useMutation(CREATE_ORDER);
    const { showOrderSuccess, showAwaitingApproval } = useOrderModalsStore();

    const savedAddresses = useMemo(
        () => ((addressesData as any)?.myAddresses ?? []) as any[],
        [addressesData]
    );

    const effectiveServiceZones = useMemo(() => {
        const activeZones = ((zonesData as any)?.deliveryZones ?? []).filter((z: any) => z.isActive);
        const serviceZones = activeZones.filter((z: any) => z.isServiceZone === true);
        return (serviceZones.length > 0 ? serviceZones : activeZones) as Array<{ polygon: Array<{ lat: number; lng: number }> }>;
    }, [zonesData]);

    const isLocationInZone = useCallback(
        (loc: SelectedLocation) => {
            if (effectiveServiceZones.length === 0) return true;
            return effectiveServiceZones.some((z) =>
                isPointInPolygon({ lat: loc.latitude, lng: loc.longitude }, z.polygon)
            );
        },
        [effectiveServiceZones]
    );

    const minOrderAmount = Number((businessMinData as any)?.business?.minOrderAmount ?? 0);
    const minimumMet = minOrderAmount <= 0 || subtotal >= minOrderAmount;
    const prioritySurcharge = Number((surchargeData as any)?.prioritySurchargeAmount ?? 0);

    const cartContext = useMemo(
        () => ({
            items: items.map((item) => ({
                productId: item.productId,
                businessId: item.businessId,
                quantity: item.quantity,
                price: item.unitPrice,
            })),
            subtotal,
            deliveryPrice,
            businessIds,
        }),
        [items, subtotal, deliveryPrice, businessIds]
    );

    const { data: applicableData } = useQuery(GET_APPLICABLE_PROMOTIONS, {
        variables: { cart: cartContext },
        skip: items.length === 0,
        fetchPolicy: "cache-and-network",
    });
    const eligiblePromo = useMemo(() => {
        const list = (applicableData as any)?.getApplicablePromotions ?? [];
        return list.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))[0] ?? null;
    }, [applicableData]);

    const effectiveDeliveryPrice = promoResult?.freeDeliveryApplied ? 0 : deliveryPrice;
    const appliedDiscount = promoResult?.discountAmount ?? 0;
    const priorityFee = isPriority ? prioritySurcharge : 0;
    const finalTotal = subtotal + effectiveDeliveryPrice + priorityFee - appliedDiscount;

    const requestDeliveryFee = useCallback(
        async (location: SelectedLocation) => {
            if (!businessIds[0]) return;
            setDeliveryPriceLoading(true);
            try {
                const res = await calculateDeliveryPriceFn({
                    variables: {
                        dropoffLat: location.latitude,
                        dropoffLng: location.longitude,
                        businessId: businessIds[0],
                    },
                });
                const price = (res.data as any)?.calculateDeliveryPrice?.price;
                if (price != null) setDeliveryPrice(Number(price));
            } catch {
                // keep default
            } finally {
                setDeliveryPriceLoading(false);
            }
        },
        [businessIds, calculateDeliveryPriceFn]
    );

    // Clear promo if cart items change (promo may no longer be valid)
    const itemsKey = useMemo(() => items.map(i => `${i.productId}:${i.quantity}`).join(","), [items]);
    useEffect(() => {
        if (promoResult) {
            setPromoResult(null);
            setPromoError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemsKey]);

    const handleApplyPromo = useCallback(async () => {
        if (!couponCode.trim()) return;
        setPromoError(null);
        try {
            const res = await validatePromotionsFn({
                variables: { cart: cartContext, manualCode: couponCode.trim() },
            });
            const result = (res.data as any)?.validatePromotions;
            if (!result || (Array.isArray(result.promotions) && result.promotions.length === 0)) {
                setPromoError(t("cart.invalid_code"));
                return;
            }
            setPromoResult({
                promotionId: result.promotions?.[0]?.id ?? null,
                discountAmount: Number(result.totalDiscount ?? 0),
                freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                totalPrice: Number(result.finalTotal ?? subtotal + deliveryPrice),
            });
        } catch {
            setPromoError(t("cart.invalid_code"));
        }
    }, [couponCode, cartContext, validatePromotionsFn, t, deliveryPrice, subtotal]);

    const handleSelectAddress = useCallback(
        (location: SelectedLocation) => {
            setSelectedLocation(location);
            setAddressOutOfZone(false);
            requestDeliveryFee(location);
            setStep(3);
        },
        [requestDeliveryFee]
    );

    const handleSelectSavedAddress = useCallback(
        (addr: GqlAddress) => {
            const loc: SelectedLocation = {
                latitude: addr.latitude,
                longitude: addr.longitude,
                address: addr.displayName ?? addr.addressName ?? "",
                label: addr.addressName ?? undefined,
                addressId: addr.id,
            };
            const inZone = isLocationInZone(loc);
            setAddressOutOfZone(!inZone);
            if (!inZone) return;
            handleSelectAddress(loc);
        },
        [isLocationInZone, handleSelectAddress]
    );

    const handlePlaceOrder = useCallback(async () => {
        if (!selectedLocation || items.length === 0) return;
        setOrderError(null);
        const orderItems = items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
            notes: item.notes || null,
            selectedOptions: item.selectedOptions.map((opt) => ({
                optionGroupId: opt.optionGroupId,
                optionId: opt.optionId,
                price: opt.extraPrice > 0 ? opt.extraPrice : null,
            })),
            childItems: [],
        }));

        try {
            const result = await createOrderMutation({
                variables: {
                    input: {
                        items: orderItems,
                        dropOffLocation: {
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                            address: selectedLocation.address,
                        },
                        deliveryPrice: effectiveDeliveryPrice,
                        totalPrice: finalTotal,
                        promotionId: promoResult?.promotionId ?? null,
                        driverNotes: driverNotes || null,
                        priorityRequested: isPriority,
                        prioritySurcharge: priorityFee,
                    },
                },
            });

            const order = (result.data as any)?.createOrder;
            if (order) {
                clearCart();
                onClose();
                if (order.status === "AWAITING_APPROVAL") {
                    const reasons: string[] = Array.isArray(order.approvalReasons) ? order.approvalReasons : [];
                    showAwaitingApproval(order.id, reasons);
                } else {
                    showOrderSuccess(order.id);
                }
            }
        } catch (err: any) {
            setOrderError(err.message ?? t("common.error"));
        }
    }, [
        selectedLocation, items, effectiveDeliveryPrice, finalTotal, promoResult,
        driverNotes, isPriority, priorityFee, createOrderMutation, showOrderSuccess,
        showAwaitingApproval, clearCart, onClose, t,
    ]);

    // Close the cart when all items are removed
    useEffect(() => {
        if (items.length === 0) {
            onClose();
        }
    }, [items.length, onClose]);

    const handleBack = useCallback(() => {
        if (step > 1) {
            setStep((s) => (s - 1) as CheckoutStep);
        } else {
            onClose();
        }
    }, [step, onClose]);

    if (!user) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="text-[var(--foreground-secondary)]">{t("auth.login_required")}</p>
                <Link href="/login" onClick={onClose}>
                    <Button>{t("auth.login")}</Button>
                </Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="text-[var(--foreground-secondary)]">{t("cart.empty_message")}</p>
                <Button onClick={onClose}>{t("cart.start_shopping")}</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] shrink-0">
                <button
                    onClick={handleBack}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <ArrowLeft size={15} />
                </button>
                <h2 className="flex-1 text-base font-bold text-[var(--foreground)]">{t("cart.checkout")}</h2>
                {drawerMode && (
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center px-4 py-3 gap-0 shrink-0">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                                    step >= s
                                        ? "bg-[var(--primary)] text-white"
                                        : "bg-[var(--background-secondary)] text-[var(--muted)]"
                                )}
                            >
                                {step > s ? <Check size={12} /> : s}
                            </div>
                            <span className="text-[11px] text-[var(--muted)] mt-1 w-16 text-center">
                                {s === 1 ? t("cart.review") : s === 2 ? t("cart.address") : t("cart.confirm")}
                            </span>
                        </div>
                        {s < 3 && (
                            <div className={cn("h-0.5 w-12 rounded transition-colors mb-4", step > s ? "bg-[var(--primary)]" : "bg-[var(--border)]")} />
                        )}
                    </div>
                ))}
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

                {/* ── Step 1: Review ── */}
                {step === 1 && (
                    <>
                        <div className="space-y-2">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 flex-col"
                                >
                                    <div className="flex gap-3">
                                        {item.imageUrl && (
                                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--background-secondary)]">
                                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.name}</p>
                                            {item.selectedOptions.length > 0 && (
                                                <p className="text-xs text-[var(--muted)] truncate">
                                                    {item.selectedOptions.map((o) => o.optionName).join(", ")}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-1.5">
                                                <span className="text-sm font-bold">
                                                    {formatPrice(
                                                        (item.unitPrice + item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0)) * item.quantity
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {item.quantity === 1 ? (
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-[var(--danger)]"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)]"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                    )}
                                                    <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)]"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Item instructions */}
                                    <input
                                        type="text"
                                        value={item.notes || ""}
                                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                        placeholder={t("cart.item_notes_placeholder")}
                                        className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Auto-applied promo indicator */}
                        {eligiblePromo && (
                            <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-2.5">
                                <Ticket size={14} className="text-[var(--success)] shrink-0" />
                                <span className="text-sm text-[var(--success)] font-medium">
                                    {eligiblePromo.freeDelivery ? t("cart.free_delivery") : `-${formatPrice(eligiblePromo.appliedAmount ?? 0)}`}
                                    {" · "}{eligiblePromo.name ?? eligiblePromo.code}
                                </span>
                            </div>
                        )}

                        {!minimumMet && (
                            <p className="text-sm text-[var(--warning)] text-center">
                                {t("cart.minimum_not_met", { amount: formatPrice(minOrderAmount) })}
                            </p>
                        )}
                    </>
                )}

                {/* ── Step 2: Address ── */}
                {step === 2 && (
                    <>
                        {savedAddresses.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("address.saved_addresses")}</h3>
                                {savedAddresses.map((addr: any) => {
                                    const inZone =
                                        effectiveServiceZones.length === 0 ||
                                        effectiveServiceZones.some((z) =>
                                            isPointInPolygon({ lat: addr.latitude, lng: addr.longitude }, z.polygon)
                                        );
                                    return (
                                        <button
                                            key={addr.id}
                                            onClick={() => handleSelectSavedAddress(addr)}
                                            className={cn(
                                                "flex w-full items-center gap-3 rounded-[var(--radius)] border p-3 text-left transition-colors",
                                                !inZone
                                                    ? "border-orange-400/40 bg-orange-500/5 opacity-70"
                                                    : selectedLocation?.addressId === addr.id
                                                    ? "border-[var(--primary)] bg-[var(--primary-light)]"
                                                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50"
                                            )}
                                        >
                                            <MapPin size={16} className={cn("shrink-0", inZone ? "text-[var(--primary)]" : "text-orange-400")} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{addr.addressName ?? t("address.unnamed")}</p>
                                                <p className="text-xs text-[var(--muted)] truncate">{addr.displayName}</p>
                                                {!inZone && <p className="text-xs text-orange-400 mt-0.5">{t("cart.outside_zone_selected")}</p>}
                                            </div>
                                            {inZone ? (
                                                <ChevronRight size={14} className="text-[var(--muted)]" />
                                            ) : (
                                                <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                                {addressOutOfZone && (
                                    <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-orange-400/40 bg-orange-500/10 px-3 py-2.5">
                                        <AlertTriangle size={14} className="shrink-0 text-orange-400 mt-0.5" />
                                        <p className="text-sm text-orange-400">{t("cart.outside_zone_inline_warning")}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <AddressPickerMap
                                onSelect={handleSelectAddress}
                                initialLocation={selectedLocation}
                            />
                        </div>
                    </>
                )}

                {/* ── Step 3: Confirm ── */}
                {step === 3 && (
                    <>
                        {selectedLocation && (
                            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="shrink-0 text-[var(--primary)] mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{selectedLocation.label ?? t("address.delivery_address")}</p>
                                        <p className="text-xs text-[var(--muted)] mt-0.5">{selectedLocation.address}</p>
                                    </div>
                                    <button onClick={() => setStep(2)} className="text-xs text-[var(--primary)] hover:underline shrink-0">
                                        {t("common.change")}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                            <label className="text-sm font-medium text-[var(--foreground)]">{t("cart.driver_notes")}</label>
                            <textarea
                                value={driverNotes}
                                onChange={(e) => setDriverNotes(e.target.value)}
                                placeholder={t("cart.driver_notes_placeholder")}
                                rows={2}
                                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                        </div>

                        {prioritySurcharge > 0 && (
                            <button
                                onClick={() => setIsPriority(!isPriority)}
                                className={cn(
                                    "flex w-full items-center justify-between rounded-[var(--radius)] border p-4 transition-colors",
                                    isPriority ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border)] bg-[var(--card)]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Zap size={16} className={isPriority ? "text-[var(--primary)]" : "text-[var(--muted)]"} />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">{t("cart.priority_delivery")}</p>
                                        <p className="text-xs text-[var(--muted)]">{t("cart.priority_description")}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-[var(--primary)]">+{formatPrice(prioritySurcharge)}</span>
                            </button>
                        )}

                        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--foreground-secondary)]">{t("common.subtotal")}</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--foreground-secondary)]">{t("common.delivery")}</span>
                                {deliveryPriceLoading ? (
                                    <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
                                ) : promoResult?.freeDeliveryApplied ? (
                                    <div className="flex items-center gap-2">
                                        <span className="line-through text-[var(--muted)]">{formatPrice(deliveryPrice)}</span>
                                        <span className="text-[var(--success)]">{t("common.free")}</span>
                                    </div>
                                ) : (
                                    <span>{formatPrice(effectiveDeliveryPrice)}</span>
                                )}
                            </div>
                            {isPriority && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--foreground-secondary)]">{t("cart.priority_fee")}</span>
                                    <span className="text-[var(--primary)]">+{formatPrice(priorityFee)}</span>
                                </div>
                            )}
                            {appliedDiscount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--foreground-secondary)]">{t("cart.promo")}</span>
                                    <span className="text-[var(--success)]">-{formatPrice(appliedDiscount)}</span>
                                </div>
                            )}
                            <hr className="border-[var(--border)]" />
                            <div className="flex justify-between text-base font-bold">
                                <span>{t("common.total")}</span>
                                <span>{formatPrice(finalTotal)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Sticky footer CTA */}
            <div className="shrink-0 border-t border-[var(--border)] px-4 py-4 bg-[var(--background)]">
                {step === 1 && (
                    <Button size="lg" className="w-full" disabled={!minimumMet} onClick={() => setStep(2)}>
                        {t("cart.continue_to_address")} · {formatPrice(subtotal)}
                    </Button>
                )}
                {step === 3 && (
                    <>
                        {orderError && <p className="text-sm text-[var(--danger)] text-center mb-3">{orderError}</p>}
                        <Button size="lg" className="w-full" disabled={orderLoading || !selectedLocation} onClick={handlePlaceOrder}>
                            {orderLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>{t("cart.place_order")} · {formatPrice(finalTotal)}</>
                            )}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
