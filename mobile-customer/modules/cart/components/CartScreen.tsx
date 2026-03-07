import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, TextInput, Animated, Dimensions, Platform, BackHandler, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AddressPicker, { type SelectedAddress } from './AddressPicker';

import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useCart } from '../hooks/useCart';
import { useCartActions } from '../hooks/useCartActions';
import { useCreateOrder } from '../hooks/useCreateOrder';
import OrderConfirmDialog from '@/components/OrderConfirmDialog';
import OrderSuccessScreen from '@/components/OrderSuccessScreen';
import { useLazyQuery, useQuery, useMutation } from '@apollo/client/react';
import { VALIDATE_PROMOTIONS, GET_PROMOTION_THRESHOLDS } from '@/graphql/operations/promotions';
import { GET_MY_ADDRESSES, ADD_USER_ADDRESS, SET_DEFAULT_ADDRESS } from '@/graphql/operations/addresses';
import { CALCULATE_DELIVERY_PRICE } from '@/graphql/operations/deliveryPricing';
import type { UserAddress } from '@/gql/graphql';

type CheckoutLocation = SelectedAddress;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const CartScreen = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { items, total, isEmpty } = useCart();
    const { updateQuantity, removeItem, clearCart, updateItemNotes } = useCartActions();
    const { createOrder, loading: orderLoading } = useCreateOrder();

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
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [driverNotes, setDriverNotes] = useState('');
    
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

    const [validatePromotionsManual, { loading: manualPromoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS, {
        fetchPolicy: 'no-cache',
    });

    const [calculateDeliveryPriceFn] = useLazyQuery(CALCULATE_DELIVERY_PRICE, {
        fetchPolicy: 'no-cache',
    });

    const cartContext = useMemo(() => {
        const businessIds = Array.from(new Set(items.map((item) => item.businessId)));
        return {
            items: items.map((item) => ({
                productId: item.productId,
                businessId: item.businessId,
                quantity: item.quantity,
                price: item.price,
            })),
            subtotal: total,
            deliveryPrice,
            businessIds,
        };
    }, [items, total, deliveryPrice]);

    // Query server for promotion thresholds applicable to this cart (used for progress display)
    const { data: thresholdsData, error: thresholdsError, loading: thresholdsLoading } = useQuery(
        GET_PROMOTION_THRESHOLDS,
        {
            variables: { cart: cartContext },
            skip: items.length === 0,
            fetchPolicy: 'no-cache',
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
            return cartContext.businessIds.some((bId) => ids.includes(bId));
        });
        
        if (matching.length === 0) return null;
        matching.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return matching[0];
    }, [thresholdsData, cartContext.businessIds]);

    const spendThreshold = applicableConditional?.spendThreshold;
    const progress = spendThreshold ? Math.min(Number(total) / Number(spendThreshold), 1) : 0;
    const amountRemaining = spendThreshold ? Math.max(0, Number(spendThreshold) - Number(total)) : 0;

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
            try {
                const response = await validatePromotionsManual({ variables: { cart: cartContext } });
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
                    effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                    totalPrice: Number(result.finalTotal ?? total + deliveryPrice),
                });
                setCouponCode(promoCode); // Show the code in the input field
                autoAppliedPromotionIdRef.current = firstPromo?.id ?? applicableConditional.id;
                showNotifier(
                    `Promotion applied${firstPromo?.name ? `: ${firstPromo.name}` : ''}`,
                    'success',
                );
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
    }, [progress, applicableConditional, cartContext, total, deliveryPrice, promoResult]);

    // Get saved addresses sorted by priority (default first)
    const savedAddresses = useMemo(() => {
        return (addressesData?.myAddresses ?? []) as UserAddress[];
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

        // If this is a new location (not a saved address), ask if they want to save it
        if (!next.addressId) {
            setPendingLocationToSave(next);
            setAddressName('');
            setTimeout(() => setShowSaveAddressPrompt(true), 200);
        } else {
            goToStep(3);
        }
    };

    const handleSaveAsDefault = async () => {
        if (!pendingLocationToSave || !addressName.trim()) {
            Alert.alert(t.cart.address_name_required, t.cart.enter_address_name);
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
            
            const newAddressId = result.data?.addUserAddress?.id;
            if (newAddressId) {
                await setDefaultAddress({
                    variables: { id: newAddressId },
                });
            }
            
            setShowSaveAddressPrompt(false);
            setPendingLocationToSave(null);
            setAddressName('');
            goToStep(3);
        } catch (error) {
            Alert.alert(t.common.error, t.cart.failed_save_address);
            console.error('Error saving address:', error);
        }
    };

    const handleSkipSaving = () => {
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
        if (!couponCode.trim()) {
            Alert.alert(t.cart.enter_promo_code, t.cart.enter_promo_code);
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
                Alert.alert(t.cart.invalid_code, t.cart.promo_not_valid);
                return;
            }

            setPromoResult({
                code: couponCode.trim(),
                discountAmount: Number(result.totalDiscount ?? 0),
                freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                totalPrice: Number(result.finalTotal ?? total + deliveryPrice),
            });
            Alert.alert(t.cart.promo_applied_title, t.cart.discount_added.replace('{{amount}}', Number(result.totalDiscount ?? 0).toFixed(2)));
        } catch (err) {
            Alert.alert(t.cart.promo_error, t.cart.unable_validate_promo);
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
    }, [couponCode]);

    const manualPromoApplied = !!promoResult;
    const freeDeliveryApplied = manualPromoApplied
        ? promoResult?.freeDeliveryApplied ?? false
        : false;

    const appliedDiscount = manualPromoApplied
        ? promoResult?.discountAmount ?? 0
        : 0;

    const appliedDeliveryPrice = manualPromoApplied
        ? promoResult?.effectiveDeliveryPrice ?? deliveryPrice
        : deliveryPrice;

    const finalTotal = manualPromoApplied
        ? promoResult?.totalPrice ?? Math.max(0, total + deliveryPrice - appliedDiscount)
        : Math.max(0, total + deliveryPrice - appliedDiscount);

    const handleCheckout = async () => {
        if (!selectedLocation) {
            Alert.alert(t.cart.select_address, t.cart.select_address_alert);
            return;
        }

        setIsProcessing(true);
        try {
            await createOrder(selectedLocation, appliedDeliveryPrice, finalTotal, promoResult?.code, driverNotes);
            // Reset wizard & show success screen
            setShowSaveAddressPrompt(false);
            setShowConfirmDialog(false);
            setShowSuccessScreen(true);
            setStep(1);
            // Clear cart AFTER setting success screen so isEmpty doesn't flash first
            clearCart();
        } catch (err) {
            setShowConfirmDialog(false);
            Alert.alert(t.cart.order_failed, t.cart.unable_create_order, [{ text: t.common.ok }]);
        } finally {
            setIsProcessing(false);
        }
    };

    if (showSuccessScreen) {
        return (
            <Modal
                visible
                animationType="fade"
                onRequestClose={() => {
                    setShowSuccessScreen(false);
                    router.replace('/(tabs)/home');
                }}
            >
                <OrderSuccessScreen
                    onTrackOrder={() => {
                        setShowSuccessScreen(false);
                        router.replace('/orders/active');
                    }}
                    onGoHome={() => {
                        setShowSuccessScreen(false);
                        router.replace('/(tabs)/home');
                    }}
                />
            </Modal>
        );
    }

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
                    style={{ borderBottomColor: theme.colors.border }}
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
                    <Ionicons name="cart-outline" size={80} color={theme.colors.subtext} />
                    <Text className="text-xl font-semibold mt-4" style={{ color: theme.colors.text }}>
                        {t.cart.empty}
                    </Text>
                    <Text className="mt-2 text-center" style={{ color: theme.colors.subtext }}>
                        {t.cart.empty_subtitle}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>

            {/* ─── Top bar: back + stepper ──── */}
            <View className="flex-row items-center px-4 py-6">
                <TouchableOpacity
                    onPress={() => step === 1 ? router.back() : goToStep((step - 1) as 1 | 2)}
                    className="p-1 mr-2"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name={step === 1 ? 'close' : 'arrow-back'} size={22} color={theme.colors.text} />
                </TouchableOpacity>

                <View className="flex-1 flex-row items-center justify-center">
                {([
                    { s: 1 as const, icon: 'cart-outline' as const, iconDone: 'cart' as const, label: t.cart.title },
                    { s: 2 as const, icon: 'location-outline' as const, iconDone: 'location' as const, label: t.cart.step_address ?? 'Address' },
                    { s: 3 as const, icon: 'document-text-outline' as const, iconDone: 'document-text' as const, label: t.cart.step_review ?? 'Review' },
                ] as const).map(({ s, icon, iconDone, label }, idx) => {
                    const done = step > s;
                    const active = step === s;
                    const lineColor = done ? '#22C55E' : theme.colors.border;
                    const iconColor = done || active ? '#22C55E' : theme.colors.subtext;
                    return (
                        <React.Fragment key={s}>
                            {idx > 0 && (
                                <View className="flex-1 mx-0.5" style={{ height: 2, borderRadius: 1, backgroundColor: lineColor }} />
                            )}
                            <View className="items-center" style={{ width: 52 }}>
                                {done ? (
                                    <Ionicons name={iconDone} size={20} color="#22C55E" />
                                ) : (
                                    <Ionicons name={icon} size={20} color={iconColor} />
                                )}
                                <Text style={{
                                    fontSize: 10,
                                    marginTop: 3,
                                    color: done || active ? '#22C55E' : theme.colors.subtext,
                                    fontWeight: active ? '700' : done ? '600' : '400',
                                }}>
                                    {label}
                                </Text>
                            </View>
                        </React.Fragment>
                    );
                })}
                </View>
            </View>

            {/* ─── STEP 1: Cart ───────────────────────── */}
            {step === 1 && (
                <>
                    {/* Threshold progress indicator for conditional promotions */}
                    {applicableConditional && spendThreshold && progress > 0 && progress < 1 && !promoResult && (
                        <View className="px-4 py-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                    Spend €{spendThreshold.toFixed(2)} to unlock: {applicableConditional.name || 'promotion'}
                                </Text>
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    €{amountRemaining.toFixed(2)}
                                </Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: theme.colors.border, borderRadius: 8, overflow: 'hidden' }}>
                                <Animated.View style={{ height: 8, width: `${Math.round(progress * 100)}%`, backgroundColor: theme.colors.primary }} />
                            </View>
                        </View>
                    )}

                    {/* Cart Items */}
                    <ScrollView className="flex-1">
                        <View className="p-4 gap-3">
                            {items.map((item) => (
                                <View
                                    key={item.productId}
                                    className="rounded-xl p-4 flex-row items-center border"
                                    style={{
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.border,
                                    }}
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            source={{ uri: item.imageUrl }}
                                            className="w-20 h-20 rounded-lg"
                                            resizeMode="cover"
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
                                            €{item.price.toFixed(2)}
                                        </Text>

                                        {/* Quantity Controls */}
                                        <View className="flex-row items-center mt-2 gap-2">
                                            <TouchableOpacity
                                                onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                                                className="w-8 h-8 rounded-full items-center justify-center"
                                                style={{ backgroundColor: theme.colors.border }}
                                            >
                                                <Ionicons name="remove" size={16} color={theme.colors.text} />
                                            </TouchableOpacity>

                                            <Text className="text-base font-semibold px-3" style={{ color: theme.colors.text }}>
                                                {item.quantity}
                                            </Text>

                                            <TouchableOpacity
                                                onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                                                className="w-8 h-8 rounded-full items-center justify-center"
                                                style={{ backgroundColor: theme.colors.primary }}
                                            >
                                                <Ionicons name="add" size={16} color="white" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Item Notes Input */}
                                        <View className="mt-2">
                                            <TextInput
                                                value={item.notes || ''}
                                                onChangeText={(text) => updateItemNotes(item.productId, text)}
                                                placeholder={t.cart.item_notes_placeholder || "Add special instructions..."}
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
                                    <TouchableOpacity onPress={() => removeItem(item.productId)} className="ml-2 p-2">
                                        <Ionicons name="trash-outline" size={24} color={theme.colors.expense} />
                                    </TouchableOpacity>
                                </View>
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
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                                {t.common.subtotal}
                            </Text>
                            <Text className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                                €{total.toFixed(2)}
                            </Text>
                        </View>
                        <AnimatedTouchable
                            className="py-4 rounded-xl items-center flex-row justify-center gap-2"
                            style={{
                                backgroundColor: theme.colors.primary,
                                opacity: pulseAnim,
                            }}
                            activeOpacity={0.8}
                            onPress={() => goToStep(2)}
                        >
                            <Text className="text-white font-bold text-lg">{t.cart.choose_address}</Text>
                            <Ionicons name="arrow-forward" size={20} color="white" />
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

                        {/* Order Items (compact) */}
                        <View className="rounded-2xl border mb-4 overflow-hidden" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <Text className="text-xs uppercase font-semibold px-4 pt-3 pb-2" style={{ color: theme.colors.subtext }}>
                                {t.cart.title} ({items.length})
                            </Text>
                            {items.map((item, idx) => (
                                <View
                                    key={item.productId}
                                    className="flex-row items-center px-4 py-2.5"
                                    style={idx < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.colors.border } : undefined}
                                >
                                    <Text className="text-sm flex-1" numberOfLines={1} style={{ color: theme.colors.text }}>
                                        {item.name}
                                    </Text>
                                    <Text className="text-xs mx-2" style={{ color: theme.colors.subtext }}>
                                        ×{item.quantity}
                                    </Text>
                                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                        €{(item.price * item.quantity).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Price Breakdown */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.common.subtotal}</Text>
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>€{total.toFixed(2)}</Text>
                            </View>
                            <View className="flex-row justify-between items-center mb-2">
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.common.delivery}</Text>
                                    {deliveryZoneName && !freeDeliveryApplied && (
                                        <Text className="text-xs" style={{ color: theme.colors.primary }}>({deliveryZoneName})</Text>
                                    )}
                                </View>
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {deliveryPriceLoading ? '...' : freeDeliveryApplied ? t.common.free : `€${appliedDeliveryPrice.toFixed(2)}`}
                                </Text>
                            </View>
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
                                <Text className="text-xl font-bold" style={{ color: theme.colors.primary }}>€{finalTotal.toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* Promo Code */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <Text className="text-xs uppercase font-semibold mb-2" style={{ color: theme.colors.subtext }}>
                                {t.cart.promo_code}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                <TextInput
                                    value={couponCode}
                                    onChangeText={setCouponCode}
                                    placeholder={t.cart.enter_code}
                                    placeholderTextColor={theme.colors.subtext}
                                    className="flex-1 px-3 py-2 rounded-xl text-sm"
                                    style={{
                                        color: theme.colors.text,
                                        backgroundColor: theme.colors.background,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
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
                            {promoResult && (
                                <Text className="text-xs mt-2" style={{ color: theme.colors.income }}>
                                    {t.cart.promo_applied.replace('{{code}}', promoResult.code)}
                                </Text>
                            )}
                        </View>

                        {/* Driver Notes */}
                        <View className="rounded-2xl border p-4 mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <View className="flex-row items-center gap-2 mb-2">
                                <Ionicons name="chatbubble-outline" size={16} color={theme.colors.subtext} />
                                <Text className="text-xs uppercase font-semibold" style={{ color: theme.colors.subtext }}>
                                    {t.cart.driver_notes || "Notes for Driver"}
                                </Text>
                            </View>
                            <TextInput
                                value={driverNotes}
                                onChangeText={setDriverNotes}
                                placeholder={t.cart.driver_notes_placeholder || "e.g., Ring the doorbell twice"}
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
                        </View>

                        <View style={{ height: 16 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <TouchableOpacity
                            className="py-3.5 rounded-xl items-center"
                            style={{
                                backgroundColor: isProcessing ? theme.colors.border : theme.colors.primary,
                                opacity: isProcessing ? 0.6 : 1,
                            }}
                            activeOpacity={0.8}
                            onPress={() => setShowConfirmDialog(true)}
                            disabled={isProcessing}
                        >
                            {isProcessing || orderLoading ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color="white" />
                                    <Text className="text-white font-bold text-base">{t.cart.placing_order}</Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-white font-bold text-base">{t.cart.confirm_order}</Text>
                                    <Ionicons name="checkmark-circle" size={20} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Save Address Prompt Modal */}
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

            {/* Top-floating notifier (auto-apply success) - rendered last so it overlays everything */}
            {notifier && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 12,
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

            {/* Order Confirmation Dialog */}
            <OrderConfirmDialog
                visible={showConfirmDialog}
                total={finalTotal.toFixed(2)}
                loading={isProcessing || orderLoading}
                onConfirm={handleCheckout}
                onCancel={() => setShowConfirmDialog(false)}
            />

        </SafeAreaView>
    );
};

