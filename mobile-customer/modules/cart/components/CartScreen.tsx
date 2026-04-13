import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated, Platform, BackHandler, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AddressPicker, { type SelectedAddress } from './AddressPicker';

import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useCart } from '../hooks/useCart';
import { useCartActions } from '../hooks/useCartActions';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useApolloClient, useLazyQuery, useQuery, useMutation } from '@apollo/client/react';
import { GET_ORDERS, GET_PRIORITY_SURCHARGE_AMOUNT } from '@/graphql/operations/orders';
import { GET_PRODUCT } from '@/graphql/operations/products';
import { VALIDATE_PROMOTIONS, GET_APPLICABLE_PROMOTIONS, GET_PROMOTION_THRESHOLDS } from '@/graphql/operations/promotions';
import { GET_MY_ADDRESSES, ADD_USER_ADDRESS, SET_DEFAULT_ADDRESS } from '@/graphql/operations/addresses';
import { CALCULATE_DELIVERY_PRICE } from '@/graphql/operations/deliveryPricing';
import { GET_SERVICE_ZONES } from '@/graphql/operations/serviceZone';
import { GET_BUSINESS_MINIMUM } from '@/graphql/operations/businesses';
import type { UserAddress } from '@/gql/graphql';
import { isPointInPolygon } from '@/utils/pointInPolygon';
import { RepeatOrCustomizeModal } from '@/modules/business/components/RepeatOrCustomizeModal';
import { useCartDataStore } from '../store/cartDataStore';
import * as Haptics from 'expo-haptics';
import { PromoAppliedCelebration } from './PromoAppliedCelebration';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useDeliveryLocationStore } from '@/store/useDeliveryLocationStore';

// ─── Extracted UI components ────────────────────────────────
import { StepIndicator } from './StepIndicator';
import { CartReview } from './CartReview';
import { OrderReview } from './OrderReview';
import { SaveAddressModal } from './SaveAddressModal';
import { PromotionIssueModal } from './PromotionIssueModal';

// Persists across CartScreen mounts so we never replay the celebration for the same promo
const _celebrationShownPromoIds = new Set<string>();

