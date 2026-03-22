import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_GET_BUSINESSES } from '@/graphql/operations/admin/businesses';
import { adminGetInitials } from '@/utils/adminHelpers';

export default function AdminBusinessesScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { data, loading, refetch }: any = useQuery(ADMIN_GET_BUSINESSES);
    const businesses = data?.businesses || [];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <FlatList
                data={businesses}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                renderItem={({ item }: { item: any }) => {
                    const isOpen = item.isOpen ?? true;
                    return (
                        <TouchableOpacity
                            className="flex-row items-center p-3.5 rounded-xl mb-2"
                            style={{ backgroundColor: theme.colors.card }}
                            onPress={() => router.push(`/admin/business/${item.id}` as any)}
                            activeOpacity={0.7}>
                            <View
                                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                                style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                <Text className="text-sm font-bold" style={{ color: theme.colors.primary }}>
                                    {adminGetInitials(item.name)}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>{item.name}</Text>
                                {item.address && (
                                    <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                                        {item.address}
                                    </Text>
                                )}
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: isOpen ? '#22c55e' : '#ef4444' }} />
                                <Ionicons name="chevron-forward" size={14} color={theme.colors.subtext} />
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="business-outline" size={40} color={theme.colors.subtext} />
                        <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>No businesses found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
