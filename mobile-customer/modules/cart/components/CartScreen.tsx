import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, TextInput, Animated, ImageBackground, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';

import { useTheme } from '@/hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { useCartActions } from '../hooks/useCartActions';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useLazyQuery, useQuery, useMutation } from '@apollo/client/react';
import { VALIDATE_PROMOTIONS, GET_PROMOTION_THRESHOLDS } from '@/graphql/operations/promotions';
import { GET_MY_ADDRESSES, ADD_USER_ADDRESS, SET_DEFAULT_ADDRESS } from '@/graphql/operations/addresses';
import { CALCULATE_DELIVERY_PRICE } from '@/graphql/operations/deliveryPricing';
import type { UserAddress } from '@/gql/graphql';

type CheckoutLocation = {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
    addressId?: number; // Track if this is a saved address
};

const formatAddress = (item: Location.LocationGeocodedAddress | null) => {
    if (!item) return '';
    const parts = [item.street, item.name, item.city, item.region, item.postalCode, item.country].filter(Boolean);
    return parts.join(', ');
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Minimalistic map style
const minimalistMapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "administrative.neighborhood",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#dadada" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "road.local",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "transit",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#c9c9c9" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text",
        "stylers": [{ "visibility": "off" }]
    }
];

export const CartScreen = () => {
    const router = useRouter();
    const theme = useTheme();
    const { items, total, isEmpty } = useCart();
    const { updateQuantity, removeItem } = useCartActions();
    const { createOrder, loading: orderLoading } = useCreateOrder();

    const [isProcessing, setIsProcessing] = useState(false);
    const [deliveryPrice, setDeliveryPrice] = useState(2.0); // Default; updated from API
    const [deliveryPriceLoading, setDeliveryPriceLoading] = useState(false);
    const [deliveryZoneName, setDeliveryZoneName] = useState<string | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<CheckoutLocation | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [showSaveAddressPrompt, setShowSaveAddressPrompt] = useState(false);
    const [pendingLocationToSave, setPendingLocationToSave] = useState<CheckoutLocation | null>(null);
    const [addressName, setAddressName] = useState('');
    
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
    const [mapRegion, setMapRegion] = useState<Region>({
        latitude: 42.4629,
        longitude: 21.4694,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    });
    const [mapMarker, setMapMarker] = useState<{ latitude: number; longitude: number } | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const proceedButtonAnim = useRef(new Animated.Value(1)).current;
    const screenWidth = Dimensions.get('window').width;
    const summarySlideX = useRef(new Animated.Value(screenWidth)).current;
    const mapSlideX = useRef(new Animated.Value(screenWidth)).current;
    const addressSlideX = useRef(new Animated.Value(screenWidth)).current;

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

    useEffect(() => {
        if (!isSummaryModalOpen) return;
        summarySlideX.setValue(screenWidth);
        Animated.timing(summarySlideX, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
        }).start();
    }, [isSummaryModalOpen, screenWidth, summarySlideX]);

    useEffect(() => {
        if (!isMapModalOpen) return;
        mapSlideX.setValue(screenWidth);
        Animated.timing(mapSlideX, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
        }).start();
    }, [isMapModalOpen, screenWidth, mapSlideX]);

    useEffect(() => {
        if (!isAddressModalOpen) return;
        addressSlideX.setValue(screenWidth);
        Animated.timing(addressSlideX, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
        }).start();
    }, [isAddressModalOpen, screenWidth, addressSlideX]);

    const closeSummaryModal = () => {
        Animated.timing(summarySlideX, {
            toValue: screenWidth,
            duration: 220,
            useNativeDriver: true,
        }).start(() => setIsSummaryModalOpen(false));
    };

    const closeMapModal = () => {
        Animated.timing(mapSlideX, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setIsMapModalOpen(false));
    };

    const closeAddressModal = () => {
        Animated.timing(addressSlideX, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setIsAddressModalOpen(false));
    };

    const handleMapPress = async (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        // Reverse geocode to get address and reuse the central select handler
        try {
            const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
            const address = formatAddress(result ?? null);
            const location = {
                latitude,
                longitude,
                address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                label: 'Map location',
            };
            handleSelectLocation(location);
        } catch (error) {
            const location = {
                latitude,
                longitude,
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                label: 'Map location',
            };
            handleSelectLocation(location);
        }
    };

    const handleSelectLocation = (next: CheckoutLocation) => {
        setSelectedLocation(next);
        requestFeeForLocation(next);
        // Update map marker and center map on selected location
        setMapMarker({ latitude: next.latitude, longitude: next.longitude });
        setMapRegion({
            latitude: next.latitude,
            longitude: next.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        });
        // Close any open modals and open summary so user can confirm the address
        if (isAddressModalOpen) closeAddressModal();
        if (isMapModalOpen) closeMapModal();
        
        // If this is a map-selected location (not a saved address), ask if they want to save it
        if (!next.addressId) {
            setPendingLocationToSave(next);
            setAddressName(''); // Reset address name
            setTimeout(() => setShowSaveAddressPrompt(true), 300);
        } else {
            setTimeout(() => setIsSummaryModalOpen(true), 260);
        }
    };

    const handleSelectSavedAddress = (address: UserAddress) => {
        const location: CheckoutLocation = {
            latitude: address.latitude,
            longitude: address.longitude,
            address: address.displayName,
            label: address.addressName,
            addressId: address.id,
        };
        handleSelectLocation(location);
    };

    const handleChooseOnMap = () => {
        closeAddressModal();
        setTimeout(() => setIsMapModalOpen(true), 260);
    };

    const handleSaveAsDefault = async () => {
        if (!pendingLocationToSave || !addressName.trim()) {
            Alert.alert('Address Name Required', 'Please enter a name for this address.');
            return;
        }
        
        try {
            // First add the address
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
            
            // Then set it as default
            const newAddressId = result.data?.addUserAddress?.id;
            if (newAddressId) {
                await setDefaultAddress({
                    variables: { id: newAddressId },
                });
            }
            
            setShowSaveAddressPrompt(false);
            setPendingLocationToSave(null);
            setAddressName('');
            setTimeout(() => setIsSummaryModalOpen(true), 260);
        } catch (error) {
            Alert.alert('Error', 'Failed to save address. Please try again.');
            console.error('Error saving address:', error);
        }
    };

    const handleSkipSaving = () => {
        setShowSaveAddressPrompt(false);
        setPendingLocationToSave(null);
        setAddressName('');
        setTimeout(() => setIsSummaryModalOpen(true), 260);
    };

    const handleChooseAddress = () => {
        // If no saved addresses, go directly to map
        if (savedAddresses.length === 0) {
            setIsMapModalOpen(true);
        } else {
            setIsAddressModalOpen(true);
        }
    };

    const handleUseCurrentLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Location Required', 'Please enable location services to use your current address.');
            return;
        }

        let current: Location.LocationObject | null = null;
        try {
            current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
        } catch {
            current = await Location.getLastKnownPositionAsync();
        }

        if (!current) {
            Alert.alert('Location Required', 'Unable to fetch your current location.');
            return;
        }

        let address = `${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}`;
        try {
            const [reverse] = await Location.reverseGeocodeAsync({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
            });
            const formatted = formatAddress(reverse ?? null);
            address = formatted || address;
        } catch {
            // Keep coordinate fallback.
        }

        // Update map marker and center map on current location
        setMapMarker({ latitude: current.coords.latitude, longitude: current.coords.longitude });
        setMapRegion({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        });

        handleSelectLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            address,
            label: 'Current location',
        });
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
            Alert.alert('Enter Code', 'Please enter a promo code.');
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
                Alert.alert('Invalid Code', 'Promotion not valid.');
                return;
            }

            setPromoResult({
                code: couponCode.trim(),
                discountAmount: Number(result.totalDiscount ?? 0),
                freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                totalPrice: Number(result.finalTotal ?? total + deliveryPrice),
            });
            Alert.alert('Promo Applied', `Discount €${Number(result.totalDiscount ?? 0).toFixed(2)} added.`);
        } catch (err) {
            Alert.alert('Promo Error', 'Unable to validate promo code.');
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
            Alert.alert('Select Address', 'Please choose a delivery address to continue.');
            return;
        }

        setIsProcessing(true);
        try {
            await createOrder(selectedLocation, appliedDeliveryPrice, finalTotal, promoResult?.code);
            // Navigation happens in the hook
        } catch (err) {
            Alert.alert('Order Failed', 'Unable to create order. Please try again.', [{ text: 'OK' }]);
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
                    style={{ borderBottomColor: theme.colors.border }}
                >
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <Ionicons name="close" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                        Cart
                    </Text>
                    <View style={{ width: 28 }} />
                </View>

                {/* Empty State */}
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="cart-outline" size={80} color={theme.colors.subtext} />
                    <Text className="text-xl font-semibold mt-4" style={{ color: theme.colors.text }}>
                        Your cart is empty
                    </Text>
                    <Text className="mt-2 text-center" style={{ color: theme.colors.subtext }}>
                        Add items to get started
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Swipe Handle */}
            <View className="items-center py-2">
                <View className="w-12 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
            </View>

            {/* (notifier rendered at end to ensure it's above other content) */}

            {/* Header */}
            <View
                className="flex-row items-center justify-between px-4 py-3 border-b"
                style={{ borderBottomColor: theme.colors.border }}
            >
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="close" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    Cart ({items.length})
                </Text>
                <View style={{ width: 28 }} />
            </View>

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
                            </View>

                            {/* Remove Button */}
                            <TouchableOpacity onPress={() => removeItem(item.productId)} className="ml-2 p-2">
                                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Footer with Total and Checkout */}
            <View
                className="border-t p-4"
                style={{
                    borderTopColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                }}
            >
                {/* Price Breakdown */}
                <View className="gap-2 mb-3">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-base" style={{ color: theme.colors.subtext }}>
                            Subtotal
                        </Text>
                        <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                            €{total.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View className="h-px mb-3" style={{ backgroundColor: theme.colors.border }} />

                {/* Total */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                        Total
                    </Text>
                    <Text className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                        €{total.toFixed(2)}
                    </Text>
                </View>
                {/* Checkout Button */}
                <AnimatedTouchable
                    className="py-4 rounded-xl items-center"
                    style={{
                        backgroundColor: isProcessing ? theme.colors.border : theme.colors.primary,
                        opacity: isProcessing ? 0.6 : pulseAnim,
                    }}
                    activeOpacity={0.8}
                    onPress={handleChooseAddress}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <View className="flex-row items-center gap-2">
                            <ActivityIndicator size="small" color="white" />
                            <Text className="text-white font-bold text-lg">Processing...</Text>
                        </View>
                    ) : (
                        <Text className="text-white font-bold text-lg">Choose address</Text>
                    )}
                </AnimatedTouchable>
            </View>

            {/* Address Selection Modal */}
            <Modal visible={isAddressModalOpen} animationType="none" onRequestClose={closeAddressModal}>
                <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: addressSlideX }] }}>
                        <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                            <TouchableOpacity onPress={closeAddressModal} className="p-2 -ml-2">
                                <Ionicons name="close" size={26} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                Select address
                            </Text>
                            <View style={{ width: 26 }} />
                        </View>

                        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                            {addressesLoading ? (
                                <View className="py-8">
                                    <ActivityIndicator size="large" color={theme.colors.primary} />
                                </View>
                            ) : savedAddresses.length > 0 ? (
                                <View className="gap-3">
                                    {savedAddresses.map((address) => {
                                        const isSelected = selectedLocation?.addressId === address.id;
                                        const isDefault = address.priority === 1;
                                        
                                        // Select icon based on address name
                                        let iconName: any = 'location';
                                        if (address.addressName.toLowerCase().includes('home')) {
                                            iconName = 'home';
                                        } else if (address.addressName.toLowerCase().includes('work') || address.addressName.toLowerCase().includes('office')) {
                                            iconName = 'briefcase';
                                        }

                                        return (
                                            <TouchableOpacity
                                                key={address.id}
                                                onPress={() => handleSelectSavedAddress(address)}
                                                className="rounded-xl p-4 border-2"
                                                style={{
                                                    backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.card,
                                                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                                }}
                                            >
                                                <View className="flex-row items-start justify-between">
                                                    <View className="flex-row items-start flex-1">
                                                        <View
                                                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                                            style={{ backgroundColor: theme.colors.primary + '20' }}
                                                        >
                                                            <Ionicons
                                                                name={iconName}
                                                                size={20}
                                                                color={theme.colors.primary}
                                                            />
                                                        </View>
                                                        <View className="flex-1">
                                                            <View className="flex-row items-center gap-2">
                                                                <Text
                                                                    className="text-base font-semibold"
                                                                    style={{ color: theme.colors.text }}
                                                                >
                                                                    {address.addressName}
                                                                </Text>
                                                                {isDefault && (
                                                                    <View
                                                                        className="px-2 py-0.5 rounded"
                                                                        style={{ backgroundColor: theme.colors.primary + '20' }}
                                                                    >
                                                                        <Text
                                                                            className="text-xs font-semibold"
                                                                            style={{ color: theme.colors.primary }}
                                                                        >
                                                                            Default
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text
                                                                className="text-sm mt-1"
                                                                style={{ color: theme.colors.subtext }}
                                                            >
                                                                {address.displayName}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {isSelected && (
                                                        <Ionicons
                                                            name="checkmark-circle"
                                                            size={24}
                                                            color={theme.colors.primary}
                                                        />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View className="py-12 items-center">
                                    <View
                                        className="w-20 h-20 rounded-full items-center justify-center mb-4"
                                        style={{ backgroundColor: theme.colors.border }}
                                    >
                                        <Ionicons name="location-outline" size={40} color={theme.colors.subtext} />
                                    </View>
                                    <Text className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                                        No saved addresses
                                    </Text>
                                    <Text className="text-center" style={{ color: theme.colors.subtext }}>
                                        Add addresses from your profile for quick checkout
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View className="p-4 border-t gap-2" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center flex-row justify-center gap-2"
                                style={{ backgroundColor: theme.colors.primary }}
                                onPress={handleChooseOnMap}
                            >
                                <Ionicons name="map-outline" size={20} color="white" />
                                <Text className="text-white font-semibold">Choose on map</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={closeAddressModal}
                            >
                                <Text className="font-semibold" style={{ color: theme.colors.text }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </Modal>

            {/* Map Picker Modal */}
            <Modal visible={isMapModalOpen} animationType="none" onRequestClose={closeMapModal}>
                <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                    <Animated.View style={{ flex: 1, transform: [{ translateX: mapSlideX }] }}>
                        <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                            <TouchableOpacity onPress={closeMapModal} className="p-2 -ml-2">
                                <Ionicons name="close" size={26} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                Select on map
                            </Text>
                            <View style={{ width: 26 }} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <MapView
                                style={{ flex: 1 }}
                                initialRegion={mapRegion}
                                region={mapRegion}
                                onPress={handleMapPress}
                                customMapStyle={minimalistMapStyle as any}
                            >
                                {mapMarker && (
                                    <Marker coordinate={{ latitude: mapMarker.latitude, longitude: mapMarker.longitude }} />
                                )}
                            </MapView>
                        </View>

                        <View className="p-4 border-t" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center mb-2"
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    opacity: 1,
                                }}
                                onPress={handleUseCurrentLocation}
                            >
                                <Text className="text-white font-semibold">Use my current address</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center"
                                style={{
                                    backgroundColor: theme.colors.border,
                                    opacity: 1,
                                }}
                                onPress={closeMapModal}
                            >
                                <Text className="font-semibold" style={{ color: theme.colors.text }}>
                                    Back
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </Modal>

            {/* Summary Modal */}
            <Modal visible={isSummaryModalOpen} transparent animationType="none" onRequestClose={closeSummaryModal}>
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}>
                    <Animated.View
                        style={{
                            transform: [{ translateX: summarySlideX }],
                            backgroundColor: theme.colors.card,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            maxHeight: '85%',
                        }}
                    >
                        <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                            <TouchableOpacity onPress={closeSummaryModal} className="p-2 -ml-2">
                                <Ionicons name="close" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                Order summary
                            </Text>
                            <View style={{ width: 22 }} />
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 16 }}>
                            {selectedLocation && (
                                <View className="mb-5">
                                    <Text className="text-xs uppercase" style={{ color: theme.colors.subtext }}>
                                        Deliver to
                                    </Text>
                                    <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                        {selectedLocation.label ?? 'Selected address'}
                                    </Text>
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                        {selectedLocation.address}
                                    </Text>
                                </View>
                            )}

                            <View className="gap-2 mb-4">
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-row items-center gap-1">
                                        <Text className="text-base" style={{ color: theme.colors.subtext }}>
                                            Delivery
                                        </Text>
                                        {deliveryZoneName && !freeDeliveryApplied && (
                                            <Text className="text-xs" style={{ color: theme.colors.primary }}>
                                                ({deliveryZoneName})
                                            </Text>
                                        )}
                                    </View>
                                    <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                        {freeDeliveryApplied ? 'Free' : `€${appliedDeliveryPrice.toFixed(2)}`}
                                    </Text>
                                </View>
                                {(appliedDiscount > 0 || freeDeliveryApplied) && (
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-base" style={{ color: theme.colors.subtext }}>
                                            Promo
                                        </Text>
                                        <Text className="text-base font-semibold" style={{ color: theme.colors.income }}>
                                            {freeDeliveryApplied && appliedDiscount === 0
                                                ? 'Free delivery'
                                                : `-€${appliedDiscount.toFixed(2)}`}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View className="p-4 rounded-2xl border mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
                                <Text className="text-xs uppercase mb-2" style={{ color: theme.colors.subtext }}>
                                    Promo code
                                </Text>
                                <View className="flex-row items-center gap-2">
                                    <TextInput
                                        value={couponCode}
                                        onChangeText={setCouponCode}
                                        placeholder="Enter code"
                                        placeholderTextColor={theme.colors.subtext}
                                        className="flex-1 px-3 py-2 rounded-xl"
                                        style={{
                                            color: theme.colors.text,
                                            backgroundColor: theme.colors.card,
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
                                            <Text className="text-white font-semibold">Apply</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {promoResult && (
                                    <Text className="text-xs mt-2" style={{ color: theme.colors.subtext }}>
                                        Promo {promoResult.code} applied to this order.
                                    </Text>
                                )}
                            </View>

                            <View className="h-px mb-3" style={{ backgroundColor: theme.colors.border }} />

                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                                    Total
                                </Text>
                                <Text className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                                    €{finalTotal.toFixed(2)}
                                </Text>
                            </View>

                            <View style={{ height: 16 }} />
                        </ScrollView>

                        <View className="p-4 border-t" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center mb-2"
                                style={{
                                    backgroundColor: isProcessing ? theme.colors.border : theme.colors.primary,
                                    opacity: isProcessing ? 0.6 : 1,
                                }}
                                onPress={handleCheckout}
                                disabled={isProcessing}
                            >
                                {isProcessing || orderLoading ? (
                                    <View className="flex-row items-center gap-2">
                                        <ActivityIndicator size="small" color="white" />
                                        <Text className="text-white font-semibold">Placing order...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-white font-semibold">Confirm & Place Order</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={() => {
                                    closeSummaryModal();
                                    setTimeout(() => setIsAddressModalOpen(true), 260);
                                }}
                            >
                                <Text className="font-semibold" style={{ color: theme.colors.text }}>
                                    Change address
                                </Text>
                            </TouchableOpacity>
                        </View>
                        </Animated.View>
                    </View>
            </Modal>

            {/* Save Address Prompt Modal */}
            <Modal visible={showSaveAddressPrompt} transparent animationType="fade" onRequestClose={handleSkipSaving}>
                <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <View className="w-full rounded-2xl p-6" style={{ backgroundColor: theme.colors.card }}>
                        <View className="items-center mb-4">
                            <View
                                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                                style={{ backgroundColor: theme.colors.primary + '20' }}
                            >
                                <Ionicons name="bookmark-outline" size={32} color={theme.colors.primary} />
                            </View>
                            <Text className="text-xl font-bold text-center mb-2" style={{ color: theme.colors.text }}>
                                Save this address?
                            </Text>
                            <Text className="text-center" style={{ color: theme.colors.subtext }}>
                                Choose a name for quick access
                            </Text>
                        </View>

                        {pendingLocationToSave && (
                            <View
                                className="rounded-xl p-3 mb-4"
                                style={{ backgroundColor: theme.colors.background }}
                            >
                                <View className="flex-row items-start">
                                    <Ionicons
                                        name="location"
                                        size={18}
                                        color={theme.colors.primary}
                                        style={{ marginRight: 8, marginTop: 2 }}
                                    />
                                    <View className="flex-1">
                                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                            {pendingLocationToSave.address}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Quick Select Buttons */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                                Quick select
                            </Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    className="flex-1 py-3 rounded-xl items-center border-2"
                                    style={{
                                        backgroundColor: addressName === 'Home' ? theme.colors.primary + '15' : theme.colors.background,
                                        borderColor: addressName === 'Home' ? theme.colors.primary : theme.colors.border,
                                    }}
                                    onPress={() => setAddressName('Home')}
                                >
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons
                                            name="home"
                                            size={20}
                                            color={addressName === 'Home' ? theme.colors.primary : theme.colors.text}
                                        />
                                        <Text
                                            className="font-semibold"
                                            style={{ color: addressName === 'Home' ? theme.colors.primary : theme.colors.text }}
                                        >
                                            Home
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 py-3 rounded-xl items-center border-2"
                                    style={{
                                        backgroundColor: addressName === 'Work' ? theme.colors.primary + '15' : theme.colors.background,
                                        borderColor: addressName === 'Work' ? theme.colors.primary : theme.colors.border,
                                    }}
                                    onPress={() => setAddressName('Work')}
                                >
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons
                                            name="briefcase"
                                            size={20}
                                            color={addressName === 'Work' ? theme.colors.primary : theme.colors.text}
                                        />
                                        <Text
                                            className="font-semibold"
                                            style={{ color: addressName === 'Work' ? theme.colors.primary : theme.colors.text }}
                                        >
                                            Work
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Custom Name Input */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                                Or enter custom name
                            </Text>
                            <TextInput
                                className="rounded-xl px-4 py-3 border-2"
                                style={{
                                    backgroundColor: theme.colors.background,
                                    borderColor: addressName && addressName !== 'Home' && addressName !== 'Work' ? theme.colors.primary : theme.colors.border,
                                    color: theme.colors.text,
                                }}
                                placeholder="e.g., Mom's house, Office, Gym..."
                                placeholderTextColor={theme.colors.subtext}
                                value={addressName !== 'Home' && addressName !== 'Work' ? addressName : ''}
                                onChangeText={setAddressName}
                                onFocus={() => {
                                    if (addressName === 'Home' || addressName === 'Work') {
                                        setAddressName('');
                                    }
                                }}
                            />
                        </View>

                        <View className="gap-3">
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center"
                                style={{
                                    backgroundColor: addressName.trim() ? theme.colors.primary : theme.colors.border,
                                    opacity: addressName.trim() ? 1 : 0.5,
                                }}
                                onPress={handleSaveAsDefault}
                                disabled={addingAddress || !addressName.trim()}
                            >
                                {addingAddress ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-semibold">Save as default</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={handleSkipSaving}
                                disabled={addingAddress}
                            >
                                <Text className="font-semibold" style={{ color: theme.colors.text }}>
                                    Skip, just use once
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
                    <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: notifier.type === 'success' ? '#16a34a' : theme.colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>{notifier.message}</Text>
                    </View>
                </Animated.View>
            )}

        </SafeAreaView>
    );
};

