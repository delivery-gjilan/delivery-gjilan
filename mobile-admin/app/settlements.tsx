import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { GET_SETTLEMENTS, MARK_SETTLEMENT_PAID } from '@/graphql/misc';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function SettlementsScreen() {
    const theme = useTheme();
    const { data, loading, refetch }: any = useQuery(GET_SETTLEMENTS, { variables: { limit: 200 } });
    const [markPaid] = useMutation(MARK_SETTLEMENT_PAID);
    const settlements = data?.settlements || [];

    const handleMarkPaid = async (id: string) => {
        Alert.alert('Mark as Paid', 'Confirm this settlement has been paid?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm',
                onPress: async () => {
                    try {
                        await markPaid({ variables: { settlementId: id } });
                        refetch();
                    } catch {
                        Alert.alert('Error', 'Failed to mark settlement as paid');
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Stack.Screen options={{ title: 'Settlements', headerShown: true, headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text }} />
            <FlatList
                data={settlements}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                renderItem={({ item }: { item: any }) => (
                    <View className="rounded-xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                {item.business?.name || 'Settlement'}
                            </Text>
                            <View className="px-2 py-0.5 rounded" style={{ backgroundColor: item.paidAt ? '#22c55e15' : '#ef444415' }}>
                                <Text className="text-[10px] font-semibold" style={{ color: item.paidAt ? '#22c55e' : '#ef4444' }}>
                                    {item.paidAt ? 'Paid' : 'Unpaid'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                    {formatCurrency(item.amount)}
                                </Text>
                                <Text className="text-[10px] mt-0.5" style={{ color: theme.colors.subtext }}>
                                    Created: {formatDate(item.createdAt)}
                                </Text>
                            </View>
                            {!item.paidAt && (
                                <TouchableOpacity
                                    className="flex-row items-center px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: `${theme.colors.primary}15` }}
                                    onPress={() => handleMarkPaid(item.id)}>
                                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                                    <Text className="text-xs font-semibold ml-1" style={{ color: theme.colors.primary }}>
                                        Mark Paid
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="wallet-outline" size={40} color={theme.colors.subtext} />
                        <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>No settlements found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