type CheckoutLocation = SelectedAddress;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const CartScreen = () => {
    const router = useRouter();
    const apolloClient = useApolloClient();
    const theme = useTheme();
    const { t } = useTranslations();
    const { items, total, isEmpty } = useCart();
    const { updateQuantity, removeItem, clearCart, updateItemNotes } = useCartActions();
    const { createOrder, loading: orderLoading } = useCreateOrder();
    const { location: userContextLocation } = useUserLocation();
    const persistedDeliveryLocation = useDeliveryLocationStore((state) => state.location);
    const setDeliveryLocation = useDeliveryLocationStore((state) => state.setLocation);
    const { showLoading, showSuccess, hideSuccess } = useSuccessModalStore();
    const updateActiveOrder = useActiveOrdersStore((state) => state.updateOrder);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);
    const hasActiveOrders = useActiveOrdersStore((state) => state.hasActiveOrders);
    const activeOrderForNav = useActiveOrdersStore((state) => state.activeOrders[0] as any);

    const [isProcessing, setIsProcessing] = useState(false);
    const [deliveryPrice, setDeliveryPrice] = useState(2.0); // Default; updated from API
    const [deliveryPriceLoading, setDeliveryPriceLoading] = useState(false);
    const [deliveryZoneName, setDeliveryZoneName] = useState<string | null>(null);
    const [isSelectedLocationInZone, setIsSelectedLocationInZone] = useState<boolean | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedLocation, setSelectedLocation] = useState<CheckoutLocation | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [showSaveAddressPrompt, setShowSaveAddressPrompt] = useState(false);
    const [pendingLocationToSave, setPendingLocationToSave] = useState<CheckoutLocation | null>(null);
    const [addressName, setAddressName] = useState('');
    const [driverNotes, setDriverNotes] = useState('');
    const [isPriority, setIsPriority] = useState(false);
    const [driverTip, setDriverTip] = useState(0);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoIssueModal, setPromoIssueModal] = useState<{ title: string; message: string } | null>(null);
    const [saveAddressError, setSaveAddressError] = useState<string | null>(null);
    
    // Query saved addresses
    const { data: addressesData, loading: addressesLoading } = useQuery(GET_MY_ADDRESSES, {
        fetchPolicy: 'cache-and-network',
    });

    const { data: zonesData, loading: zonesLoading } = useQuery(GET_SERVICE_ZONES, {
        fetchPolicy: 'cache-and-network',
    });

    const effectiveServiceZones = useMemo(() => {
        const activeZones = ((zonesData as any)?.deliveryZones ?? []).filter((z: any) => z.isActive);
        const serviceZones = activeZones.filter((z: any) => z.isServiceZone === true);
        return serviceZones.length > 0 ? serviceZones : activeZones;
    }, [zonesData]);

    const isLocationWithinDeliveryZone = useCallback(
        (location: CheckoutLocation | null): boolean => {
            if (!location) return false;
            if (effectiveServiceZones.length === 0) return true;

            return effectiveServiceZones.some((zone: any) =>
                isPointInPolygon(
                    { lat: location.latitude, lng: location.longitude },
                    zone.polygon as Array<{ lat: number; lng: number }>,
                ),
            );
        },
        [effectiveServiceZones],
    );

    // Mutation for adding address
    const [addAddress, { loading: addingAddress }] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });

    const [setDefaultAddress] = useMutation(SET_DEFAULT_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });
    const [promoResult, setPromoResult] = useState<{
        promotionId: string | null;
        promotionIds: string[];
        code: string;
        promotionSummary: string | null;
        deliveryPromotionSummary: string | null;
        orderDiscountAmount: number;
        deliveryDiscountAmount: number;
        autoApplyReason?: string | null;
        selectionReason?: string | null;
        discountAmount: number;
        freeDeliveryApplied: boolean;
        effectiveDeliveryPrice: number;
        totalPrice: number;
        source: 'eligible' | 'manual';
    } | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const proceedButtonAnim = useRef(new Animated.Value(1)).current;
    const feeRequestSequenceRef = useRef(0);
    const headerTopPadding = Platform.OS === 'ios' ? 10 : 6;
    const insets = useSafeAreaInsets();
    const suppressAutoCloseRef = useRef(false);

    const pickerInitialLocation = useMemo<CheckoutLocation | null>(() => {
        if (userContextLocation) {
            return {
                latitude: userContextLocation.latitude,
                longitude: userContextLocation.longitude,
                address: userContextLocation.address,
                label: t.cart.use_current_address,
                isOverridden: false,
            };
        }
        return selectedLocation;
    }, [userContextLocation, selectedLocation, t.cart.use_current_address]);

    const formatCurrency = useCallback((value: number) => `€${value.toFixed(2)}`, []);

    const buildPromotionSummary = useCallback(
        (promotion?: { type?: string | null; discountValue?: number | null; appliedAmount?: number | null; freeDelivery?: boolean | null } | null) => {
            if (!promotion) return null;

            const type = promotion.type ?? '';
            const rawDiscountValue = Number(promotion.discountValue ?? promotion.appliedAmount ?? NaN);
            const hasDiscountValue = Number.isFinite(rawDiscountValue) && rawDiscountValue > 0;
            const normalizedValue = hasDiscountValue
                ? (Number.isInteger(rawDiscountValue) ? String(rawDiscountValue) : rawDiscountValue.toFixed(1).replace(/\.0$/, ''))
                : null;

            if (promotion.freeDelivery || type === 'FREE_DELIVERY' || type === 'SPEND_X_GET_FREE') {
                return t.cart.free_delivery;
            }

            if (type === 'PERCENTAGE' || type === 'SPEND_X_PERCENT') {
                const percentValue = Number(promotion.discountValue ?? NaN);
                const normalizedPercent = Number.isFinite(percentValue) && percentValue > 0
                    ? (Number.isInteger(percentValue) ? String(percentValue) : percentValue.toFixed(1).replace(/\.0$/, ''))
                    : null;
                return normalizedPercent
                    ? t.cart.promo_summary_percent_off.replace('{{percent}}', normalizedPercent)
                    : t.cart.promo_type_percentage;
            }

            if (type === 'FIXED_AMOUNT' || type === 'SPEND_X_FIXED') {
                return normalizedValue
                    ? t.cart.promo_summary_fixed_off.replace('{{amount}}', formatCurrency(rawDiscountValue))
                    : t.cart.promo_type_fixed;
            }

            return t.cart.promo_type_generic;
        },
        [formatCurrency, t],
    );

    const isFreeDeliveryPromotion = useCallback(
        (promotion?: { type?: string | null; freeDelivery?: boolean | null } | null) => {
            if (!promotion) return false;
            const type = promotion.type ?? '';
            return Boolean(promotion.freeDelivery) || type === 'FREE_DELIVERY' || type === 'SPEND_X_GET_FREE';
        },
        [],
    );

    // Repeat-or-customize modal state for complex cart items
    const [repeatModalProductId, setRepeatModalProductId] = useState<string | null>(null);
    const repeatModalCartItems = useMemo(
        () => (repeatModalProductId ? items.filter((i) => i.productId === repeatModalProductId) : []),
        [items, repeatModalProductId],
    );

    const [validatePromotionsManual, { loading: manualPromoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const [calculateDeliveryPriceFn] = useLazyQuery(CALCULATE_DELIVERY_PRICE, {
        fetchPolicy: 'cache-and-network',
    });

    // Backfill imageUrl for persisted cart items that were saved without it
    useEffect(() => {
        const itemsMissingImage = items.filter((item) => !item.imageUrl);
        if (itemsMissingImage.length === 0) return;

        itemsMissingImage.forEach(async (item) => {
            try {
                const response = await apolloClient.query({
                    query: GET_PRODUCT,
                    variables: { id: item.productId },
                    fetchPolicy: 'cache-first',
                });
                const imageUrl: string | null = (response.data as any)?.product?.imageUrl ?? null;
                if (imageUrl) {
                    useCartDataStore.setState((state) => ({
                        items: state.items.map((i) =>
                            i.cartItemId === item.cartItemId ? { ...i, imageUrl } : i
                        ),
                    }));
                }
            } catch {
                // best-effort; silently ignore
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stable array reference — only changes when the actual set of business IDs changes,
    // not when total or deliveryPrice change. Prevents cascading re-renders.
    const businessIdsKey = items.map((i) => i.businessId).sort().join(',');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const businessIds = useMemo(() => Array.from(new Set(items.map((item) => item.businessId))), [businessIdsKey]);

    const cartContext = useMemo(() => ({
        items: items.map((item) => ({
            productId: item.productId,
            businessId: item.businessId,
            quantity: item.quantity,
            price: item.unitPrice,
        })),
        subtotal: total,
        deliveryPrice,
        businessIds,
    }), [items, total, deliveryPrice, businessIds]);

    // Query server for promotion thresholds applicable to this cart (used for progress display)
    const { data: thresholdsData, error: thresholdsError, loading: thresholdsLoading } = useQuery(
        GET_PROMOTION_THRESHOLDS,
        {
            variables: { cart: cartContext },
            skip: items.length === 0,
            fetchPolicy: 'cache-and-network',
        },
    );

    const { data: applicablePromotionsData } = useQuery(GET_APPLICABLE_PROMOTIONS, {
        variables: { cart: cartContext },
        skip: items.length === 0,
        fetchPolicy: 'cache-and-network',
    });

    const applicableConditional = useMemo(() => {
        if (!thresholdsData?.getPromotionThresholds) return null;
        const thresholds = thresholdsData.getPromotionThresholds;
        if (thresholds.length === 0) return null;
        
        const matching = thresholds.filter((p) => {
            if (!p || !p.spendThreshold) return false;
            const ids = p.eligibleBusinessIds || [];
            if (ids.length === 0) return true; // global
            return businessIds.some((bId) => ids.includes(bId));
        });
        
        if (matching.length === 0) return null;
        matching.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return matching[0];
    }, [thresholdsData, businessIds]);

    const spendThreshold = applicableConditional?.spendThreshold;
    const progress = spendThreshold ? Math.min(Number(total) / Number(spendThreshold), 1) : 0;
    const amountRemaining = spendThreshold ? Math.max(0, Number(spendThreshold) - Number(total)) : 0;

    // Minimum order amount enforcement
    const { data: businessMinData } = useQuery(GET_BUSINESS_MINIMUM, {
        variables: { id: businessIds[0] },
        skip: !businessIds[0],
        fetchPolicy: 'cache-and-network',
    });
    const minOrderAmount = Number(businessMinData?.business?.minOrderAmount ?? 0);

    const { data: surchargeData } = useQuery(GET_PRIORITY_SURCHARGE_AMOUNT, {
        fetchPolicy: 'cache-and-network',
    });
    const serverPrioritySurcharge = Number(surchargeData?.prioritySurchargeAmount ?? 0);
    const minimumMet = minOrderAmount <= 0 || total >= minOrderAmount;
    const amountUntilMinimum = Math.max(0, minOrderAmount - total);

    const eligiblePromotions = useMemo(() => {
        const list = applicablePromotionsData?.getApplicablePromotions ?? [];
        return [...list].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }, [applicablePromotionsData]);
    const selectedEligiblePromotion = eligiblePromotions[0] ?? null;
    const hasEligiblePromotion = !!selectedEligiblePromotion;

    const getPromotionDisplayName = useCallback(
        (promotion?: { name?: string | null; type?: string | null; target?: string | null; code?: string | null } | null) => {
            if (!promotion) return '';

            const normalizeLabel = (value?: string | null) => {
                if (!value) return '';

                const cleaned = value
                    .replace(/^(\s*\[[^\]]+\]\s*)+/, '')
                    .replace(/^\s*(recovery|compensation)\s*[:\-]?\s*/i, '')
                    .replace(/[\-_]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!cleaned) return '';

                const isTechnicalToken = /^[A-Z0-9\-\s]+$/.test(cleaned) || /\d{2,}/.test(cleaned);
                if (!isTechnicalToken) return cleaned;

                return cleaned
                    .toLowerCase()
                    .split(' ')
                    .filter(Boolean)
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' ');
            };

            const type = promotion.type ?? '';
            const typeLabel =
                type === 'FREE_DELIVERY' || type === 'SPEND_X_GET_FREE'
                    ? t.cart.free_delivery
                    : type === 'PERCENTAGE' || type === 'SPEND_X_PERCENT'
                      ? t.cart.promo_type_percentage
                      : type === 'FIXED_AMOUNT' || type === 'SPEND_X_FIXED'
                        ? t.cart.promo_type_fixed
                        : t.cart.promo_type_generic;

            const rawName = promotion.name ?? '';
            const normalizedName = normalizeLabel(rawName);
            const normalizedCode = normalizeLabel(promotion.code);
            const isRecoveryPromo = /^\s*\[?\s*(recovery|compensation)\s*\]?/i.test(rawName);

            if (isRecoveryPromo) {
                if (type === 'FREE_DELIVERY' || type === 'SPEND_X_GET_FREE') {
                    return t.cart.compensation_promo_free_delivery;
                }
                if (type === 'PERCENTAGE' || type === 'SPEND_X_PERCENT') {
                    return t.cart.compensation_promo_percentage;
                }
                if (type === 'FIXED_AMOUNT' || type === 'SPEND_X_FIXED') {
                    return t.cart.compensation_promo_fixed;
                }

                return t.cart.compensation_promo_generic;
            }

            return normalizedName || normalizedCode || typeLabel;
        },
        [t],
    );

    // Celebration overlay state
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationMessage, setCelebrationMessage] = useState('');
    const [celebrationSavings, setCelebrationSavings] = useState('');
    // celebrationShownRef is module-level (_celebrationShownPromoIds) — see top of file

    // Notifier state/animation
    const [notifier, setNotifier] = useState<null | { type: 'progress' | 'success'; message: string }>(null);
    const notifierAnim = useRef(new Animated.Value(0)).current;
    const showNotifier = (msg: string, type: 'progress' | 'success' = 'progress') => {
        setNotifier({ type, message: msg });
        Animated.timing(notifierAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
        setTimeout(() => {
            Animated.timing(notifierAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setNotifier(null));
        }, type === 'success' ? 4000 : 2000);
    };

    // Auto-apply helpers
    const hadItemsOnMount = useRef(items.length > 0);
    // Keep a ref to the latest cartContext so the auto-apply effect doesn't need
    // cartContext / total / deliveryPrice in its deps (prevents waterfall re-runs).
    const cartContextRef = useRef(cartContext);
    useEffect(() => { cartContextRef.current = cartContext; }, [cartContext]);

    // Auto-close cart when all items are removed
    useEffect(() => {
        if (!suppressAutoCloseRef.current && hadItemsOnMount.current && items.length === 0) {
            router.back();
        }
    }, [items.length, router]);

    // Auto-apply the highest-priority eligible promotion.
    useEffect(() => {
        if (promoResult?.source === 'manual') {
            return;
        }

        if (!selectedEligiblePromotion) {
            if (promoResult?.source === 'eligible') {
                setPromoResult(null);
                setCouponCode('');
            }
            return;
        }
        if (promoResult?.promotionId === selectedEligiblePromotion.id) {
            return;
        }

        let mounted = true;
        const doAutoApply = async () => {
            // Use the ref so that a delivery-price update mid-flight doesn't re-trigger
            // this effect — cartContextRef always holds the latest values.
            const ctx = cartContextRef.current;
            const autoPromoLabel =
                (selectedEligiblePromotion.code ?? getPromotionDisplayName(selectedEligiblePromotion) ?? '').trim() ||
                t.cart.promo_applied_title;
            try {
                const response = await validatePromotionsManual({
                    variables: {
                        cart: ctx,
                        manualCode: selectedEligiblePromotion.code ?? undefined,
                    },
                });
                const result = (response?.data as any)?.validatePromotions;
                if (!result || (Array.isArray(result.promotions) && result.promotions.length === 0)) {
                    return;
                }
                const promotions = (result.promotions ?? []) as Array<{
                    type?: string | null;
                    discountValue?: number | null;
                    appliedAmount?: number | null;
                    freeDelivery?: boolean | null;
                }>;
                const uniqueSummary = (entries: Array<string | null>) =>
                    Array.from(new Set(entries.filter((entry): entry is string => Boolean(entry)))).join(' + ') || null;
                const nonDeliverySummary = uniqueSummary(
                    promotions
                        .filter((promotion) => !isFreeDeliveryPromotion(promotion))
                        .map((promotion) => buildPromotionSummary(promotion)),
                );
                const deliverySummary = uniqueSummary(
                    promotions
                        .filter((promotion) => isFreeDeliveryPromotion(promotion))
                        .map((promotion) => buildPromotionSummary(promotion)),
                ) ?? (result.freeDeliveryApplied ? t.cart.free_delivery : null);
                const effectiveDeliveryPrice = Number(result.finalDeliveryPrice ?? ctx.deliveryPrice);
                const totalPrice = Number(result.finalTotal ?? ctx.subtotal + ctx.deliveryPrice);
                const deliveryDiscountAmount = Math.max(0, ctx.deliveryPrice - effectiveDeliveryPrice);
                const totalDiscountAmount = Math.max(0, ctx.subtotal + ctx.deliveryPrice - totalPrice);
                const orderDiscountAmount = Math.max(0, totalDiscountAmount - deliveryDiscountAmount);
                const autoApplyReason =
                    typeof selectedEligiblePromotion.spendThreshold === 'number' && selectedEligiblePromotion.spendThreshold > 0
                        ? t.cart.auto_apply_reason_min_spend.replace(
                            '{{amount}}',
                            formatCurrency(Number(selectedEligiblePromotion.spendThreshold)),
                        )
                        : t.cart.auto_apply_reason_default;

                if (!mounted) return;

                setPromoResult({
                    promotionId: selectedEligiblePromotion.id,
                    promotionIds: (result.promotions ?? [])
                        .map((promo: any) => String(promo?.id ?? ''))
                        .filter(Boolean),
                    code: autoPromoLabel,
                    promotionSummary: nonDeliverySummary,
                    deliveryPromotionSummary: deliverySummary,
                    orderDiscountAmount,
                    deliveryDiscountAmount,
                    autoApplyReason,
                    selectionReason: null,
                    discountAmount: totalDiscountAmount,
                    freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                    effectiveDeliveryPrice,
                    totalPrice,
                    source: 'eligible',
                });
                const promoDisplayName = getPromotionDisplayName(selectedEligiblePromotion);
                showNotifier(
                    t.cart.promotion_applied_notifier.replace(
                        '{{name}}',
                        promoDisplayName ? `: ${promoDisplayName}` : '',
                    ),
                    'success',
                );
                // The PromotionProgressBar's inline confetti handles the celebration when
                // threshold is hit — no full-screen overlay needed here.
            } catch {
                // ignore - best effort
            }
        };

        doAutoApply();

        return () => {
            mounted = false;
        };
    }, [buildPromotionSummary, getPromotionDisplayName, isFreeDeliveryPromotion, selectedEligiblePromotion, promoResult?.promotionId, promoResult?.source, t]);

    // Get saved addresses sorted by priority (default first)
    const savedAddresses = useMemo(() => {
        return ((addressesData as any)?.myAddresses ?? []) as UserAddress[];
    }, [addressesData]);

    // Rehydrate checkout selection from persisted delivery location first.
    useEffect(() => {
        if (selectedLocation || !persistedDeliveryLocation) return;

        const matchedSaved = savedAddresses.find(
            (addr) =>
                Math.abs(addr.latitude - persistedDeliveryLocation.latitude) < 0.0001 &&
                Math.abs(addr.longitude - persistedDeliveryLocation.longitude) < 0.0001,
        );

        const locationFromStore: CheckoutLocation = {
            latitude: persistedDeliveryLocation.latitude,
            longitude: persistedDeliveryLocation.longitude,
            address:
                persistedDeliveryLocation.address ||
                `${persistedDeliveryLocation.latitude.toFixed(6)}, ${persistedDeliveryLocation.longitude.toFixed(6)}`,
            label: matchedSaved?.addressName ?? persistedDeliveryLocation.label,
            addressId: matchedSaved?.id,
            isOverridden: persistedDeliveryLocation.isOverridden ?? false,
        };

        if (!isLocationWithinDeliveryZone(locationFromStore)) {
            return;
        }

        setSelectedLocation(locationFromStore);
        void requestFeeForLocation(locationFromStore);
    }, [persistedDeliveryLocation, savedAddresses, selectedLocation, isLocationWithinDeliveryZone]);

    // Auto-select default address on load
    useEffect(() => {
        if (!selectedLocation && !persistedDeliveryLocation && savedAddresses.length > 0) {
            const defaultAddress = savedAddresses.find((addr) => addr.priority === 1) || savedAddresses[0];
            if (defaultAddress) {
                const location: CheckoutLocation = {
                    latitude: defaultAddress.latitude,
                    longitude: defaultAddress.longitude,
                    address: defaultAddress.displayName,
                    label: defaultAddress.addressName,
                    addressId: defaultAddress.id,
                    isOverridden: false,
                };
                if (!isLocationWithinDeliveryZone(location)) {
                    return;
                }
                setSelectedLocation(location);
                void requestFeeForLocation(location);
            }
        }
    }, [savedAddresses, selectedLocation, persistedDeliveryLocation, isLocationWithinDeliveryZone]);

    const requestFeeForLocation = async (next: CheckoutLocation): Promise<boolean | null> => {
        // Calculate delivery fee based on distance from business
        const businessIds = Array.from(new Set(items.map((item) => item.businessId)));
        if (businessIds.length === 0) return null;

        const requestId = ++feeRequestSequenceRef.current;
        const localInZone = isLocationWithinDeliveryZone(next);
        setDeliveryPriceLoading(true);
        setIsSelectedLocationInZone(null);
        try {
            // Use the first business to calculate distance
            const response = await calculateDeliveryPriceFn({
                variables: {
                    dropoffLat: next.latitude,
                    dropoffLng: next.longitude,
                    businessId: businessIds[0],
                },
            });
            const result = response?.data?.calculateDeliveryPrice;
            if (requestId !== feeRequestSequenceRef.current) {
                return null;
            }

            if (result?.price != null) {
                setDeliveryPrice(Number(result.price));
            }
            setDeliveryZoneName(result?.zoneApplied?.name ?? null);
            const hasZonesConfigured = effectiveServiceZones.length > 0;
            const serverInZone = hasZonesConfigured ? !!result?.zoneApplied : true;
            const inZone = hasZonesConfigured ? (localInZone || serverInZone) : true;
            setIsSelectedLocationInZone(inZone);
            return inZone;
        } catch {
            if (requestId !== feeRequestSequenceRef.current) {
                return null;
            }

            // Keep default price on error
            setDeliveryZoneName(null);
            setIsSelectedLocationInZone(localInZone);
            return localInZone;
        } finally {
            if (requestId === feeRequestSequenceRef.current) {
                setDeliveryPriceLoading(false);
            }
        }
    };

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.02,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ]),
        );

        animation.start();
        return () => animation.stop();
    }, [pulseAnim]);

    useEffect(() => {
        if (!selectedLocation) {
            proceedButtonAnim.setValue(1);
            return;
        }
        const breathingAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(proceedButtonAnim, {
                    toValue: 1.02,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(proceedButtonAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        );
        breathingAnimation.start();
        return () => breathingAnimation.stop();
    }, [selectedLocation, proceedButtonAnim]);

    // ─── Step navigation with layout animation ──────────────
    const goToStep = useCallback((s: 1 | 2 | 3) => {
        if (Platform.OS === 'android') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setStep(s);
    }, []);

    // Android back button: navigate between wizard steps
    useEffect(() => {
        const onBack = () => {
            if (step === 3) { goToStep(2); return true; }
            if (step === 2) { goToStep(1); return true; }
            return false; // default behavior (close screen)
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
        return () => sub.remove();
    }, [step, goToStep]);

    // ─── Address Picker Handler ─────────────────────────────
    const handleAddressSelected = async (next: CheckoutLocation) => {
        if (!isLocationWithinDeliveryZone(next)) {
            Alert.alert(
                t.home.out_of_zone.title,
                t.cart.outside_zone_selected,
            );
            setIsSelectedLocationInZone(false);
            return;
        }

        const overriddenLocation: CheckoutLocation = {
            ...next,
            isOverridden: true,
        };

        setSelectedLocation(overriddenLocation);
        setDeliveryLocation({
            latitude: overriddenLocation.latitude,
            longitude: overriddenLocation.longitude,
            address: overriddenLocation.address,
            label: overriddenLocation.label,
            isOverridden: true,
        });
        const inZoneFromPricing = await requestFeeForLocation(overriddenLocation);
        if (inZoneFromPricing === false) {
            Alert.alert(
                t.home.out_of_zone.title,
                t.cart.outside_zone_selected,
            );
            return;
        }

        // Only offer to save as default when user picks a new (unsaved) location AND
        // they don't already have a default address. If they already have a default,
        // just proceed to checkout without asking.
        const hasDefaultAddress = savedAddresses.some((addr) => addr.priority === 1);
        if (!overriddenLocation.addressId && !hasDefaultAddress) {
            setPendingLocationToSave(overriddenLocation);
            setAddressName('');
            setTimeout(() => setShowSaveAddressPrompt(true), 200);
        } else {
            goToStep(3);
        }
    };

    const handleSaveAsDefault = async () => {
        setSaveAddressError(null);
        
        if (!pendingLocationToSave || !addressName.trim()) {
            setSaveAddressError(t.cart.enter_address_name);
            return;
        }
        
        try {
            const result = await addAddress({
                variables: {
                    input: {
                        latitude: pendingLocationToSave.latitude,
                        longitude: pendingLocationToSave.longitude,
                        addressName: addressName.trim(),
                        displayName: pendingLocationToSave.address,
                    },
                },
            });
            
            const newAddressId = (result.data as any)?.addUserAddress?.id;
            if (newAddressId) {
                await setDefaultAddress({
                    variables: { id: newAddressId },
                });
            }
            
            setSaveAddressError(null);
            setShowSaveAddressPrompt(false);
            setPendingLocationToSave(null);
            setAddressName('');
            goToStep(3);
        } catch (error) {
            setSaveAddressError(error instanceof Error ? error.message : t.cart.failed_save_address);
            console.error('Error saving address:', error);
        }
    };

    const handleSkipSaving = () => {
        setSaveAddressError(null);
        setShowSaveAddressPrompt(false);
        setPendingLocationToSave(null);
        setAddressName('');
        goToStep(3);
    };

    // Clear eligible promo if it no longer applies
    useEffect(() => {
        if (!promoResult) return;

        if (promoResult.source === 'eligible' && !selectedEligiblePromotion) {
            setPromoResult(null);
        }
    }, [promoResult, selectedEligiblePromotion]);

    // Manual promo application handler (previous auto-validation removed)
    const handleApplyCoupon = async () => {
        setPromoError(null);
        
        if (!couponCode.trim()) {
            setPromoError(t.cart.enter_promo_code);
            return;
        }

        try {
            const response = await validatePromotionsManual({
                variables: {
                    cart: cartContext,
                    manualCode: couponCode,
                },
            });

            const result = (response?.data as any)?.validatePromotions;
            if (!result || (Array.isArray(result.promotions) && result.promotions.length === 0)) {
                setPromoError(t.cart.promo_not_valid);
                return;
            }
            const promotions = (result.promotions ?? []) as Array<{
                type?: string | null;
                discountValue?: number | null;
                appliedAmount?: number | null;
                freeDelivery?: boolean | null;
            }>;
            const uniqueSummary = (entries: Array<string | null>) =>
                Array.from(new Set(entries.filter((entry): entry is string => Boolean(entry)))).join(' + ') || null;
            const nonDeliverySummary = uniqueSummary(
                promotions
                    .filter((promotion) => !isFreeDeliveryPromotion(promotion))
                    .map((promotion) => buildPromotionSummary(promotion)),
            );
            const deliverySummary = uniqueSummary(
                promotions
                    .filter((promotion) => isFreeDeliveryPromotion(promotion))
                    .map((promotion) => buildPromotionSummary(promotion)),
            ) ?? (result.freeDeliveryApplied ? t.cart.free_delivery : null);
            const effectiveDeliveryPrice = Number(result.finalDeliveryPrice ?? deliveryPrice);
            const totalPrice = Number(result.finalTotal ?? total + deliveryPrice);
            const deliveryDiscountAmount = Math.max(0, deliveryPrice - effectiveDeliveryPrice);
            const totalDiscountAmount = Math.max(0, total + deliveryPrice - totalPrice);
            const orderDiscountAmount = Math.max(0, totalDiscountAmount - deliveryDiscountAmount);

            setPromoResult({
                promotionId: result.promotions?.[0]?.id ?? null,
                promotionIds: (result.promotions ?? [])
                    .map((promo: any) => String(promo?.id ?? ''))
                    .filter(Boolean),
                code: couponCode.trim(),
                promotionSummary: nonDeliverySummary,
                deliveryPromotionSummary: deliverySummary,
                orderDiscountAmount,
                deliveryDiscountAmount,
                autoApplyReason: null,
                selectionReason: null,
                discountAmount: totalDiscountAmount,
                freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                effectiveDeliveryPrice,
                totalPrice,
                source: 'manual',
            });
            showNotifier(
                t.cart.discount_added.replace('{{amount}}', Number(result.totalDiscount ?? 0).toFixed(2)),
                'success'
            );
            // Show full-screen celebration for manual coupon (once per code)
            const couponKey = `manual:${couponCode.trim().toUpperCase()}`;
            if (!_celebrationShownPromoIds.has(couponKey)) {
                _celebrationShownPromoIds.add(couponKey);
                const discount = Number(result.totalDiscount ?? 0);
                setCelebrationMessage(couponCode.trim());
                setCelebrationSavings(discount > 0 ? `-${formatCurrency(discount)}` : (result.freeDeliveryApplied ? t.cart.free_delivery : ''));
                setShowCelebration(true);
            }
        } catch (err) {
            setPromoError(t.cart.unable_validate_promo);
        }
    };

    useEffect(() => {
        if (items.length === 0) {
            setPromoResult(null);
            setCouponCode('');
        }
    }, [items.length]);

    // Clear promo if user empties the coupon code field
    useEffect(() => {
        // If user clears the input field, clear the applied promo
        if (promoResult?.source === 'manual' && !couponCode.trim()) {
            setPromoResult(null);
        }
        // Clear error when user starts typing
        if (promoError && couponCode.trim()) {
            setPromoError(null);
        }
    }, [couponCode]);

    const manualPromoApplied = !!promoResult;
    const freeDeliveryApplied = manualPromoApplied
        ? promoResult?.freeDeliveryApplied ?? false
        : false;

    const prioritySurcharge = isPriority ? serverPrioritySurcharge : 0;

    const effectiveDeliveryPrice = manualPromoApplied
        ? promoResult?.effectiveDeliveryPrice ?? deliveryPrice
        : deliveryPrice;

    const deliveryPromoDiscount = Math.max(0, deliveryPrice - effectiveDeliveryPrice);

    const promoTotalPrice = manualPromoApplied
        ? promoResult?.totalPrice ?? Math.max(0, total + deliveryPrice - (promoResult?.discountAmount ?? 0))
        : total + deliveryPrice;

    // Derive discount from validated totals to avoid mismatches when API's totalDiscount
    // excludes delivery discounts while finalDeliveryPrice already includes them.
    const totalPromoDiscount = manualPromoApplied
        ? Math.max(0, total + deliveryPrice - promoTotalPrice)
        : 0;

    const nonDeliveryPromoDiscount = Math.max(0, totalPromoDiscount - deliveryPromoDiscount);

    const appliedDeliveryPrice = effectiveDeliveryPrice + prioritySurcharge;

    const finalTotal = promoTotalPrice + prioritySurcharge + driverTip;

    /**
     * Re-fetches every product in the cart from the network and syncs unitPrice +
     * option extraPrice in the Zustand store.  Returns true if at least one price
     * changed (so the caller can decide whether to warn the user).
     */
    const refreshCartPrices = useCallback(async (): Promise<boolean> => {
        const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
        const freshPriceByProductId = new Map<string, number>();
        const freshOptionPriceById = new Map<string, number>();

        await Promise.all(
            uniqueProductIds.map(async (productId) => {
                try {
                    const response = await apolloClient.query({
                        query: GET_PRODUCT,
                        variables: { id: productId },
                        fetchPolicy: 'network-only',
                    });
                    const product = (response.data as any)?.product;
                    if (!product) return;
                    // effectivePrice includes markup / night-markup / sale
                    const freshPrice: number = Number(product.effectivePrice ?? product.price ?? 0);
                    freshPriceByProductId.set(productId, freshPrice);
                    // Collect fresh option prices
                    for (const og of product.optionGroups ?? []) {
                        for (const opt of og.options ?? []) {
                            freshOptionPriceById.set(String(opt.id), Number(opt.extraPrice ?? 0));
                        }
                    }
                } catch {
                    // best-effort — if a single product fails, leave its price as-is
                }
            }),
        );

        let anyChanged = false;
        useCartDataStore.setState((state) => {
            const nextItems = state.items.map((item) => {
                const freshUnitPrice = freshPriceByProductId.get(item.productId);
                const newUnitPrice = freshUnitPrice !== undefined ? freshUnitPrice : item.unitPrice;
                const priceChanged = freshUnitPrice !== undefined && Math.abs(newUnitPrice - item.unitPrice) > 0.001;
                if (priceChanged) anyChanged = true;

                const newOptions = item.selectedOptions.map((opt) => {
                    const freshExtra = freshOptionPriceById.get(opt.optionId);
                    if (freshExtra !== undefined && Math.abs(freshExtra - opt.extraPrice) > 0.001) {
                        anyChanged = true;
                        return { ...opt, extraPrice: freshExtra };
                    }
                    return opt;
                });

                if (!priceChanged && newOptions === item.selectedOptions) return item;
                return { ...item, unitPrice: newUnitPrice, selectedOptions: newOptions };
            });
            return { items: nextItems };
        });

        return anyChanged;
    }, [items, apolloClient]);

    const reconcileCartBeforeCheckout = useCallback(async () => {
        if (items.length === 0) {
            return false;
        }

        const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
        const unavailableProductIds = new Set<string>();
        let verificationFailed = false;

        await Promise.all(
            uniqueProductIds.map(async (productId) => {
                try {
                    const response = await apolloClient.query({
                        query: GET_PRODUCT,
                        variables: { id: productId },
                        fetchPolicy: 'network-only',
                    });

                    const product = (response.data as any)?.product;
                    if (!product || product.isAvailable === false) {
                        unavailableProductIds.add(productId);
                    }
                } catch {
                    verificationFailed = true;
                }
            }),
        );

        if (verificationFailed) {
            console.warn('[CartScreen] Product reconciliation partially failed; continuing with server validation');
            return true;
        }

        if (unavailableProductIds.size === 0) {
            return true;
        }

        unavailableProductIds.forEach((productId) => {
            removeItem(productId);
        });

        goToStep(1);
        Alert.alert(
            t.cart.order_failed,
            t.cart.items_unavailable_removed,
            [{ text: t.common.ok }],
        );

        return false;
    }, [items, apolloClient, removeItem, goToStep, t]);

    const syncActiveOrders = useCallback(
        async (createdOrderId?: string | null) => {
            const maxAttempts = createdOrderId ? 5 : 2;

            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                try {
                    const response = await apolloClient.query({
                        query: GET_ORDERS,
                        fetchPolicy: 'network-only',
                    });

                    const orders = (response.data as any)?.orders ?? [];
                    const activeOrders = (orders as any[]).filter(
                        (order) => order?.status !== 'DELIVERED' && order?.status !== 'CANCELLED',
                    );

                    setActiveOrders(activeOrders as any);

                    if (!createdOrderId) {
                        return;
                    }

                    const createdOrder = activeOrders.find((order) => String(order?.id) === String(createdOrderId));
                    if (createdOrder || attempt === maxAttempts - 1) {
                        return;
                    }
                } catch {
                    // Best-effort sync; try again on transient network/cache issues.
                }

                await new Promise((resolve) => setTimeout(resolve, 700));
            }
        },
        [apolloClient, setActiveOrders],
    );

    const handleCheckout = async () => {
        if (hasActiveOrders) {
            const activeOrderId = activeOrderForNav?.id ? String(activeOrderForNav.id) : null;
            Alert.alert(
                t.cart.active_order_exists_title,
                t.cart.active_order_exists_message,
                [
                    {
                        text: t.orders.details.view_order,
                        onPress: () => {
                            if (activeOrderId) {
                                router.push({ pathname: '/orders/[orderId]', params: { orderId: activeOrderId } } as never);
                            }
                        },
                    },
                    { text: t.common.ok, style: 'cancel' },
                ],
            );
            return;
        }

        if (!selectedLocation) {
            Alert.alert(t.cart.select_address, t.cart.select_address_alert);
            return;
        }

        const localZoneCheck = isLocationWithinDeliveryZone(selectedLocation);

        if (zonesLoading && !(zonesData as any)?.deliveryZones) {
            Alert.alert(t.home.out_of_zone.title, t.cart.delivery_zone_checking);
            return;
        }

        if (!localZoneCheck) {
            Alert.alert(
                t.home.out_of_zone.title,
                t.cart.outside_zone_selected,
            );
            return;
        }

        if (isSelectedLocationInZone === false) {
            // Recover from stale fee-check state when local polygon validation confirms in-zone.
            setIsSelectedLocationInZone(true);
        }

        const canContinue = await reconcileCartBeforeCheckout();
        if (!canContinue) {
            return;
        }

        setIsProcessing(true);
        showLoading('order_created');
        try {
            // Send delivery price after promo effects (for example free delivery),
            // but without priority surcharge (validated separately by API).
            const apiDeliveryPrice = effectiveDeliveryPrice;
            const order = await createOrder(
                selectedLocation,
                apiDeliveryPrice,
                finalTotal,
                promoResult?.promotionId ?? null,
                promoResult?.promotionIds ?? null,
                driverNotes,
                prioritySurcharge,
                userContextLocation,
                isPriority,
                driverTip,
            );
            const orderId = order?.id || null;
            
            console.log('[CartScreen] Order created:', orderId);

            suppressAutoCloseRef.current = true;
            
            // Clear cart and reset state
            clearCart();
            setShowSaveAddressPrompt(false);
            setStep(1);
            
            // Navigate to home while the loading modal still covers the screen so the
            // cart→home transition is invisible to the user.  The (tabs) screen is
            // configured with animation:'none' so this is instantaneous.  Once the
            // modal switches to its success phase the home screen is already rendered
            // behind it; when the modal finally dismisses (auto or user action) there
            // is no underlying-screen flash.
            if (orderId) {
                updateActiveOrder(order as any);

                router.replace('/(tabs)/home');

                console.log('[CartScreen] Showing success modal');
                showSuccess(orderId, 'order_created');
            } else {
                suppressAutoCloseRef.current = false;
                hideSuccess();
            }

            void syncActiveOrders(orderId ? String(orderId) : null);
        } catch (err) {
            console.error('[CartScreen] Order creation failed:', err);
            suppressAutoCloseRef.current = false;
            hideSuccess();
            void syncActiveOrders();

            const errorMessage = err instanceof Error ? err.message : '';
            const graphQLErrorMessage =
                typeof (err as any)?.graphQLErrors?.[0]?.message === 'string'
                    ? (err as any).graphQLErrors[0].message
                    : null;

            const combinedMessage = graphQLErrorMessage || errorMessage || '';
            const isPriceMismatch =
                combinedMessage.includes('price mismatch') ||
                combinedMessage.includes('Price mismatch') ||
                combinedMessage.includes('delivery price') ||
                combinedMessage.includes('total price');
            const lowerMessage = combinedMessage.toLowerCase();
            const isPromoInvalidation =
                lowerMessage.includes('selected promotions are no longer valid') ||
                lowerMessage.includes('selected promotion is no longer valid') ||
                lowerMessage.includes('promotion has expired') ||
                lowerMessage.includes('promotion has reached its usage limit') ||
                lowerMessage.includes('promotion is not available for you') ||
                lowerMessage.includes('promotion code not found') ||
                lowerMessage.includes('selected promotions cannot be combined') ||
                lowerMessage.includes('multiple free-delivery promotions cannot be combined');

            if (isPriceMismatch) {
                // Refresh cart prices silently, then alert the user to review
                try {
                    await refreshCartPrices();
                } catch {
                    // best-effort
                }
                goToStep(1);
                Alert.alert(
                    t.cart.prices_changed_title,
                    t.cart.prices_changed_message,
                    [{ text: t.common.ok }],
                );
                return;
            }

            if (isPromoInvalidation) {
                let promoModalMessage = t.cart.promotion_unavailable_generic;

                if (lowerMessage.includes('expired')) {
                    promoModalMessage = t.cart.promotion_unavailable_expired;
                } else if (lowerMessage.includes('usage limit')) {
                    promoModalMessage = t.cart.promotion_unavailable_usage_limit;
                } else if (lowerMessage.includes('not available for you')) {
                    promoModalMessage = t.cart.promotion_unavailable_not_assigned;
                } else if (lowerMessage.includes('cannot be combined') || lowerMessage.includes('multiple free-delivery')) {
                    promoModalMessage = t.cart.promotion_unavailable_not_combinable;
                }

                setPromoIssueModal({
                    title: t.cart.promotion_unavailable_title,
                    message: promoModalMessage,
                });
                return;
            }

            Alert.alert(
                t.cart.order_failed,
                graphQLErrorMessage || errorMessage || t.cart.unable_create_order,
                [{ text: t.common.ok }],
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (isEmpty && !suppressAutoCloseRef.current) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: headerTopPadding }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card }}>
                        <Ionicons name="close" size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>{t.cart.title}</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                    <View style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: theme.colors.primary + '08' }}>
                        <Ionicons name="bag-outline" size={42} color={theme.colors.primary + '80'} />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12, color: theme.colors.text }}>{t.cart.empty}</Text>
                    <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20, color: theme.colors.subtext }}>{t.cart.empty_subtitle}</Text>
                    <TouchableOpacity
                        style={{ marginTop: 28, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="restaurant-outline" size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t.cart.browse_menu}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* ─── Header ─────────────────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, paddingTop: headerTopPadding }}>
                <TouchableOpacity
                    onPress={() => {
                        if (step === 1) router.back();
                        else if (step === 2) goToStep(1);
                        else goToStep(2);
                    }}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name={step === 1 ? 'close' : 'arrow-back'} size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <StepIndicator currentStep={step} />
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* ─── STEP 1: Cart ───────────────────────── */}
            {step === 1 && (
                <CartReview
                    items={items}
                    total={total}
                    minimumMet={minimumMet}
                    minOrderAmount={minOrderAmount}
                    amountUntilMinimum={amountUntilMinimum}
                    applicableConditional={applicableConditional}
                    spendThreshold={spendThreshold}
                    progress={progress}
                    amountRemaining={amountRemaining}
                    promoResult={promoResult}
                    pulseAnim={pulseAnim}
                    formatCurrency={formatCurrency}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                    onUpdateNotes={updateItemNotes}
                    onIncrementComplex={(productId) => setRepeatModalProductId(productId)}
                    onProceed={() => {
                        if (!minimumMet) {
                            Alert.alert(
                                t.cart.minimum_order_label,
                                t.cart.minimum_not_met.replace('{amount}', formatCurrency(amountUntilMinimum)),
                            );
                            return;
                        }
                        goToStep(2);
                    }}
                />
            )}

            {/* ─── STEP 2: Address ────────────────────── */}
            {step === 2 && (
                <AddressPicker
                    embedded
                    visible={step === 2}
                    savedAddresses={savedAddresses}
                    initialLocation={pickerInitialLocation}
                    onSelect={handleAddressSelected}
                    onClose={() => goToStep(1)}
                />
            )}

            {/* ─── STEP 3: Order Review ──────────────── */}
            {step === 3 && selectedLocation && (
                <OrderReview
                    items={items}
                    selectedLocation={selectedLocation}
                    total={total}
                    originalDeliveryPrice={deliveryPrice}
                    effectiveDeliveryPrice={effectiveDeliveryPrice}
                    deliveryZoneName={deliveryZoneName}
                    deliveryPriceLoading={deliveryPriceLoading}
                    freeDeliveryApplied={freeDeliveryApplied}
                    isPriority={isPriority}
                    serverPrioritySurcharge={serverPrioritySurcharge}
                    prioritySurcharge={prioritySurcharge}
                    couponCode={couponCode}
                    promoResult={promoResult}
                    promoError={promoError}
                    manualPromoLoading={manualPromoLoading}
                    appliedDiscount={nonDeliveryPromoDiscount}
                    deliveryPromoDiscount={deliveryPromoDiscount}
                    finalTotal={finalTotal}
                    minimumMet={minimumMet}
                    minOrderAmount={minOrderAmount}
                    amountUntilMinimum={amountUntilMinimum}
                    isProcessing={isProcessing}
                    orderLoading={orderLoading}
                    isSelectedLocationInZone={isSelectedLocationInZone}
                    driverNotes={driverNotes}
                    formatCurrency={formatCurrency}
                    onChangeAddress={() => goToStep(2)}
                    onEditCart={() => goToStep(1)}
                    onSetPriority={setIsPriority}
                    onChangeCoupon={setCouponCode}
                    onApplyCoupon={handleApplyCoupon}
                    onChangeDriverNotes={setDriverNotes}
                    driverTip={driverTip}
                    onChangeTip={setDriverTip}
                    onCheckout={handleCheckout}
                />
            )}

            {/* ─── Modals & Overlays ─────────────────── */}
            <RepeatOrCustomizeModal
                visible={repeatModalProductId !== null}
                onClose={() => setRepeatModalProductId(null)}
                cartItems={repeatModalCartItems}
                onRepeat={(cartItem) => {
                    updateQuantity(cartItem.cartItemId, cartItem.quantity + 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setRepeatModalProductId(null);
                }}
                onCustomize={() => {
                    const pid = repeatModalProductId;
                    setRepeatModalProductId(null);
                    if (pid) {
                        router.push({
                            pathname: '/product/[productId]',
                            params: { productId: pid },
                        });
                    }
                }}
            />

            <SaveAddressModal
                visible={showSaveAddressPrompt}
                pendingLocation={pendingLocationToSave}
                addressName={addressName}
                onChangeAddressName={setAddressName}
                saving={addingAddress}
                error={saveAddressError}
                onSave={handleSaveAsDefault}
                onSkip={handleSkipSaving}
            />

            <PromotionIssueModal
                visible={!!promoIssueModal}
                title={promoIssueModal?.title ?? t.cart.promotion_unavailable_title}
                message={promoIssueModal?.message ?? ''}
                onClose={() => setPromoIssueModal(null)}
                onRemovePromotion={() => {
                    setPromoResult(null);
                    setCouponCode('');
                    setPromoError(null);
                    setPromoIssueModal(null);
                }}
            />

            <PromoAppliedCelebration
                visible={showCelebration}
                message={celebrationMessage}
                savingsText={celebrationSavings}
                onComplete={() => setShowCelebration(false)}
            />

            {/* Top-floating notifier */}
            {notifier && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: insets.top + 12,
                        left: 16,
                        right: 16,
                        zIndex: 9999,
                        elevation: 9999,
                        transform: [{ translateY: notifierAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
                        opacity: notifierAnim,
                        alignItems: 'center',
                    }}
                >
                    <View style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        backgroundColor: notifier.type === 'success' ? theme.colors.income : theme.colors.primary,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                    }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>{notifier.message}</Text>
                    </View>
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

