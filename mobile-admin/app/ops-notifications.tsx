import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { GET_NOTIFICATION_CAMPAIGNS, SEND_CAMPAIGN } from '@/graphql/misc';
import { formatRelativeTime } from '@/utils/helpers';

export default function OpsNotificationsScreen() {
    const theme = useTheme();
    const { data, loading, refetch } = useQuery(GET_NOTIFICATION_CAMPAIGNS);
    const [sendCampaign] = useMutation(SEND_CAMPAIGN);
    const campaigns = data?.notificationCampaigns || [];

    const handleSend = async (id: string) => {
        Alert.alert('Send Campaign', 'Are you sure you want to send this campaign?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send',
                onPress: async () => {
                    try {
                        await sendCampaign({ variables: { id } });
                        refetch();
                    } catch {
                        Alert.alert('Error', 'Failed to send campaign');
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <Stack.Screen
                options={{
                    title: 'Notification Campaigns',
                    headerShown: true,
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: theme.colors.text,
                }}
            />
            <FlatList
                data={campaigns}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                renderItem={({ item }) => (
                    <View className="rounded-xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                        <View className="flex-row items-start justify-between mb-2">
                            <Text className="text-sm font-semibold flex-1" style={{ color: theme.colors.text }}>
                                {item.title}
                            </Text>
                            <View className="px-2 py-0.5 rounded" style={{ backgroundColor: item.sentAt ? '#22c55e15' : '#f59e0b15' }}>
                                <Text className="text-[10px] font-semibold" style={{ color: item.sentAt ? '#22c55e' : '#f59e0b' }}>
                                    {item.sentAt ? 'Sent' : 'Draft'}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-xs mb-2" style={{ color: theme.colors.subtext }}>
                            {item.body}
                        </Text>
                        <View className="flex-row items-center justify-between">
                            <Text className="text-[10px]" style={{ color: theme.colors.subtext }}>
                                {item.sentAt ? `Sent ${formatRelativeTime(item.sentAt)}` : `Created ${formatRelativeTime(item.createdAt)}`}
                            </Text>
                            {!item.sentAt && (
                                <TouchableOpacity
                                    className="flex-row items-center px-3 py-1.5 rounded-lg"
                                    style={{ backgroundColor: `${theme.colors.primary}15` }}
                                    onPress={() => handleSend(item.id)}>
                                    <Ionicons name="send" size={12} color={theme.colors.primary} />
                                    <Text className="text-xs font-semibold ml-1" style={{ color: theme.colors.primary }}>
                                        Send
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="notifications-outline" size={40} color={theme.colors.subtext} />
                        <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>
                            No campaigns found
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
