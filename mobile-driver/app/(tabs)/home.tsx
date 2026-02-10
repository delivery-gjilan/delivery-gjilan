import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Modal, Pressable, Switch, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { ALL_ORDERS_UPDATED, GET_ORDERS, UPDATE_ORDER_STATUS } from '@/graphql/operations/orders';
import { Button } from '@/components/Button';
import { calculateRouteDistance } from '@/utils/mapbox';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();

    const isOnline = useAuthStore((state) => state.isOnline);
    const setOnline = useAuthStore((state) => state.setOnline);
    const [newOrder, setNewOrder] = useState<any | null>(null);
    const seenOrderIds = useRef<Set<string>>(new Set());
    const [orderDistances, setOrderDistances] = useState<Record<string, { distanceKm: number; durationMin: number }>>({});

    const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'network-only',
    });

    useSubscription(ALL_ORDERS_UPDATED, {
        onData: ({ client, data: subData }) => {
            if (subData?.data?.allOrdersUpdated) {
                const incomingOrders = subData.data.allOrdersUpdated as any[];
                const readyOrders = incomingOrders.filter((order: any) => order.status === 'READY');

                const unseenOrder = readyOrders.find((order: any) => !seenOrderIds.current.has(order.id));
                if (unseenOrder) {
                    seenOrderIds.current.add(unseenOrder.id);
                    setNewOrder(unseenOrder);
                }

                client.writeQuery({
                    query: GET_ORDERS,
                    data: { orders: incomingOrders },
                });
            }
        },
    });

    const [updateStatus, { loading: updating }] = useMutation(UPDATE_ORDER_STATUS);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const activeOrders = useMemo(() => {
        const orders = (data as any)?.orders || [];
        return orders.filter((order: any) =>
            order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
        );
    }, [data]);

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

    // Calculate distances for all active orders
    useEffect(() => {
        const calculateDistances = async () => {
            for (const order of activeOrders) {
                if (orderDistances[order.id]) continue; // Already calculated
                
                // Get first business location (pickup)
                const firstBusiness = order.businesses?.[0]?.business;
                if (!firstBusiness?.location) continue;
                
                console.log('Calculating distance for order:', order.id);
                console.log('Pickup location:', firstBusiness.location);
                console.log('Drop-off location:', order.dropOffLocation);
                
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
                    console.log('Distance result:', distance);
                    if (distance) {
                        setOrderDistances((prev) => ({
                            ...prev,
                            [order.id]: distance,
                        }));
                    }
                } catch (error) {
                    console.error('Error calculating distance:', error);
                }
            }
        };

        calculateDistances();
    }, [activeOrders.map((o: any) => o.id).join(',')]);

    const handleUpdate = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            await updateStatus({ variables: { id, status } });
            await refetch();
            if (status === 'OUT_FOR_DELIVERY') {
                const order = activeOrders.find((o: any) => o.id === id);
                if (order) {
                    await openNavigation(order);
                }
                router.push({ pathname: '/order-map', params: { orderId: id } });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingId(null);
        }
    };

    const businessNamesForOrder = (order: any) =>
        order.businesses.map((b: any) => b.business.name).join(', ');

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Modal
                visible={!!newOrder}
                transparent
                animationType="fade"
                onRequestClose={() => setNewOrder(null)}
            >
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className="w-[90%] rounded-3xl p-6" style={{ backgroundColor: theme.colors.card }}>
                        <Text className="text-xs uppercase tracking-wide mb-2" style={{ color: theme.colors.subtext }}>
                            New order
                        </Text>
                        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                            {newOrder ? businessNamesForOrder(newOrder) : ''}
                        </Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            Customer at {newOrder?.dropOffLocation?.address}
                        </Text>

                        <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.border }}>
                            <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                Distance
                            </Text>
                            <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                                {newOrder && orderDistances[newOrder.id]
                                    ? `${orderDistances[newOrder.id].distanceKm.toFixed(1)} km`
                                    : 'Calculating...'}
                            </Text>
                            <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                {newOrder && orderDistances[newOrder.id]
                                    ? `Estimated ${Math.round(orderDistances[newOrder.id].durationMin)} min`
                                    : 'Please wait...'}
                            </Text>
                        </View>

                        <View className="flex-row gap-3 mt-6">
                            <Pressable
                                className="flex-1 py-3 rounded-2xl items-center"
                                style={{ backgroundColor: theme.colors.border }}
                                onPress={() => setNewOrder(null)}
                            >
                                <Text style={{ color: theme.colors.text }} className="font-semibold">
                                    Dismiss
                                </Text>
                            </Pressable>
                            <Pressable
                                className="flex-1 py-3 rounded-2xl items-center"
                                style={{ backgroundColor: theme.colors.income }}
                                onPress={() => setNewOrder(null)}
                            >
                                <Text className="text-white font-semibold">View</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
                <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
                    <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                        Deliveries
                    </Text>
                    <View className="flex-row items-center gap-2">
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                        <Switch
                            value={isOnline}
                            onValueChange={setOnline}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
                        />
                    </View>
                </View>

                <View className="px-4 mt-4">
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

                    <View className="mt-4 space-y-3">
                        {activeOrders.map((order: any) => {
                            const businessNames = order.businesses
                                .map((b: any) => b.business.name)
                                .join(', ');
                            const totalItems = order.businesses.reduce(
                                (sum: number, b: any) => sum + b.items.reduce((s: number, i: any) => s + i.quantity, 0),
                                0
                            );

                            return (
                                <View
                                    key={order.id}
                                    className="bg-card rounded-2xl p-4 mb-3"
                                    style={{ borderColor: theme.colors.border, borderWidth: 1 }}
                                >
                                    <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                        {businessNames}
                                    </Text>
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                        {order.dropOffLocation.address}
                                    </Text>
                                    <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                        {totalItems} item{totalItems !== 1 ? 's' : ''} · Status: {order.status}
                                    </Text>
                                    {orderDistances[order.id] && (
                                        <Text className="text-xs mt-1 font-semibold" style={{ color: theme.colors.income }}>
                                            📍 {orderDistances[order.id].distanceKm.toFixed(1)} km · ~{Math.round(orderDistances[order.id].durationMin)} min
                                        </Text>
                                    )}

                                    <View className="flex-row gap-2 mt-3">
                                        {order.status === 'READY' && (
                                            <Button
                                                title="Start Delivery"
                                                size="sm"
                                                onPress={() => handleUpdate(order.id, 'OUT_FOR_DELIVERY')}
                                                loading={updating && updatingId === order.id}
                                            />
                                        )}
                                        {order.status === 'OUT_FOR_DELIVERY' && (
                                            <Button
                                                title="Mark Delivered"
                                                size="sm"
                                                variant="success"
                                                onPress={() => handleUpdate(order.id, 'DELIVERED')}
                                                loading={updating && updatingId === order.id}
                                            />
                                        )}
                                        <Button
                                            title="View Map"
                                            size="sm"
                                            variant="outline"
                                            onPress={() => router.push({ pathname: '/order-map', params: { orderId: order.id } })}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
