import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_GET_DRIVERS } from '@/graphql/operations/admin/drivers';
import { adminGetInitials } from '@/utils/adminHelpers';

export default function AdminDriversScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { data, loading, refetch }: any = useQuery(ADMIN_GET_DRIVERS);
    const drivers = data?.drivers || [];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <FlatList
                data={drivers}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                renderItem={({ item }: { item: any }) => {
                    const isOnline = item.driverConnection?.connectionStatus === 'CONNECTED';
                    const activeCount = item.activeOrders?.length || 0;
                    return (
                        <TouchableOpacity
                            className="flex-row items-center p-3.5 rounded-xl mb-2"
                            style={{ backgroundColor: theme.colors.card }}
                            onPress={() => router.push(`/admin/driver/${item.id}` as any)}
                            activeOpacity={0.7}>
                            <View
                                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                                style={{ backgroundColor: `${isOnline ? '#22c55e' : theme.colors.border}15` }}>
                                <Text className="text-sm font-bold" style={{ color: isOnline ? '#22c55e' : theme.colors.subtext }}>
                                    {adminGetInitials(item.firstName, item.lastName)}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {item.firstName} {item.lastName}
                                </Text>
                                <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>{item.email}</Text>
                            </View>
                            <View className="items-end">
                                <View className="flex-row items-center">
                                    <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }} />
                                    <Text className="text-xs font-medium" style={{ color: isOnline ? '#22c55e' : '#9ca3af' }}>
                                        {isOnline ? 'Online' : 'Offline'}
                                    </Text>
                                </View>
                                {activeCount > 0 && (
                                    <Text className="text-[10px] mt-1" style={{ color: theme.colors.primary }}>
                                        {activeCount} active
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="bicycle-outline" size={40} color={theme.colors.subtext} />
                        <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>No drivers found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
