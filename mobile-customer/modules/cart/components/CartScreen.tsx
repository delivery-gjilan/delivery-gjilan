import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, TextInput, Animated, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';

import { useTheme } from '@/hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { useCartActions } from '../hooks/useCartActions';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { CALCULATE_DELIVERY_FEE } from '@/graphql/operations/deliveryZones';

const VALIDATE_PROMOTIONS_V2 = gql`
    query ValidatePromotionsV2($cart: CartContextInput!, $manualCode: String) {
        validatePromotionsV2(cart: $cart, manualCode: $manualCode) {
            totalDiscount
            freeDeliveryApplied
            finalSubtotal
            finalDeliveryPrice
            finalTotal
            promotions {
                id
                name
                code
                type
                target
                appliedAmount
                freeDelivery
                priority
            }
        }
    }
`;

type CheckoutLocation = {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
};

type AutoPromoResult = {
    totalDiscount: number;
    freeDeliveryApplied: boolean;
    finalDeliveryPrice: number;
    finalTotal: number;
    promotions: Array<{
        id: string;
        name: string;
        code?: string | null;
        type: string;
        target: string;
        appliedAmount: number;
        freeDelivery: boolean;
        priority: number;
    }>;
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
    const [deliveryPrice, setDeliveryPrice] = useState(2.0); // Base delivery fee
    const [deliveryZone, setDeliveryZone] = useState<string | null>(null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<CheckoutLocation | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [promoResult, setPromoResult] = useState<{
        code: string;
        discountAmount: number;
        freeDeliveryApplied: boolean;
        effectiveDeliveryPrice: number;
        totalPrice: number;
    } | null>(null);
    const [autoPromoResult, setAutoPromoResult] = useState<AutoPromoResult | null>(null);
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

    const [calculateFee, { data: feeData, loading: feeLoading }] = useLazyQuery(CALCULATE_DELIVERY_FEE);
    const [validatePromotionsV2, { loading: autoPromoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS_V2, {
        fetchPolicy: 'no-cache',
    });
    const [validatePromotionsV2Manual, { loading: manualPromoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS_V2, {
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

    const defaultAddresses = useMemo(
        () => [
            {
                id: 'home',
                label: 'Home',
                address: 'Rruga e Kombit 12, Gjilan',
                latitude: 42.463,
                longitude: 21.469,
            },
            {
                id: 'work',
                label: 'Work',
                address: 'Bulevardi i Pavaresise 3, Gjilan',
                latitude: 42.458,
                longitude: 21.471,
            },
        ],
        [],
    );

    const requestFeeForLocation = (next: CheckoutLocation) => {
        calculateFee({
            variables: {
                latitude: next.latitude,
                longitude: next.longitude,
                baseDeliveryFee: 2.0,
            },
        });
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
        if (!isAddressModalOpen) return;
        addressSlideX.setValue(screenWidth);
        Animated.timing(addressSlideX, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
        }).start();
    }, [isAddressModalOpen, screenWidth, addressSlideX]);

    useEffect(() => {
        // Get user's current location when modal opens
        if (isAddressModalOpen) {
            (async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({});
                    const newRegion = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    };
                    setMapRegion(newRegion);
                }
            })();
        }
    }, [isAddressModalOpen]);

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
            duration: 250,
            useNativeDriver: true,
        }).start(() => setIsAddressModalOpen(false));
    };

    const handleMapPress = async (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setMapMarker({ latitude, longitude });
        
        // Reverse geocode to get address
        try {
            const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
            const address = formatAddress(result ?? null);
            const location = {
                latitude,
                longitude,
                address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                label: 'Map location',
            };
            setSelectedLocation(location);
            requestFeeForLocation(location);
        } catch (error) {
            const location = {
                latitude,
                longitude,
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                label: 'Map location',
            };
            setSelectedLocation(location);
            requestFeeForLocation(location);
        }
    };

    const handleSelectLocation = (next: CheckoutLocation) => {
        setSelectedLocation(next);
        setDeliveryPrice(2.0);
        setDeliveryZone(null);
        requestFeeForLocation(next);
        
        // Update map marker and center map on selected location
        setMapMarker({ latitude: next.latitude, longitude: next.longitude });
        setMapRegion({
            latitude: next.latitude,
            longitude: next.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        });
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

    const handleOpenMap = () => {
        setIsMapModalOpen(true);
    };

    // Update delivery price based on zone calculation
    useEffect(() => {
        if (feeData?.calculateDeliveryFee) {
            setDeliveryPrice(feeData.calculateDeliveryFee.totalFee);
            setDeliveryZone(feeData.calculateDeliveryFee.zone?.name || null);
        }
    }, [feeData]);

    useEffect(() => {
        if (promoResult) {
            setPromoResult(null);
        }
    }, [total, deliveryPrice]);

    useEffect(() => {
        if (items.length === 0) {
            setAutoPromoResult(null);
            return;
        }

        validatePromotionsV2({ variables: { cart: cartContext } })
            .then(({ data }) => {
                if (data?.validatePromotionsV2) {
                    setAutoPromoResult(data.validatePromotionsV2 as AutoPromoResult);
                } else {
                    setAutoPromoResult(null);
                }
            })
            .catch(() => {
                setAutoPromoResult(null);
            });
    }, [cartContext, items.length, validatePromotionsV2]);

    useEffect(() => {
        if (promoResult && promoResult.code !== couponCode.trim()) {
            setPromoResult(null);
        }
    }, [couponCode, promoResult]);

    const manualPromoApplied = !!promoResult;
    const autoPromoApplied = !manualPromoApplied && !!autoPromoResult && autoPromoResult.promotions.length > 0;
    const freeDeliveryApplied = manualPromoApplied
        ? promoResult?.freeDeliveryApplied ?? false
        : autoPromoApplied
            ? autoPromoResult.freeDeliveryApplied
            : false;

    const appliedDiscount = manualPromoApplied
        ? promoResult?.discountAmount ?? 0
        : autoPromoApplied
            ? autoPromoResult.totalDiscount
            : 0;

    const appliedDeliveryPrice = manualPromoApplied
        ? promoResult?.effectiveDeliveryPrice ?? deliveryPrice
        : autoPromoApplied
            ? autoPromoResult.finalDeliveryPrice
            : deliveryPrice;

    const finalTotal = manualPromoApplied
        ? promoResult?.totalPrice ?? Math.max(0, total + deliveryPrice - appliedDiscount)
        : autoPromoApplied
            ? autoPromoResult.finalTotal
            : Math.max(0, total + deliveryPrice - appliedDiscount);

    const handleApplyCoupon = () => {
        const code = couponCode.trim();
        if (!code) {
            setPromoResult(null);
            return;
        }

        if (code.length < 2) {
            Alert.alert('Invalid Code', 'Please enter a valid promo code.');
            return;
        }

        validatePromotionsV2Manual({
            variables: {
                cart: cartContext,
                manualCode: code,
            },
        })
            .then(({ data }) => {
                const result = data?.validatePromotionsV2 as AutoPromoResult | undefined;
                if (!result || result.promotions.length === 0) {
                    setPromoResult(null);
                    Alert.alert('Invalid Code', 'Promotion not valid.');
                    return;
                }

                setPromoResult({
                    code,
                    discountAmount: Number(result.totalDiscount ?? 0),
                    freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                    effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                    totalPrice: Number(result.finalTotal ?? total + deliveryPrice),
                });
                Alert.alert('Promo Applied', `Discount €${Number(result.totalDiscount ?? 0).toFixed(2)} added.`);
            })
            .catch(() => {
                Alert.alert('Promo Error', 'Unable to validate promo code.');
            });
    };

    const handleCheckout = async () => {
        if (!selectedLocation) {
            Alert.alert('Select Address', 'Please choose a delivery address to continue.');
            setIsAddressModalOpen(true);
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
                    onPress={() => setIsAddressModalOpen(true)}
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

            {/* Address Chooser Modal */}
            <Modal visible={isAddressModalOpen} animationType="none" onRequestClose={closeAddressModal}>
                <ImageBackground
                    source={require('../../../assets/images/splash.png')}
                    blurRadius={18}
                    style={{ flex: 1 }}
                    imageStyle={{ opacity: 0.18 }}
                >
                    <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background, opacity: 0.92 }]} />
                        <Animated.View style={{ flex: 1, transform: [{ translateX: addressSlideX }] }}>
                        <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                            <TouchableOpacity onPress={closeAddressModal} className="p-2 -ml-2">
                                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                Choose address
                            </Text>
                            <TouchableOpacity onPress={closeAddressModal} className="p-2 -mr-2">
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                        <Text className="text-xs uppercase mb-2" style={{ color: theme.colors.subtext }}>
                            Saved addresses
                        </Text>
                        {defaultAddresses.length === 0 ? (
                            <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                No saved addresses yet.
                            </Text>
                        ) : (
                            <View className="gap-2 mb-4">
                                <TouchableOpacity
                                    className="flex-row items-center p-4 rounded-2xl border"
                                    style={{
                                        borderColor: selectedLocation?.label === 'Current location' ? theme.colors.primary : theme.colors.border,
                                        backgroundColor: selectedLocation?.label === 'Current location'
                                            ? theme.colors.primary + '12'
                                            : theme.colors.background,
                                    }}
                                    onPress={handleUseCurrentLocation}
                                >
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                        style={{
                                            backgroundColor:
                                                selectedLocation?.label === 'Current location'
                                                    ? theme.colors.primary + '20'
                                                    : theme.colors.primary + '15',
                                        }}
                                    >
                                        <Ionicons name="locate" size={18} color={theme.colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-base font-semibold"
                                            style={{
                                                color:
                                                    selectedLocation?.label === 'Current location'
                                                        ? theme.colors.primary
                                                        : theme.colors.text,
                                            }}
                                        >
                                            Use my current location
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {defaultAddresses.map((address) => {
                                    const isSelected = selectedLocation?.address === address.address;
                                    return (
                                    <TouchableOpacity
                                        key={address.id}
                                        className="p-4 rounded-2xl border"
                                        style={{
                                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                            backgroundColor: isSelected ? theme.colors.primary + '12' : theme.colors.background,
                                        }}
                                        onPress={() =>
                                            handleSelectLocation({
                                                latitude: address.latitude,
                                                longitude: address.longitude,
                                                address: address.address,
                                                label: address.label,
                                            })
                                        }
                                    >
                                        <Text
                                            className="text-base font-semibold"
                                            style={{ color: isSelected ? theme.colors.primary : theme.colors.text }}
                                        >
                                            {address.label}
                                        </Text>
                                        <Text
                                            className="text-sm"
                                            style={{ color: isSelected ? theme.colors.primary : theme.colors.subtext }}
                                        >
                                            {address.address}
                                        </Text>
                                    </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        <View className="h-px my-4" style={{ backgroundColor: theme.colors.border }} />

                        <Text className="text-xs uppercase mb-2" style={{ color: theme.colors.subtext }}>
                            Select on map
                        </Text>
                        <View className="mb-4">
                            <View className="rounded-2xl overflow-hidden" style={{ height: 400, backgroundColor: theme.colors.border }}>
                                <MapView
                                    style={{ flex: 1 }}
                                    region={mapRegion}
                                    onPress={handleMapPress}
                                    showsUserLocation={true}
                                    showsMyLocationButton={false}
                                    showsCompass={false}
                                    showsScale={false}
                                    showsBuildings={false}
                                    showsTraffic={false}
                                    showsIndoors={false}
                                    toolbarEnabled={false}
                                    mapType="standard"
                                    customMapStyle={minimalistMapStyle}
                                >
                                    {mapMarker && (
                                        <Marker
                                            coordinate={mapMarker}
                                            pinColor={theme.colors.primary}
                                        />
                                    )}
                                </MapView>
                            </View>
                        </View>
                        </ScrollView>

                        <View className="p-4 border-t" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <AnimatedTouchable
                            className="py-4 rounded-xl items-center"
                            style={{ 
                                backgroundColor: selectedLocation ? theme.colors.primary : theme.colors.subtext,
                                opacity: selectedLocation ? 1 : 0.5,
                                transform: [{ scale: proceedButtonAnim }]
                            }}
                            disabled={!selectedLocation}
                            onPress={() => {
                                if (!selectedLocation) {
                                    Alert.alert('Select Address', 'Please choose a delivery address to continue.');
                                    return;
                                }
                                setIsAddressModalOpen(false);
                                setIsSummaryModalOpen(true);
                            }}
                        >
                            <Text className="text-white font-bold text-lg">Proceed to checkout</Text>
                        </AnimatedTouchable>
                    </View>
                    </Animated.View>
                    </SafeAreaView>
                </ImageBackground>
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

                        <View className="flex-1 items-center justify-center px-6">
                            <Ionicons name="map-outline" size={72} color={theme.colors.subtext} />
                            <Text className="text-lg font-semibold mt-4" style={{ color: theme.colors.text }}>
                                Map picker is unavailable in Expo Go
                            </Text>
                            <Text className="text-center mt-2" style={{ color: theme.colors.subtext }}>
                                Use your current location for now. We can enable pin selection in a dev build.
                            </Text>
                        </View>

                        <View className="p-4 border-t" style={{ borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center mb-2"
                                style={{ backgroundColor: theme.colors.primary }}
                                onPress={handleUseCurrentLocation}
                            >
                                <Text className="text-white font-semibold">Use my current address</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="py-3 rounded-xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
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
                                        {deliveryZone && (
                                            <Text
                                                className="text-xs px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: theme.colors.primary + '20', color: theme.colors.primary }}
                                            >
                                                {deliveryZone}
                                            </Text>
                                        )}
                                        {feeLoading && <ActivityIndicator size="small" color={theme.colors.subtext} />}
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

                            {(autoPromoLoading || (autoPromoResult && autoPromoResult.promotions.length > 0)) && (
                                <View className="p-4 rounded-2xl border mb-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="text-xs uppercase" style={{ color: theme.colors.subtext }}>
                                            Auto-applied promotions
                                        </Text>
                                        {autoPromoLoading && <ActivityIndicator size="small" color={theme.colors.subtext} />}
                                    </View>

                                    {autoPromoResult?.promotions.map((promo) => (
                                        <View key={promo.id} className="flex-row items-center justify-between mb-2">
                                            <View className="flex-1 pr-2">
                                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                                    {promo.name}
                                                </Text>
                                                {promo.code && (
                                                    <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                                        Code: {promo.code}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text className="text-sm font-semibold" style={{ color: theme.colors.income }}>
                                                {promo.freeDelivery && promo.appliedAmount === 0
                                                    ? 'Free delivery'
                                                    : `-€${Number(promo.appliedAmount).toFixed(2)}`}
                                            </Text>
                                        </View>
                                    ))}

                                </View>
                            )}

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
                                    backgroundColor: isProcessing || feeLoading ? theme.colors.border : theme.colors.primary,
                                    opacity: isProcessing || feeLoading ? 0.6 : 1,
                                }}
                                onPress={handleCheckout}
                                disabled={isProcessing || feeLoading}
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
                                    setTimeout(() => setIsAddressModalOpen(true), 120);
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
        </SafeAreaView>
    );
};

