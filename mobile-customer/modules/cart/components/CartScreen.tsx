import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Animated, Dimensions, Platform, BackHandler, LayoutAnimation, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
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
import { GET_ORDERS } from '@/graphql/operations/orders';
import { GET_PRODUCT } from '@/graphql/operations/products';
import { VALIDATE_PROMOTIONS, GET_PROMOTION_THRESHOLDS } from '@/graphql/operations/promotions';
import { GET_MY_ADDRESSES, ADD_USER_ADDRESS, SET_DEFAULT_ADDRESS } from '@/graphql/operations/addresses';
import { CALCULATE_DELIVERY_PRICE } from '@/graphql/operations/deliveryPricing';
import type { UserAddress } from '@/gql/graphql';
import { calculateItemUnitTotal } from '../utils/price';
import { RepeatOrCustomizeModal } from '@/modules/business/components/RepeatOrCustomizeModal';
import type { CartItem } from '../types';
import * as Haptics from 'expo-haptics';
import { PromotionProgressBar } from './PromotionProgressBar';
import { PromoAppliedCelebration } from './PromoAppliedCelebration';

// Persists across CartScreen mounts so we never replay the celebration for the same promo
const _celebrationShownPromoIds = new Set<string>();

type CheckoutLocation = SelectedAddress;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const PRIORITY_SURCHARGE = 1.50;

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
    const { showLoading, showSuccess, hideSuccess } = useSuccessModalStore();
    const updateActiveOrder = useActiveOrdersStore((state) => state.updateOrder);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);

    const [isProcessing, setIsProcessing] = useState(false);
    const [deliveryPrice, setDeliveryPrice] = useState(2.0); // Default; updated from API
    const [deliveryPriceLoading, setDeliveryPriceLoading] = useState(false);
    const [deliveryZoneName, setDeliveryZoneName] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedLocation, setSelectedLocation] = useState<CheckoutLocation | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [showSaveAddressPrompt, setShowSaveAddressPrompt] = useState(false);
    const [pendingLocationToSave, setPendingLocationToSave] = useState<CheckoutLocation | null>(null);
    const [addressName, setAddressName] = useState('');
    const [driverNotes, setDriverNotes] = useState('');
    const [isPriority, setIsPriority] = useState(false);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [saveAddressError, setSaveAddressError] = useState<string | null>(null);
    
    // Query saved addresses
    const { data: addressesData, loading: addressesLoading } = useQuery(GET_MY_ADDRESSES, {
        fetchPolicy: 'cache-and-network',
    });

    // Mutation for adding address
    const [addAddress, { loading: addingAddress }] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });

    const [setDefaultAddress] = useMutation(SET_DEFAULT_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });
    const [promoResult, setPromoResult] = useState<{
        code: string;
        discountAmount: number;
        freeDeliveryApplied: boolean;
        effectiveDeliveryPrice: number;
        totalPrice: number;
    } | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const proceedButtonAnim = useRef(new Animated.Value(1)).current;
    const screenWidth = Dimensions.get('window').width;
    const headerTopPadding = Platform.OS === 'ios' ? 10 : 6;
    const insets = useSafeAreaInsets();
    const suppressAutoCloseRef = useRef(false);

    const formatCurrency = useCallback((value: number) => `€${value.toFixed(2)}`, []);

    // Repeat-or-customize modal state for complex cart items
    const [repeatModalProductId, setRepeatModalProductId] = useState<string | null>(null);
    const repeatModalCartItems = useMemo(
        () => (repeatModalProductId ? items.filter((i) => i.productId === repeatModalProductId) : []),
        [items, repeatModalProductId],
    );

    const handleEditCartItem = useCallback(
        (item: (typeof items)[number]) => {
            router.push({
                pathname: '/product/[productId]',
                params: {
                    productId: item.productId,
                    cartItemId: item.cartItemId,
                },
            });
        },
        [router],
    );

    const [validatePromotionsManual, { loading: manualPromoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const [calculateDeliveryPriceFn] = useLazyQuery(CALCULATE_DELIVERY_PRICE, {
        fetchPolicy: 'cache-and-network',
    });

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
    const autoAppliedPromotionIdRef = useRef<string | null>(null);
    const [autoApplying, setAutoApplying] = useState(false);
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

    // When the cart reaches or exceeds a spend threshold, call the server to validate/apply promotions.
    useEffect(() => {
        if (!applicableConditional || !spendThreshold) {
            return;
        }
        if (progress < 1) {
            return;
        }
        if (promoResult) {
            return;
        }
        if (autoAppliedPromotionIdRef.current === applicableConditional.id) {
            return;
        }

        let mounted = true;
        const doAutoApply = async () => {
            setAutoApplying(true);
            // Use the ref so that a delivery-price update mid-flight doesn't re-trigger
            // this effect — cartContextRef always holds the latest values.
            const ctx = cartContextRef.current;
            try {
                const response = await validatePromotionsManual({ variables: { cart: ctx } });
                const result = (response?.data as any)?.validatePromotions;
                if (!result || (Array.isArray(result.promotions) && result.promotions.length === 0)) {
                    return;
                }

                if (!mounted) return;

                const firstPromo = Array.isArray(result.promotions) ? result.promotions[0] : null;
                const promoCode = firstPromo?.code ?? applicableConditional.code ?? '';
                setPromoResult({
                    code: promoCode,
                    discountAmount: Number(result.totalDiscount ?? 0),
                    freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                    effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? ctx.deliveryPrice),
                    totalPrice: Number(result.finalTotal ?? ctx.subtotal + ctx.deliveryPrice),
                });
                setCouponCode(promoCode); // Show the code in the input field
                autoAppliedPromotionIdRef.current = firstPromo?.id ?? applicableConditional.id;
                showNotifier(
                    t.cart.promotion_applied_notifier.replace(
                        '{{name}}',
                        firstPromo?.name ? `: ${firstPromo.name}` : '',
                    ),
                    'success',
                );
                // The PromotionProgressBar's inline confetti handles the celebration when
                // threshold is hit — no full-screen overlay needed here.
            } catch {
                // ignore - best effort
            } finally {
                if (mounted) setAutoApplying(false);
            }
        };

        doAutoApply();

        return () => {
            mounted = false;
        };
    }, [progress, applicableConditional, promoResult, t]);

    // Get saved addresses sorted by priority (default first)
    const savedAddresses = useMemo(() => {
        return ((addressesData as any)?.myAddresses ?? []) as UserAddress[];
    }, [addressesData]);

    // Auto-select default address on load
    useEffect(() => {
        if (!selectedLocation && savedAddresses.length > 0) {
            const defaultAddress = savedAddresses.find((addr) => addr.priority === 1) || savedAddresses[0];
            if (defaultAddress) {
                const location: CheckoutLocation = {
                    latitude: defaultAddress.latitude,
                    longitude: defaultAddress.longitude,
                    address: defaultAddress.displayName,
                    label: defaultAddress.addressName,
                    addressId: defaultAddress.id,
                };
                setSelectedLocation(location);
                requestFeeForLocation(location);
            }
        }
    }, [savedAddresses, selectedLocation]);

    const requestFeeForLocation = async (next: CheckoutLocation) => {
        // Calculate delivery fee based on distance from business
        const businessIds = Array.from(new Set(items.map((item) => item.businessId)));
        if (businessIds.length === 0) return;

        setDeliveryPriceLoading(true);
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
            if (result?.price != null) {
                setDeliveryPrice(Number(result.price));
            }
            setDeliveryZoneName(result?.zoneApplied?.name ?? null);
        } catch {
            // Keep default price on error
            setDeliveryZoneName(null);
        } finally {
            setDeliveryPriceLoading(false);
        }
    };

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.55,
                    duration: 850,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 850,
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
    const handleAddressSelected = (next: CheckoutLocation) => {
        setSelectedLocation(next);
        requestFeeForLocation(next);

        // Only offer to save as default when user picks a new (unsaved) location AND
        // they don't already have a default address. If they already have a default,
        // just proceed to checkout without asking.
        const hasDefaultAddress = savedAddresses.some((addr) => addr.priority === 1);
        if (!next.addressId && !hasDefaultAddress) {
            setPendingLocationToSave(next);
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

    // Clear promo if cart total drops below threshold for auto-applied promos
    useEffect(() => {
        if (!promoResult) return;
        
        // If this was an auto-applied promo and we're now below threshold, clear it
        if (autoAppliedPromotionIdRef.current && applicableConditional) {
            if (progress < 1) {
                setPromoResult(null);
                autoAppliedPromotionIdRef.current = null;
            }
        }
        // For manually applied promos, keep them even if total changes
    }, [total, deliveryPrice, progress, applicableConditional]);

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
                setPromoResult(null);
                setPromoError(t.cart.promo_not_valid);
                return;
            }

            setPromoResult({
                code: couponCode.trim(),
                discountAmount: Number(result.totalDiscount ?? 0),
                freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                totalPrice: Number(result.finalTotal ?? total + deliveryPrice),
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
            autoAppliedPromotionIdRef.current = null;
            setCouponCode('');
        }
    }, [items.length]);

    // Clear promo if user empties the coupon code field
    useEffect(() => {
        // If user clears the input field, clear the applied promo
        if (promoResult && !couponCode.trim()) {
            setPromoResult(null);
            autoAppliedPromotionIdRef.current = null;
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

    const appliedDiscount = manualPromoApplied
        ? promoResult?.discountAmount ?? 0
        : 0;

    const prioritySurcharge = isPriority ? PRIORITY_SURCHARGE : 0;

    const baseDeliveryPrice = manualPromoApplied
        ? promoResult?.effectiveDeliveryPrice ?? deliveryPrice
        : deliveryPrice;

    const appliedDeliveryPrice = baseDeliveryPrice + prioritySurcharge;

    const finalTotal = (manualPromoApplied
        ? promoResult?.totalPrice ?? Math.max(0, total + deliveryPrice - appliedDiscount)
        : Math.max(0, total + deliveryPrice - appliedDiscount)) + prioritySurcharge;

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
        if (!selectedLocation) {
            Alert.alert(t.cart.select_address, t.cart.select_address_alert);
            return;
        }

        const canContinue = await reconcileCartBeforeCheckout();
        if (!canContinue) {
            return;
        }

        setIsProcessing(true);
        showLoading('order_created');
        try {
            // Send the raw (pre-promo) base delivery price to the API.
            // The backend validates deliveryPrice against server-calculated zones/tiers
            // BEFORE applying any promotion discounts.  Priority surcharge is passed
            // separately via prioritySurcharge so the backend can fold it into the
            // stored deliveryPrice while keeping zone/tier validation intact.
            const apiDeliveryPrice = deliveryPrice;
            const order = await createOrder(selectedLocation, apiDeliveryPrice, finalTotal, promoResult?.code, driverNotes, prioritySurcharge);
            const orderId = order?.id || null;
            
            console.log('[CartScreen] Order created:', orderId);

            suppressAutoCloseRef.current = true;
            
            // Clear cart and reset state
            clearCart();
            setShowSaveAddressPrompt(false);
            setStep(1);
            
            // Keep current route and show success directly to avoid visible route flashes.
            if (orderId) {
                updateActiveOrder(order as any);
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

            Alert.alert(
                t.cart.order_failed,
                graphQLErrorMessage || errorMessage || t.cart.unable_create_order,
                [{ text: t.common.ok }],
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (isEmpty) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                {/* Swipe Handle */}
                <View className="items-center py-2">
                    <View className="w-12 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
                </View>

                {/* Header */}
                <View
                    className="flex-row items-center justify-between px-4 py-3 border-b"
                    style={{ borderBottomColor: theme.colors.border, paddingTop: headerTopPadding }}
                >
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <Ionicons name="close" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                        {t.cart.title}
                    </Text>
                    <View style={{ width: 28 }} />
                </View>

                {/* Empty State */}
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-28 h-28 rounded-full items-center justify-center mb-2" style={{ backgroundColor: theme.colors.primary + '10' }}>
                        <Ionicons name="bag-outline" size={56} color={theme.colors.primary} />
                    </View>
                    <Text className="text-xl font-bold mt-4" style={{ color: theme.colors.text }}>
                        {t.cart.empty}
                    </Text>
                    <Text className="mt-2 text-center text-sm" style={{ color: theme.colors.subtext }}>
                        {t.cart.empty_subtitle}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 px-6 py-3 rounded-xl flex-row items-center gap-2"
                        style={{ backgroundColor: theme.colors.primary }}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="restaurant-outline" size={18} color="white" />
                        <Text className="text-white font-semibold">{t.cart.browse_menu}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>

            {/* ─── Top header with back/close + stepper ──── */}
            <View className="flex-row items-center px-4 pb-2" style={{ paddingTop: headerTopPadding }}>
                <TouchableOpacity
                    onPress={() => {
                        if (step === 1) router.back();
                        else if (step === 2) goToStep(1);
                        else goToStep(2);
                    }}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.colors.card }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name={step === 1 ? 'close' : 'arrow-back'} size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View className="flex-1 flex-row items-center justify-center mx-2">
                {([
                    { s: 1 as const, icon: 'cart-outline' as const, iconDone: 'cart' as const, label: t.cart.title },
                    { s: 2 as const, icon: 'location-outline' as const, iconDone: 'location' as const, label: t.cart.step_address },
                    { s: 3 as const, icon: 'document-text-outline' as const, iconDone: 'document-text' as const, label: t.cart.step_review },
                ] as const).map(({ s, icon, iconDone, label }, idx) => {
                    const done = step > s;
                    const active = step === s;
                    const doneColor = theme.colors.income;
                    const activeColor = theme.colors.primary;
                    const lineColor = done ? doneColor : active ? activeColor : theme.colors.border;
                    const iconColor = done ? doneColor : active ? activeColor : theme.colors.subtext;
                    return (
                        <React.Fragment key={s}>
                            {idx > 0 && (
                                <View className="flex-1 mx-0.5" style={{ height: 2, borderRadius: 1, backgroundColor: lineColor }} />
                            )}
                            <View className="items-center" style={{ width: 52 }}>
                                {done ? (
                                    <Ionicons name={iconDone} size={20} color={doneColor} />
                                ) : (
                                    <Ionicons name={icon} size={20} color={iconColor} />
                                )}
                                <Text style={{
                                    fontSize: 10,
                                    marginTop: 3,
                                    color: done ? doneColor : active ? activeColor : theme.colors.subtext,
                                    fontWeight: active ? '700' : done ? '600' : '400',
                                }}>
                                    {label}
                                </Text>
                            </View>
                        </React.Fragment>
                    );
                })}
                </View>
                {/* Balance spacer equal width to back button */}
                <View style={{ width: 40 }} />
            </View>

            {/* ─── STEP 1: Cart ───────────────────────── */}
            {step === 1 && (
                <>
                    {/* Threshold progress indicator for conditional promotions */}
                    {applicableConditional && spendThreshold && progress > 0 && !promoResult && (
                        <PromotionProgressBar
                            progress={progress}
                            amountRemaining={amountRemaining}
                            spendThreshold={spendThreshold}
                            promoName={applicableConditional.name || t.cart.promotion_label}
                            isUnlocked={progress >= 1}
                            isApplied={false}
                            formatCurrency={formatCurrency}
                        />
                    )}

                    {/* Cart Items */}
                    <ScrollView className="flex-1">
                        <View className="p-4 gap-3">
                            <View
                                className="rounded-2xl overflow-hidden border"
                                style={{
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.border,
                                }}
                            >
                                <View style={{ height: 3, backgroundColor: theme.colors.primary }} />
                                <View className="p-4">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-2">
                                            <View
                                                className="px-2.5 py-1 rounded-full"
                                                style={{ backgroundColor: theme.colors.primary + '18' }}
                                            >
                                                <Text className="text-xs font-bold" style={{ color: theme.colors.primary }}>
                                                    {items.length} {items.length === 1 ? t.common.item : t.common.items}
                                                </Text>
                                            </View>
                                            <Text className="text-sm font-medium" style={{ color: theme.colors.subtext }}>
                                                {t.cart.order_summary}
                                            </Text>
                                        </View>
                                        <Text className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                                            {formatCurrency(total)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item.cartItemId}
                                    className="rounded-xl p-4 flex-row items-center border"
                                    activeOpacity={0.9}
                                    onPress={() => handleEditCartItem(item)}
                                    style={{
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.border,
                                    }}
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            source={{ uri: item.imageUrl }}
                                            className="w-20 h-20 rounded-lg"
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={200}
                                        />
                                    ) : (
                                        <View
                                            className="w-20 h-20 rounded-lg items-center justify-center"
                                            style={{ backgroundColor: theme.colors.border }}
                                        >
                                            <Ionicons name="image-outline" size={32} color={theme.colors.subtext} />
                                        </View>
                                    )}

                                    <View className="flex-1 ml-4">
                                        <Text
                                            className="text-base font-semibold"
                                            style={{ color: theme.colors.text }}
                                            numberOfLines={2}
                                        >
                                            {item.name}
                                        </Text>
                                        <Text className="font-bold mt-1" style={{ color: theme.colors.primary }}>
                                            {formatCurrency(calculateItemUnitTotal(item))}
                                        </Text>
                                        {item.quantity > 1 && (
                                            <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                                {item.quantity} × {formatCurrency(calculateItemUnitTotal(item))} = {formatCurrency(calculateItemUnitTotal(item) * item.quantity)}
                                            </Text>
                                        )}

                                        {item.selectedOptions.length > 0 && (
                                            <View className="mt-1">
                                                {item.selectedOptions.map((opt) => (
                                                    <Text key={`${item.cartItemId}-${opt.optionId}`} className="text-xs" style={{ color: theme.colors.subtext }}>
                                                        {opt.name}
                                                        {opt.extraPrice > 0 ? ` (+€${Number(opt.extraPrice).toFixed(2)})` : ''}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}

                                        {item.childItems && item.childItems.length > 0 && (
                                            <View className="mt-1">
                                                {item.childItems.map((child) => (
                                                    <Text key={`${item.cartItemId}-${child.productId}`} className="text-xs" style={{ color: theme.colors.subtext }}>
                                                        + {child.name}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}

                                        {/* Quantity Controls */}
                                        <View className="flex-row items-center mt-2 gap-2">
                                            <View
                                                className="flex-row items-center rounded-full px-1 py-1"
                                                style={{ backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }}
                                            >
                                                <TouchableOpacity
                                                    onPress={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                                    className="w-8 h-8 rounded-full items-center justify-center"
                                                    style={{ backgroundColor: theme.colors.border }}
                                                >
                                                    <Ionicons name="remove" size={16} color={theme.colors.text} />
                                                </TouchableOpacity>

                                                <Text className="text-base font-semibold px-3" style={{ color: theme.colors.text }}>
                                                    {item.quantity}
                                                </Text>

                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const isComplex = item.selectedOptions.length > 0 || item.childItems?.length;
                                                        if (isComplex) {
                                                            setRepeatModalProductId(item.productId);
                                                        } else {
                                                            updateQuantity(item.cartItemId, item.quantity + 1);
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-full items-center justify-center"
                                                    style={{ backgroundColor: theme.colors.primary }}
                                                >
                                                    <Ionicons name="add" size={16} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Item Notes Input */}
                                        <View className="mt-2">
                                            <TextInput
                                                value={item.notes || ''}
                                                onChangeText={(text) => updateItemNotes(item.cartItemId, text)}
                                                placeholder={t.cart.item_notes_placeholder}
                                                placeholderTextColor={theme.colors.subtext}
                                                className="text-xs px-2 py-1.5 rounded-lg border"
                                                style={{
                                                    backgroundColor: theme.colors.background,
                                                    borderColor: theme.colors.border,
                                                    color: theme.colors.text,
                                                }}
                                                multiline
                                                numberOfLines={2}
                                                maxLength={200}
                                            />
                                        </View>
                                    </View>

                                    {/* Remove Button */}
                                    <TouchableOpacity onPress={() => removeItem(item.cartItemId)} className="ml-2 p-2">
                                        <Ionicons name="trash-outline" size={24} color={theme.colors.expense} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer with Total and Continue */}
                    <View
                        className="border-t p-4"
                        style={{
                            borderTopColor: theme.colors.border,
                            backgroundColor: theme.colors.card,
                        }}
                    >
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                {t.common.subtotal}
                            </Text>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                                {formatCurrency(total)}
                            </Text>
                        </View>
                        <AnimatedTouchable
                            className="py-4 rounded-2xl items-center flex-row justify-center gap-2"
                            style={{
                                backgroundColor: theme.colors.primary,
                                opacity: pulseAnim,
                            }}
                            activeOpacity={0.8}
                            onPress={() => goToStep(2)}
                        >
                            <Ionicons name="location-outline" size={20} color="white" />
                            <Text className="text-white font-bold text-lg">{t.cart.choose_address}</Text>
                            <Ionicons name="arrow-forward" size={18} color="white" />
                        </AnimatedTouchable>
                    </View>
                </>
            )}

            {/* ─── STEP 2: Address ────────────────────── */}
            {step === 2 && (
                <AddressPicker
                    embedded
                    visible={step === 2}
                    savedAddresses={savedAddresses}
                    initialLocation={selectedLocation}
                    onSelect={handleAddressSelected}
                    onClose={() => goToStep(1)}
                />
            )}

            {/* ─── STEP 3: Order Summary ─────────────── */}
            {step === 3 && (
                <>
                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                        {/* Delivery Address */}
                        {selectedLocation && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => goToStep(2)}
                                className="rounded-2xl p-4 mb-4 border"
                                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-xs uppercase font-semibold" style={{ color: theme.colors.subtext }}>
                                        {t.cart.deliver_to}
                                    </Text>
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="pencil" size={12} color={theme.colors.primary} />
                                        <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                                            {t.cart.change_address}
                                        </Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-3">
                                    <View
                                        className="w-10 h-10 rounded-xl items-center justify-center"
                                        style={{ backgroundColor: theme.colors.primary + '15' }}
                                    >
                                        <Ionicons name="location" size={20} color={theme.colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                            {selectedLocation.label ?? t.cart.selected_address}
                                        </Text>
                                        <Text className="text-sm mt-0.5" numberOfLines={2} style={{ color: theme.colors.subtext }}>
                                            {selectedLocation.address}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Delivery Speed */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row items-center gap-2 mb-3">
                                <Ionicons name="timer-outline" size={16} color={theme.colors.subtext} />
                                <Text className="text-xs uppercase font-semibold" style={{ color: theme.colors.subtext }}>
                                    {t.cart.delivery_type}
                                </Text>
                            </View>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    className="flex-1 rounded-xl p-3"
                                    style={{
                                        backgroundColor: !isPriority ? theme.colors.primary + '12' : theme.colors.background,
                                        borderWidth: 1.5,
                                        borderColor: !isPriority ? theme.colors.primary : theme.colors.border,
                                    }}
                                    onPress={() => setIsPriority(false)}
                                >
                                    <View className="flex-row items-center gap-2 mb-1.5">
                                        <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: !isPriority ? theme.colors.primary + '20' : theme.colors.border }}>
                                            <Ionicons name="time-outline" size={14} color={!isPriority ? theme.colors.primary : theme.colors.subtext} />
                                        </View>
                                        <Text className="text-sm font-bold" style={{ color: !isPriority ? theme.colors.primary : theme.colors.text }}>
                                            {t.cart.standard_delivery}
                                        </Text>
                                    </View>
                                    <Text className="text-xs mb-1" style={{ color: theme.colors.subtext }}>
                                        {t.cart.estimated_time_standard}
                                    </Text>
                                    <Text className="text-xs font-semibold" style={{ color: !isPriority ? theme.colors.primary : theme.colors.subtext }}>
                                        {t.cart.included}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    className="flex-1 rounded-xl p-3"
                                    style={{
                                        backgroundColor: isPriority ? theme.colors.primary + '12' : theme.colors.background,
                                        borderWidth: 1.5,
                                        borderColor: isPriority ? theme.colors.primary : theme.colors.border,
                                    }}
                                    onPress={() => { setIsPriority(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                >
                                    <View className="flex-row items-center gap-2 mb-1.5">
                                        <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: isPriority ? theme.colors.primary + '20' : theme.colors.border }}>
                                            <Ionicons name="flash" size={14} color={isPriority ? theme.colors.primary : theme.colors.subtext} />
                                        </View>
                                        <Text className="text-sm font-bold" style={{ color: isPriority ? theme.colors.primary : theme.colors.text }}>
                                            {t.cart.priority_delivery}
                                        </Text>
                                    </View>
                                    <Text className="text-xs mb-1" style={{ color: theme.colors.subtext }}>
                                        {t.cart.estimated_time_priority}
                                    </Text>
                                    <Text className="text-xs font-semibold" style={{ color: isPriority ? theme.colors.primary : theme.colors.subtext }}>
                                        +{formatCurrency(PRIORITY_SURCHARGE)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Order Items */}
                        <View className="rounded-2xl border mb-4 overflow-hidden" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
                                <Text className="text-xs uppercase font-semibold" style={{ color: theme.colors.subtext }}>
                                    {t.cart.your_items} ({items.length})
                                </Text>
                                <TouchableOpacity onPress={() => goToStep(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                                        {t.cart.edit_cart}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {items.map((item, idx) => (
                                <View
                                    key={item.cartItemId}
                                    className="flex-row items-center px-4 py-2.5"
                                    style={idx < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.colors.border } : undefined}
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            source={{ uri: item.imageUrl }}
                                            className="w-10 h-10 rounded-lg mr-3"
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View
                                            className="w-10 h-10 rounded-lg mr-3 items-center justify-center"
                                            style={{ backgroundColor: theme.colors.border }}
                                        >
                                            <Ionicons name="fast-food-outline" size={16} color={theme.colors.subtext} />
                                        </View>
                                    )}
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium" numberOfLines={1} style={{ color: theme.colors.text }}>
                                            {item.name}
                                        </Text>
                                        {item.selectedOptions.length > 0 && (
                                            <Text className="text-xs" numberOfLines={1} style={{ color: theme.colors.subtext }}>
                                                {item.selectedOptions.map((opt) => opt.name).join(', ')}
                                            </Text>
                                        )}
                                    </View>
                                    <View className="items-end ml-2">
                                        <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                            {formatCurrency(calculateItemUnitTotal(item) * item.quantity)}
                                        </Text>
                                        {item.quantity > 1 && (
                                            <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                                ×{item.quantity}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Price Breakdown */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.common.subtotal}</Text>
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>{formatCurrency(total)}</Text>
                            </View>
                            <View className="flex-row justify-between items-center mb-2">
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.common.delivery}</Text>
                                    {deliveryZoneName && !freeDeliveryApplied && (
                                        <Text className="text-xs" style={{ color: theme.colors.primary }}>({deliveryZoneName})</Text>
                                    )}
                                </View>
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {deliveryPriceLoading ? '...' : freeDeliveryApplied ? t.common.free : formatCurrency(baseDeliveryPrice)}
                                </Text>
                            </View>
                            {isPriority && (
                                <View className="flex-row justify-between items-center mb-2">
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="flash" size={12} color={theme.colors.primary} />
                                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.cart.priority_fee}</Text>
                                    </View>
                                    <Text className="text-sm font-semibold" style={{ color: theme.colors.primary }}>
                                        +{formatCurrency(PRIORITY_SURCHARGE)}
                                    </Text>
                                </View>
                            )}
                            {(appliedDiscount > 0 || freeDeliveryApplied) && (
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.cart.promo}</Text>
                                    <Text className="text-sm font-semibold" style={{ color: theme.colors.income }}>
                                        {freeDeliveryApplied && appliedDiscount === 0 ? t.cart.free_delivery : `-€${appliedDiscount.toFixed(2)}`}
                                    </Text>
                                </View>
                            )}
                            <View className="h-px my-2" style={{ backgroundColor: theme.colors.border }} />
                            <View className="flex-row justify-between items-center">
                                <Text className="text-base font-bold" style={{ color: theme.colors.text }}>{t.common.total}</Text>
                                <Text className="text-xl font-bold" style={{ color: theme.colors.primary }}>{formatCurrency(finalTotal)}</Text>
                            </View>
                        </View>

                        {/* Promo Code */}
                        <View
                            className="rounded-2xl border p-4 mb-4"
                            style={{
                                borderColor: promoResult ? theme.colors.income + '55' : theme.colors.border,
                                backgroundColor: theme.colors.card,
                            }}
                        >
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <Ionicons
                                        name="pricetag-outline"
                                        size={14}
                                        color={promoResult ? theme.colors.income : theme.colors.subtext}
                                    />
                                    <Text
                                        className="text-xs uppercase font-semibold"
                                        style={{ color: promoResult ? theme.colors.income : theme.colors.subtext }}
                                    >
                                        {t.cart.promo_code}
                                    </Text>
                                </View>
                                {promoResult && (
                                    <View
                                        className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: theme.colors.income + '20' }}
                                    >
                                        <Ionicons name="checkmark-circle" size={11} color={theme.colors.income} />
                                        <Text className="text-xs font-bold" style={{ color: theme.colors.income }}>{t.cart.promo_applied_title}</Text>
                                    </View>
                                )}
                            </View>

                            {promoResult ? (
                                /* Applied state: pill tag with code + savings + remove */
                                <View
                                    className="flex-row items-center justify-between px-3 py-2.5 rounded-xl"
                                    style={{
                                        backgroundColor: theme.colors.income + '15',
                                        borderWidth: 1,
                                        borderColor: theme.colors.income + '40',
                                    }}
                                >
                                    <View className="flex-row items-center gap-2">
                                        <View
                                            className="px-2 py-0.5 rounded"
                                            style={{ backgroundColor: theme.colors.income + '28' }}
                                        >
                                            <Text
                                                className="text-xs font-bold tracking-widest"
                                                style={{ color: theme.colors.income }}
                                            >
                                                {promoResult.code.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text className="text-sm font-semibold" style={{ color: theme.colors.income }}>
                                            {promoResult.freeDeliveryApplied && promoResult.discountAmount === 0
                                                ? t.cart.free_delivery
                                                : `-${formatCurrency(promoResult.discountAmount)}`}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setCouponCode('')}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={18} color={theme.colors.subtext} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                /* Input state */
                                <View className="flex-row items-center gap-2">
                                    <TextInput
                                        value={couponCode}
                                        onChangeText={setCouponCode}
                                        placeholder={t.cart.enter_code}
                                        placeholderTextColor={theme.colors.subtext}
                                        className="flex-1 px-3 py-2 rounded-xl text-sm"
                                        autoCapitalize="characters"
                                        style={{
                                            color: theme.colors.text,
                                            backgroundColor: theme.colors.background,
                                            borderWidth: 1,
                                            borderColor: promoError ? theme.colors.expense + '80' : theme.colors.border,
                                        }}
                                    />
                                    <TouchableOpacity
                                        className="px-4 py-2 rounded-xl"
                                        style={{
                                            backgroundColor: manualPromoLoading ? theme.colors.border : theme.colors.primary,
                                            opacity: manualPromoLoading ? 0.7 : 1,
                                        }}
                                        onPress={handleApplyCoupon}
                                        disabled={manualPromoLoading}
                                    >
                                        {manualPromoLoading ? (
                                            <ActivityIndicator size="small" color={theme.colors.text} />
                                        ) : (
                                            <Text className="text-white font-semibold">{t.common.apply}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {promoError && (
                                <View className="flex-row items-center gap-1 mt-2">
                                    <Ionicons name="alert-circle" size={14} color={theme.colors.expense} />
                                    <Text className="text-xs flex-1" style={{ color: theme.colors.expense }}>
                                        {promoError}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Driver Notes */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row items-center gap-2 mb-2">
                                <Ionicons name="chatbubble-outline" size={16} color={theme.colors.subtext} />
                                <Text className="text-xs uppercase font-semibold" style={{ color: theme.colors.subtext }}>
                                    {t.cart.driver_notes}
                                </Text>
                            </View>
                            <TextInput
                                value={driverNotes}
                                onChangeText={setDriverNotes}
                                placeholder={t.cart.driver_notes_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                className="px-3 py-2 rounded-xl text-sm"
                                style={{
                                    backgroundColor: theme.colors.background,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                }}
                                multiline
                                numberOfLines={3}
                                maxLength={300}
                            />
                            {driverNotes.length > 0 && (
                                <Text className="text-xs mt-1 text-right" style={{ color: theme.colors.subtext }}>
                                    {driverNotes.length}/300
                                </Text>
                            )}
                        </View>

                        {/* Payment Method */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row items-center gap-2 mb-2">
                                <Ionicons name="wallet-outline" size={16} color={theme.colors.subtext} />
                                <Text className="text-xs uppercase font-semibold" style={{ color: theme.colors.subtext }}>
                                    {t.cart.payment_method}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }}>
                                <View
                                    className="w-9 h-9 rounded-xl items-center justify-center"
                                    style={{ backgroundColor: theme.colors.income + '15' }}
                                >
                                    <Ionicons name="cash-outline" size={18} color={theme.colors.income} />
                                </View>
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {t.cart.cash_on_delivery}
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 16 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-4 pt-3 pb-4 border-t" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.common.total}</Text>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.primary }}>{formatCurrency(finalTotal)}</Text>
                        </View>
                        <TouchableOpacity
                            className="py-4 rounded-2xl items-center"
                            style={{
                                backgroundColor: isProcessing ? theme.colors.border : theme.colors.primary,
                                opacity: isProcessing ? 0.6 : 1,
                            }}
                            activeOpacity={0.8}
                            onPress={handleCheckout}
                            disabled={isProcessing}
                        >
                            {isProcessing || orderLoading ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color="white" />
                                    <Text className="text-white font-bold text-base">{t.cart.placing_order}</Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="shield-checkmark" size={20} color="white" />
                                    <Text className="text-white font-bold text-lg">{t.cart.confirm_order}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Save Address Prompt Modal */}
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
            <Modal visible={showSaveAddressPrompt} transparent animationType="fade" onRequestClose={handleSkipSaving}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 60 : 100}
                    tint={theme.dark ? 'dark' : 'light'}
                    experimentalBlurMethod="dimezisBlurView"
                    className="flex-1 justify-center items-center px-5"
                >
                    <View
                        className="w-full rounded-3xl overflow-hidden"
                        style={{
                            backgroundColor: theme.colors.card,
                            shadowColor: theme.colors.primary,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.15,
                            shadowRadius: 24,
                            elevation: 12,
                        }}
                    >
                        {/* Header accent bar */}
                        <View style={{ height: 3, backgroundColor: theme.colors.primary }} />

                        <View className="p-6">
                            {/* Top row: title + dismiss */}
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                    {t.cart.save_address_title}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.6}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    onPress={handleSkipSaving}
                                    disabled={addingAddress}
                                >
                                    <Ionicons name="close" size={22} color={theme.colors.subtext} />
                                </TouchableOpacity>
                            </View>

                            {/* Address preview — what you're saving */}
                            {pendingLocationToSave && (
                                <View
                                    className="rounded-2xl p-3 mb-5 flex-row items-center"
                                    style={{ backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }}
                                >
                                    <View
                                        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                                        style={{ backgroundColor: theme.colors.primary + '15' }}
                                    >
                                        <Ionicons name="location" size={18} color={theme.colors.primary} />
                                    </View>
                                    <Text className="flex-1 text-sm leading-5" numberOfLines={2} style={{ color: theme.colors.subtext }}>
                                        {pendingLocationToSave.address}
                                    </Text>
                                </View>
                            )}

                            {/* Label section header */}
                            <Text className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: theme.colors.subtext }}>
                                {t.cart.quick_select}
                            </Text>

                            {/* Home / Work / Custom — single row of chips */}
                            <View className="flex-row gap-2 mb-4">
                                {([
                                    { key: 'Home', icon: 'home', label: t.cart.home },
                                    { key: 'Work', icon: 'briefcase', label: t.cart.work },
                                ] as const).map(({ key, icon, label }) => {
                                    const active = addressName === key;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            activeOpacity={0.7}
                                            className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
                                            style={{
                                                backgroundColor: active ? theme.colors.primary : theme.colors.background,
                                                borderWidth: 1.5,
                                                borderColor: active ? theme.colors.primary : theme.colors.border,
                                            }}
                                            onPress={() => setAddressName(key)}
                                        >
                                            <Ionicons
                                                name={active ? icon : `${icon}-outline` as any}
                                                size={16}
                                                color={active ? '#fff' : theme.colors.subtext}
                                            />
                                            <Text
                                                className="text-sm font-semibold"
                                                style={{ color: active ? '#fff' : theme.colors.subtext }}
                                            >
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Custom name input */}
                            <TextInput
                                className="rounded-xl px-4 py-3 mb-5 text-sm"
                                style={{
                                    backgroundColor: theme.colors.background,
                                    borderWidth: 1.5,
                                    borderColor: addressName && addressName !== 'Home' && addressName !== 'Work' ? theme.colors.primary : theme.colors.border,
                                    color: theme.colors.text,
                                }}
                                placeholder={t.cart.custom_name_placeholder}
                                placeholderTextColor={theme.colors.subtext + '80'}
                                value={addressName !== 'Home' && addressName !== 'Work' ? addressName : ''}
                                onChangeText={setAddressName}
                                onFocus={() => {
                                    if (addressName === 'Home' || addressName === 'Work') {
                                        setAddressName('');
                                    }
                                }}
                            />

                            {/* Error message */}
                            {saveAddressError && (
                                <View className="flex-row items-start gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.colors.expense + '10', borderWidth: 1, borderColor: theme.colors.expense + '30' }}>
                                    <Ionicons name="alert-circle" size={16} color={theme.colors.expense} style={{ marginTop: 1 }} />
                                    <Text className="text-xs flex-1" style={{ color: theme.colors.expense, lineHeight: 18 }}>
                                        {saveAddressError}
                                    </Text>
                                </View>
                            )}

                            {/* Action buttons */}
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    className="flex-1 py-3.5 rounded-xl items-center"
                                    style={{ backgroundColor: theme.colors.background, borderWidth: 1.5, borderColor: theme.colors.border }}
                                    onPress={handleSkipSaving}
                                    disabled={addingAddress}
                                >
                                    <Text className="font-semibold text-sm" style={{ color: theme.colors.subtext }}>
                                        {t.cart.skip_save}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    className="flex-1 py-3.5 rounded-xl items-center"
                                    style={{
                                        backgroundColor: addressName.trim() ? theme.colors.primary : theme.colors.border,
                                        opacity: addressName.trim() ? 1 : 0.4,
                                    }}
                                    onPress={handleSaveAsDefault}
                                    disabled={addingAddress || !addressName.trim()}
                                >
                                    {addingAddress ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-sm">{t.cart.save_as_default}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </BlurView>
            </Modal>

            {/* Promo celebration overlay */}
            <PromoAppliedCelebration
                visible={showCelebration}
                message={celebrationMessage}
                savingsText={celebrationSavings}
                onComplete={() => setShowCelebration(false)}
            />

            {/* Top-floating notifier (auto-apply success) - rendered last so it overlays everything */}
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
                    <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: notifier.type === 'success' ? theme.colors.income : theme.colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>{notifier.message}</Text>
                    </View>
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

