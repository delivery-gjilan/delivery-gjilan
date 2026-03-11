import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Modal, Pressable, Switch, Linking, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import {
    ALL_ORDERS_UPDATED,
    ASSIGN_DRIVER_TO_ORDER,
    DRIVER_NOTIFY_CUSTOMER,
    GET_ORDERS,
    UPDATE_ORDER_STATUS,
} from '@/graphql/operations/orders';
import { UPDATE_DRIVER_ONLINE_STATUS } from '@/graphql/operations/driverLocation';
import { GET_MY_DRIVER_METRICS } from '@/graphql/operations/driver';
import { Button } from '@/components/Button';
import { calculateRouteDistance } from '@/utils/mapbox';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function Home() {
    const theme = useTheme();
    const { t, languageChoice } = useTranslations();
    const router = useRouter();
    const { logout } = useAuth();
    
    const isOnline = useAuthStore((state) => state.isOnline);
    const setOnline = useAuthStore((state) => state.setOnline);
    const setUser = useAuthStore((state) => state.setUser);
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const [newOrder, setNewOrder] = useState<any | null>(null);
    const seenOrderIds = useRef<Set<string>>(new Set());
    const [orderDistances, setOrderDistances] = useState<Record<string, { distanceKm: number; durationMin: number }>>({});
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
        // cache-and-network: shows cached orders instantly, then updates from the network.
        // The ALL_ORDERS_UPDATED subscription keeps this fresh in real time, so we
        // don't need network-only or a poll interval.
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const { data: metricsData, refetch: refetchMetrics } = useQuery(GET_MY_DRIVER_METRICS, {
        // Metrics only change meaningfully when an order is delivered.
        // We refetch manually in handleUpdate when status === 'DELIVERED'.
        // No poll interval needed.
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const metrics = (metricsData as any)?.myDriverMetrics;

    useSubscription(ALL_ORDERS_UPDATED, {
        onData: () => { refetch(); },
    });

    // Detect new READY orders for notification popup
    useEffect(() => {
        const orders = (data as any)?.orders ?? [];
        const readyOrders = orders.filter((order: any) => {
            if (order.status !== 'READY') return false;
            return !order.driver?.id || order.driver.id === currentDriverId;
        });
        const unseenOrder = readyOrders.find((order: any) => !seenOrderIds.current.has(order.id));
        if (unseenOrder) {
            seenOrderIds.current.add(unseenOrder.id);
            setNewOrder(unseenOrder);
        }
    }, [data, currentDriverId]);

    const [updateStatus, { loading: updating }] = useMutation(UPDATE_ORDER_STATUS);
    const [assignDriverToOrder, { loading: assigningOrder }] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [driverNotifyCustomer] = useMutation(DRIVER_NOTIFY_CUSTOMER);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);
    const [notifyCooldownUntilByOrder, setNotifyCooldownUntilByOrder] = useState<Record<string, number>>({});
    const [cooldownNowMs, setCooldownNowMs] = useState<number>(() => Date.now());
    const [updateOnlineStatus, { loading: updatingStatus }] = useMutation(UPDATE_DRIVER_ONLINE_STATUS);

    const MANUAL_NOTIFY_COOLDOWN_SECONDS = 90;

    const notifyCopy = useMemo(
        () =>
            languageChoice === 'al'
                ? {
                      sentTitle: 'Njoftimi u dergua',
                      sentBody: 'Klienti u njoftua qe ju jeni ne pritje.',
                      errorTitle: 'Njoftimi deshtoi',
                      retryBody: 'Ju lutem provoni perseri.',
                      cooldownTitle: 'Prisni pak',
                      cooldownBody: (seconds: number) =>
                          `Mund ta njoftoni klientin perseri pas ${seconds} sekondash.`,
                      sending: 'Duke derguar...',
                      notifyLong: 'Njofto klientin: Arrita dhe jam ne pritje',
                      notifyShort: 'Njofto pritjen',
                      notifyAgainIn: (seconds: number) => `Njofto perseri pas ${seconds}s`,
                  }
                : {
                      sentTitle: 'Notification sent',
                      sentBody: 'Customer has been notified that you are waiting.',
                      errorTitle: 'Could not send notification',
                      retryBody: 'Please try again.',
                      cooldownTitle: 'Please wait',
                      cooldownBody: (seconds: number) => `You can notify the customer again in ${seconds}s.`,
                      sending: 'Sending...',
                      notifyLong: 'Notify customer: I arrived and I am waiting',
                      notifyShort: 'Notify Waiting',
                      notifyAgainIn: (seconds: number) => `Notify again in ${seconds}s`,
                  },
        [languageChoice],
    );

    useEffect(() => {
        const hasActiveCooldown = Object.values(notifyCooldownUntilByOrder).some((until) => until > Date.now());
        if (!hasActiveCooldown) return;

        const timer = setInterval(() => {
            setCooldownNowMs(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, [notifyCooldownUntilByOrder]);

    const getManualNotifyCooldownSeconds = (orderId: string) => {
        const until = notifyCooldownUntilByOrder[orderId] ?? 0;
        if (until <= cooldownNowMs) return 0;
        return Math.ceil((until - cooldownNowMs) / 1000);
    };
    
    const handleOnlineStatusChange = async (newStatus: boolean) => {
        try {
            setOnline(newStatus); // Optimistic update
            const result = await updateOnlineStatus({
                variables: { isOnline: newStatus },
            });
            
            const updatedUser = (result.data as any)?.updateDriverOnlineStatus;
            if (updatedUser) {
                // Update the full user object so persistence includes the updated driverConnection
                setUser(updatedUser);
                // setOnline will be recalculated in setUser based on driverConnection.onlinePreference
                console.log('[HandleOnlineToggle] Updated user with new preference', {
                    onlinePreference: updatedUser.driverConnection?.onlinePreference
                });
            }
        } catch (err) {
            console.error('[HandleOnlineToggle] Failed to update online status:', err);
            setOnline(!newStatus); // Revert on failure
        }
    };

    const activeOrders = useMemo(() => {
        const orders = (data as any)?.orders || [];
        return orders.filter((order: any) => {
            if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return false;

            // If assigned, only assigned driver can see it
            if (order.driver?.id) {
                return order.driver.id === currentDriverId;
            }

            // Unassigned orders remain visible for claiming
            return true;
        });
    }, [data, currentDriverId]);

    const handleAcceptAndOpenMap = async (orderId: string) => {
        if (!currentDriverId) {
            Alert.alert('Error', 'Driver profile not loaded. Please re-login.');
            return;
        }

        const order = activeOrders.find((o: any) => o.id === orderId);
        if (!order) {
            Alert.alert('Unavailable', 'Order is no longer available.');
            return;
        }

        // If already assigned to another driver, block immediately
        if (order.driver?.id && order.driver.id !== currentDriverId) {
            Alert.alert('Already assigned', 'This order has been assigned to another driver.');
            return;
        }

        try {
            if (!order.driver?.id) {
                await assignDriverToOrder({
                    variables: {
                        id: orderId,
                        driverId: currentDriverId,
                    },
                });
            }

            await refetch();
            openOrderMap(orderId);
        } catch (error: any) {
            console.error('[Home] Failed to assign order', error);
            Alert.alert('Could not lock order', error?.message || 'Please try again.');
            await refetch();
        }
    };

    const getPickupLocation = (order: any) => {
        const business = order?.businesses?.[0]?.business;
        if (!business?.location) return null;
        return {
            latitude: Number(business.location.latitude),
            longitude: Number(business.location.longitude),
        };
    };

    const getDropoffLocation = (order: any) => {
        const drop = order?.dropOffLocation;
        if (!drop) return null;
        return {
            latitude: Number(drop.latitude),
            longitude: Number(drop.longitude),
        };
    };

    const openNavigation = async (order: any) => {
        const pickup = getPickupLocation(order);
        const dropoff = getDropoffLocation(order);
        if (!dropoff) return;

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;

        const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const origin = `${current.coords.latitude},${current.coords.longitude}`;
        const destination = `${dropoff.latitude},${dropoff.longitude}`;
        const waypoint = pickup ? `${pickup.latitude},${pickup.longitude}` : null;

        const base = 'https://www.google.com/maps/dir/?api=1';
        const googleUrl = waypoint
            ? `${base}&origin=${origin}&destination=${destination}&waypoints=${waypoint}&travelmode=driving&dir_action=navigate`
            : `${base}&origin=${origin}&destination=${destination}&travelmode=driving&dir_action=navigate`;

        const googleScheme = waypoint
            ? `comgooglemaps://?saddr=${origin}&daddr=${destination}&waypoints=${waypoint}&directionsmode=driving`
            : `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`;

        if (Platform.OS === 'ios') {
            const canOpenGoogle = await Linking.canOpenURL('comgooglemaps://');
            if (canOpenGoogle) {
                await Linking.openURL(googleScheme);
                return;
            }

            const appleUrl = waypoint
                ? `maps://?saddr=${origin}&daddr=${waypoint}+to:${destination}&dirflg=d`
                : `maps://?saddr=${origin}&daddr=${destination}&dirflg=d`;
            await Linking.openURL(appleUrl);
            return;
        }

        const canOpenGoogle = await Linking.canOpenURL(googleScheme);
        await Linking.openURL(canOpenGoogle ? googleScheme : googleUrl);
    };

// Calculate distances for all active orders in parallel
    useEffect(() => {
        const calculateDistances = async () => {
            const ordersNeedingDistance = activeOrders.filter((order: any) => {
                if (orderDistances[order.id]) return false; // Already calculated
                const firstBusiness = order.businesses?.[0]?.business;
                return Boolean(firstBusiness?.location);
            });

            if (ordersNeedingDistance.length === 0) return;

            await Promise.all(
                ordersNeedingDistance.map(async (order: any) => {
                    const firstBusiness = order.businesses[0].business;
                    const pickup = {
                        longitude: firstBusiness.location.longitude,
                        latitude: firstBusiness.location.latitude,
                    };
                    const dropoff = {
                        longitude: order.dropOffLocation.longitude,
                        latitude: order.dropOffLocation.latitude,
                    };
                    try {
                        const distance = await calculateRouteDistance(pickup, dropoff);
                        if (distance) {
                            setOrderDistances((prev) => ({
                                ...prev,
                                [order.id]: distance,
                            }));
                        }
                    } catch (error) {
                        console.error('Error calculating distance for order', order.id, error);
                    }
                }),
            );
        };

        calculateDistances();
    }, [activeOrders.map((o: any) => o.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUpdate = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            await updateStatus({ variables: { id, status } });
            await refetch();
            if (status === 'DELIVERED') {
                refetchMetrics();
            }
            if (status === 'OUT_FOR_DELIVERY') {
                router.push({ pathname: '/(tabs)/map' });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingId(null);
        }
    };

    const businessNamesForOrder = (order: any) =>
        order.businesses.map((b: any) => b.business.name).join(', ');

    const itemsForOrder = (order: any) =>
        order.businesses.flatMap((b: any) => b.items || []);

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch (err) {
            console.error('[Logout] Failed:', err);
        }
    };

    const readyOrders = useMemo(
        () => activeOrders.filter((order: any) => order.status === 'READY'),
        [activeOrders],
    );

    const inDeliveryOrders = useMemo(
        () => activeOrders.filter((order: any) => order.status === 'OUT_FOR_DELIVERY' || order.status === 'PREPARING'),
        [activeOrders],
    );

    const openOrderMap = (_id: string) => {
        router.push({ pathname: '/(tabs)/map' });
    };

    const handleNotifyCustomerWaiting = async (orderId: string) => {
        const cooldownSeconds = getManualNotifyCooldownSeconds(orderId);
        if (cooldownSeconds > 0) {
            Alert.alert(notifyCopy.cooldownTitle, notifyCopy.cooldownBody(cooldownSeconds));
            return;
        }

        try {
            setNotifyingOrderId(orderId);
            await driverNotifyCustomer({
                variables: {
                    orderId,
                    kind: 'ARRIVED_WAITING',
                },
            });

            setNotifyCooldownUntilByOrder((prev) => ({
                ...prev,
                [orderId]: Date.now() + MANUAL_NOTIFY_COOLDOWN_SECONDS * 1000,
            }));

            Alert.alert(notifyCopy.sentTitle, notifyCopy.sentBody);
        } catch (err: any) {
            console.error('[Home] Failed to notify customer', err);
            Alert.alert(notifyCopy.errorTitle, err?.message || notifyCopy.retryBody);
        } finally {
            setNotifyingOrderId(null);
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Modal
                visible={!!newOrder}
                transparent
                animationType="fade"
                onRequestClose={() => setNewOrder(null)}
            >
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
                    <View className="w-[92%] rounded-3xl overflow-hidden" style={{ backgroundColor: theme.colors.card }}>
                        {/* Header */}
                        <View className="p-6 pb-4" style={{ backgroundColor: theme.colors.income + '15' }}>
                            <View className="flex-row items-center mb-2">
                                <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: theme.colors.income }} />
                                <Text className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.income }}>
                                    NEW ORDER AVAILABLE
                                </Text>
                            </View>
                            <Text className="text-2xl font-bold mt-1" style={{ color: theme.colors.text }}>
                                {newOrder ? businessNamesForOrder(newOrder) : ''}
                            </Text>
                            <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                                📍 {newOrder?.dropOffLocation?.address}
                            </Text>
                        </View>

                        {/* Distance/ETA Info */}
                        <View className="px-6 py-5">
                            {newOrder && orderDistances[newOrder.id] ? (
                                <View className="flex-row items-stretch gap-3">
                                    <View className="flex-1 rounded-2xl p-4 items-center" 
                                        style={{ backgroundColor: theme.colors.border }}>
                                        <Text className="text-xs font-semibold mb-1" style={{ color: theme.colors.subtext }}>
                                            DISTANCE
                                        </Text>
                                        <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                                            {orderDistances[newOrder.id]?.distanceKm.toFixed(1)}
                                        </Text>
                                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                            kilometers
                                        </Text>
                                    </View>
                                    <View className="flex-1 rounded-2xl p-4 items-center" 
                                        style={{ backgroundColor: theme.colors.income + '15' }}>
                                        <Text className="text-xs font-semibold mb-1" style={{ color: theme.colors.income }}>
                                            ETA
                                        </Text>
                                        <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                                            {Math.round(orderDistances[newOrder.id]?.durationMin ?? 0)}
                                        </Text>
                                        <Text className="text-xs mt-1" style={{ color: theme.colors.income }}>
                                            minutes
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View className="rounded-2xl p-6 items-center" style={{ backgroundColor: theme.colors.border }}>
                                    <ActivityIndicator size="large" color={theme.colors.primary} />
                                    <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>
                                        Calculating route...
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View className="px-6 pb-6 gap-3">
                            <Pressable
                                className="py-4 rounded-2xl items-center"
                                style={{
                                    backgroundColor:
                                        newOrder?.driver?.id && newOrder.driver.id === currentDriverId
                                            ? theme.colors.primary
                                            : theme.colors.income,
                                }}
                                onPress={() => {
                                    if (!newOrder) return;
                                    setNewOrder(null);
                                    if (newOrder?.driver?.id && newOrder.driver.id === currentDriverId) {
                                        openOrderMap(newOrder.id);
                                        return;
                                    }
                                    handleAcceptAndOpenMap(newOrder.id);
                                }}
                                disabled={assigningOrder}
                            >
                                <Text className="text-white font-bold text-base">
                                    {assigningOrder
                                        ? '⏳ Loading...'
                                        : newOrder?.driver?.id && newOrder.driver.id === currentDriverId
                                        ? 'Continue Navigation'
                                        : '✅ Accept Order'}
                                </Text>
                            </Pressable>
                            <Pressable
                                className="py-4 rounded-2xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={() => setNewOrder(null)}
                            >
                                <Text style={{ color: theme.colors.text }} className="font-semibold">
                                    Dismiss
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={!!selectedOrder}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedOrder(null)}
            >
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className="w-[92%] rounded-3xl p-6" style={{ backgroundColor: theme.colors.card }}>
                        <Text className="text-xs uppercase tracking-wide" style={{ color: theme.colors.subtext }}>
                            Order details
                        </Text>
                        <Text className="text-xl font-bold mt-2" style={{ color: theme.colors.text }}>
                            {selectedOrder ? businessNamesForOrder(selectedOrder) : ''}
                        </Text>
                        <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                            Status: {selectedOrder?.status}
                        </Text>
                        {selectedOrder?.dropOffLocation?.address && (
                            <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                                Dropoff: {selectedOrder.dropOffLocation.address}
                            </Text>
                        )}

                        {selectedOrder?.driverNotes && (
                            <View className="mt-3 p-3 rounded-xl" style={{ backgroundColor: theme.colors.background }}>
                                <View className="flex-row items-center gap-1 mb-1">
                                    <Ionicons name="chatbubble-ellipses" size={14} color={theme.colors.primary} />
                                    <Text className="text-xs font-semibold uppercase" style={{ color: theme.colors.primary }}>
                                        Delivery Instructions
                                    </Text>
                                </View>
                                <Text className="text-sm" style={{ color: theme.colors.text }}>
                                    {selectedOrder.driverNotes}
                                </Text>
                            </View>
                        )}

                        <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.border }}>
                            <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                ETA
                            </Text>
                            <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                                {selectedOrder && orderDistances[selectedOrder.id]
                                    ? `~${Math.round(orderDistances[selectedOrder.id]?.durationMin ?? 0)} min`
                                    : 'Calculating...'}
                            </Text>
                            <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                {selectedOrder && orderDistances[selectedOrder.id]
                                    ? `${orderDistances[selectedOrder.id]?.distanceKm.toFixed(1)} km total`
                                    : 'Please wait...'}
                            </Text>
                        </View>

                        <View className="mt-4">
                            <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                Items
                            </Text>
                            <View className="mt-2 space-y-1">
                                {selectedOrder && itemsForOrder(selectedOrder).length > 0 ? (
                                    itemsForOrder(selectedOrder).map((item: any, index: number) => (
                                        <View key={`${item.name}-${index}`} className="mb-2">
                                            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                                {item.quantity}x {item.name}
                                            </Text>
                                            {item.notes && (
                                                <Text className="text-xs italic ml-4 mt-0.5" style={{ color: theme.colors.subtext }}>
                                                    Note: {item.notes}
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                        No items listed.
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View className="flex-row gap-3 mt-6">
                            <Pressable
                                className="flex-1 py-3 rounded-2xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={() => setSelectedOrder(null)}
                            >
                                <Text style={{ color: theme.colors.text }} className="font-semibold">
                                    Close
                                </Text>
                            </Pressable>
                            <Pressable
                                className="flex-1 py-3 rounded-2xl items-center"
                                style={{ backgroundColor: theme.colors.primary }}
                                onPress={() => {
                                    if (!selectedOrder) return;
                                    router.push({ pathname: '/(tabs)/map' });
                                }}
                            >
                                <Text className="text-white font-semibold">Show location</Text>
                            </Pressable>
                        </View>

                        {selectedOrder?.status === 'OUT_FOR_DELIVERY' && (
                            <View className="mt-3 gap-2">
                                {(() => {
                                    const cooldownSeconds = selectedOrder?.id
                                        ? getManualNotifyCooldownSeconds(selectedOrder.id)
                                        : 0;
                                    const isDisabled = notifyingOrderId === selectedOrder?.id || cooldownSeconds > 0;

                                    return (
                                        <>
                                <Pressable
                                    className="py-3 rounded-2xl items-center"
                                    style={{ backgroundColor: theme.colors.income }}
                                    onPress={() => selectedOrder && openNavigation(selectedOrder)}
                                >
                                    <Text className="text-white font-semibold">Start navigation</Text>
                                </Pressable>
                                <Pressable
                                    className="py-3 rounded-2xl items-center"
                                    style={{
                                        backgroundColor: isDisabled ? theme.colors.border : theme.colors.primary,
                                    }}
                                    onPress={() => selectedOrder && handleNotifyCustomerWaiting(selectedOrder.id)}
                                    disabled={isDisabled}
                                >
                                    <Text className="text-white font-semibold">
                                        {notifyingOrderId === selectedOrder?.id
                                            ? notifyCopy.sending
                                            : cooldownSeconds > 0
                                            ? notifyCopy.notifyAgainIn(cooldownSeconds)
                                            : notifyCopy.notifyLong}
                                    </Text>
                                </Pressable>
                                        </>
                                    );
                                })()}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
                <View className="px-4 pt-4 pb-2">
                    <View
                        className="rounded-3xl p-4"
                        style={{
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                            borderWidth: 1,
                        }}
                    >
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                                    Driver Console
                                </Text>
                                <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                    Live dispatch and navigation
                                </Text>
                            </View>
                            <Pressable
                                className="px-3 py-2 rounded-full"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={handleLogout}
                            >
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.text }}>
                                    Logout
                                </Text>
                            </Pressable>
                        </View>

                        <View className="mt-4 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                                <View
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
                                />
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {isOnline ? 'Online (Receiving Orders)' : 'Offline'}
                                </Text>
                            </View>
                            <Switch
                                value={isOnline}
                                onValueChange={handleOnlineStatusChange}
                                disabled={updatingStatus}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
                            />
                        </View>

                        {/* Stats row: order queue */}
                        <View className="mt-4 flex-row gap-2">
                            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.income + '15', borderWidth: 1, borderColor: theme.colors.income + '30' }}>
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.income }}>READY NOW</Text>
                                <Text className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>{readyOrders.length}</Text>
                            </View>
                            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.primary + '15', borderWidth: 1, borderColor: theme.colors.primary + '30' }}>
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>ACTIVE</Text>
                                <Text className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>
                                    {metrics
                                        ? `${metrics.activeOrdersCount}/${metrics.maxActiveOrders}`
                                        : `${inDeliveryOrders.length}`}
                                </Text>
                            </View>
                        </View>

                        {/* Today's earnings metrics */}
                        <View className="mt-2 flex-row gap-2">
                            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.subtext }}>DELIVERED TODAY</Text>
                                <Text className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>
                                    {metrics ? metrics.deliveredTodayCount : '—'}
                                </Text>
                            </View>
                            <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.subtext }}>TODAY'S EARNINGS</Text>
                                <Text className="text-2xl font-bold mt-1" style={{ color: theme.colors.income }}>
                                    {metrics ? `$${metrics.netEarningsToday.toFixed(2)}` : '—'}
                                </Text>
                                {metrics && metrics.commissionPercentage > 0 && (
                                    <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                        after {metrics.commissionPercentage}% commission
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-4 mt-2">
                    {loading && (
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            Loading orders...
                        </Text>
                    )}

                    {error && (
                        <Text className="text-sm mt-2 text-red-500">
                            Failed to load orders.
                        </Text>
                    )}

                    {!loading && activeOrders.length === 0 && (
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            No active deliveries right now.
                        </Text>
                    )}

                    {readyOrders.length > 0 && (
                        <View className="mt-6">
                            <Text className="text-sm font-bold mb-3" style={{ color: theme.colors.text }}>
                                🔥 Ready for Pickup
                            </Text>
                            <View className="space-y-3">
                                {readyOrders.map((order: any) => {
                                    const businessNames = order.businesses
                                        .map((b: any) => b.business.name)
                                        .join(', ');
                                    const distance = orderDistances[order.id];
                                    const isAssignedToMe = Boolean(order.driver?.id && order.driver.id === currentDriverId);

                                    return (
                                        <Pressable
                                            key={order.id}
                                            className="rounded-3xl overflow-hidden"
                                            style={{
                                                backgroundColor: theme.colors.card,
                                                borderWidth: 2,
                                                borderColor: theme.colors.income + '40',
                                            }}
                                            onPress={() => setSelectedOrder(order)}
                                        >
                                            {/* Top Section - Business & Customer */}
                                            <View className="p-5">
                                                <Text className="text-lg font-bold mb-1" style={{ color: theme.colors.text }}>
                                                    {businessNames}
                                                </Text>
                                                <Text className="text-sm" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                                                    📍 {order.dropOffLocation.address}
                                                </Text>

                                                {/* ETA Banner */}
                                                {distance && (
                                                    <View className="mt-4 flex-row items-center justify-between rounded-2xl p-4" 
                                                        style={{ backgroundColor: theme.colors.income + '15' }}>
                                                        <View>
                                                            <Text className="text-xs font-semibold" style={{ color: theme.colors.income }}>
                                                                ESTIMATED TIME
                                                            </Text>
                                                            <Text className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>
                                                                {Math.round(distance.durationMin)} min
                                                            </Text>
                                                        </View>
                                                        <View className="items-end">
                                                            <Text className="text-xs font-semibold" style={{ color: theme.colors.income }}>
                                                                DISTANCE
                                                            </Text>
                                                            <Text className="text-3xl font-bold mt-1" style={{ color: theme.colors.text }}>
                                                                {distance.distanceKm.toFixed(1)} <Text className="text-lg">km</Text>
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}

                                                {/* Loading State */}
                                                {!distance && (
                                                    <View className="mt-4 rounded-2xl p-4 items-center" 
                                                        style={{ backgroundColor: theme.colors.border }}>
                                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                                        <Text className="text-xs mt-2" style={{ color: theme.colors.subtext }}>
                                                            Calculating route...
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Action Button */}
                                            <Pressable
                                                className="py-5 items-center"
                                                style={{ backgroundColor: isAssignedToMe ? theme.colors.primary : theme.colors.income }}
                                                onPress={() =>
                                                    isAssignedToMe
                                                        ? openOrderMap(order.id)
                                                        : handleAcceptAndOpenMap(order.id)
                                                }
                                                disabled={assigningOrder}
                                            >
                                                <Text className="text-white font-bold text-base">
                                                    {assigningOrder
                                                        ? '⏳ Loading...'
                                                        : isAssignedToMe
                                                        ? 'Continue Navigation'
                                                        : '✅ Accept & Start Navigation'}
                                                </Text>
                                            </Pressable>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {inDeliveryOrders.length > 0 && (
                        <View className="mt-6">
                            <Text className="text-sm font-bold mb-3" style={{ color: theme.colors.text }}>
                                🚗 Active Deliveries
                            </Text>
                            <View className="space-y-3">
                                {inDeliveryOrders.map((order: any) => {
                                    const businessNames = order.businesses
                                        .map((b: any) => b.business.name)
                                        .join(', ');

                                    return (
                                        <View
                                            key={order.id}
                                            className="rounded-3xl p-5"
                                            style={{
                                                backgroundColor: theme.colors.card,
                                                borderWidth: 2,
                                                borderColor: theme.colors.primary + '40',
                                            }}
                                        >
                                            <View className="flex-row items-center mb-3">
                                                <View className="w-2.5 h-2.5 rounded-full mr-2" 
                                                    style={{ backgroundColor: theme.colors.primary }} />
                                                <Text className="text-xs font-bold" style={{ color: theme.colors.primary }}>
                                                    {order.status === 'PREPARING' ? 'PREPARING' : 'OUT FOR DELIVERY'}
                                                </Text>
                                            </View>

                                            <Text className="text-lg font-bold mb-1" style={{ color: theme.colors.text }}>
                                                {businessNames}
                                            </Text>
                                            <Text className="text-sm" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                                                📍 {order.dropOffLocation.address}
                                            </Text>

                                            <View className="flex-row gap-2 mt-4">
                                                <Pressable
                                                    className="flex-1 py-3 rounded-2xl items-center"
                                                    style={{ backgroundColor: theme.colors.primary }}
                                                    onPress={() => openOrderMap(order.id)}
                                                >
                                                    <Text className="text-white font-bold">Continue Navigation</Text>
                                                </Pressable>
                                                {order.status === 'OUT_FOR_DELIVERY' && (
                                                    (() => {
                                                        const cooldownSeconds = getManualNotifyCooldownSeconds(order.id);
                                                        const isDisabled = notifyingOrderId === order.id || cooldownSeconds > 0;

                                                        return (
                                                    <Pressable
                                                        className="flex-1 py-3 rounded-2xl items-center"
                                                        style={{
                                                            backgroundColor: isDisabled
                                                                ? theme.colors.border
                                                                : theme.colors.income,
                                                        }}
                                                        onPress={() => handleNotifyCustomerWaiting(order.id)}
                                                        disabled={isDisabled}
                                                    >
                                                        <Text className="text-white font-bold">
                                                            {notifyingOrderId === order.id
                                                                ? notifyCopy.sending
                                                                : cooldownSeconds > 0
                                                                ? notifyCopy.notifyAgainIn(cooldownSeconds)
                                                                : notifyCopy.notifyShort}
                                                        </Text>
                                                    </Pressable>
                                                        );
                                                    })()
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {!loading && readyOrders.length === 0 && inDeliveryOrders.length === 0 && (
                        <View className="mt-20 items-center">
                            <Text className="text-6xl mb-4">📦</Text>
                            <Text className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                                All Clear!
                            </Text>
                            <Text className="text-sm text-center px-8" style={{ color: theme.colors.subtext }}>
                                No deliveries right now. New orders will appear here automatically.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
