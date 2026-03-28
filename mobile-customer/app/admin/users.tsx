import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_GET_USERS } from '@/graphql/operations/admin/users';
import { adminGetInitials } from '@/utils/adminHelpers';

export default function AdminUsersScreen() {
    const theme = useTheme();
    const { data, loading, refetch }: any = useQuery(ADMIN_GET_USERS);
    const users = data?.users || [];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <FlatList
                data={users}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                renderItem={({ item }: { item: any }) => (
                    <View className="flex-row items-center p-3.5 rounded-xl mb-2" style={{ backgroundColor: theme.colors.card }}>
                        <View
                            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                            style={{ backgroundColor: `${theme.colors.primary}15` }}>
                            <Text className="text-sm font-bold" style={{ color: theme.colors.primary }}>
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
                            <Text
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                {item.role}
                            </Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="people-outline" size={40} color={theme.colors.subtext} />
                        <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>No users found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
