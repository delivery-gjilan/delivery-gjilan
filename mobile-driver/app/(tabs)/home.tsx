import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { ALL_ORDERS_UPDATED, GET_ORDERS, UPDATE_ORDER_STATUS } from '@/graphql/operations/orders';
import { Button } from '@/components/Button';
import { useDriverLocation } from '@/hooks/useDriverLocation';

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();

    useDriverLocation();
    const [newOrder, setNewOrder] = useState<any | null>(null);
    const seenOrderIds = useRef<Set<string>>(new Set());

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
            order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY'
        );
    }, [data]);

    const handleUpdate = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            await updateStatus({ variables: { id, status } });
            await refetch();
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
                                3.2 km
                            </Text>
                            <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                Estimated 8 min
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
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                        Deliveries
                    </Text>
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
