import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_GET_BUSINESS } from '@/graphql/operations/admin/businesses';
import { adminGetInitials } from '@/utils/adminHelpers';

export default function AdminBusinessDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { businessId } = useLocalSearchParams<{ businessId: string }>();

    const { data }: any = useQuery(ADMIN_GET_BUSINESS, { variables: { id: businessId }, skip: !businessId });
    const business = data?.business;

    if (!business) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
                <Text style={{ color: theme.colors.subtext }}>Business not found</Text>
            </SafeAreaView>
        );
    }

    const isOpen = business.isOpen ?? true;
    // location can be nested or flat
    const latitude = business.location?.latitude ?? business.latitude;
    const longitude = business.location?.longitude ?? business.longitude;

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Profile */}
                <View className="items-center pt-6 pb-4">
                    <View
                        className="w-20 h-20 rounded-3xl items-center justify-center mb-3"
                        style={{ backgroundColor: `${theme.colors.primary}20` }}>
                        <Text className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                            {adminGetInitials(business.name)}
                        </Text>
                    </View>
                    <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>{business.name}</Text>
                    {business.description && (
                        <Text className="text-sm mt-1 text-center px-8" style={{ color: theme.colors.subtext }}>
                            {business.description}
                        </Text>
                    )}
                    <View className="flex-row items-center mt-2">
                        <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: isOpen ? '#22c55e' : '#ef4444' }} />
                        <Text className="text-xs font-medium" style={{ color: isOpen ? '#22c55e' : '#ef4444' }}>
                            {isOpen ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>

                {/* Address */}
                {business.address && (
                    <View className="mx-4 rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="location" size={16} color={theme.colors.primary} />
                            <Text className="text-sm font-semibold ml-2" style={{ color: theme.colors.text }}>Address</Text>
                        </View>
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>{business.address}</Text>
                    </View>
                )}

                {/* Phone */}
                {business.phone && (
                    <TouchableOpacity
                        className="mx-4 rounded-2xl p-4 mb-3 flex-row items-center"
                        style={{ backgroundColor: theme.colors.card }}
                        onPress={() => Linking.openURL(`tel:${business.phone}`)}>
                        <View className="flex-1">
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="call" size={16} color="#22c55e" />
                                <Text className="text-sm font-semibold ml-2" style={{ color: theme.colors.text }}>Phone</Text>
                            </View>
                            <Text className="text-sm" style={{ color: theme.colors.subtext }}>{business.phone}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} />
                    </TouchableOpacity>
                )}

                {/* Coordinates */}
                {latitude && longitude && (
                    <View className="mx-4 rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="navigate" size={16} color="#3b82f6" />
                            <Text className="text-sm font-semibold ml-2" style={{ color: theme.colors.text }}>Coordinates</Text>
                        </View>
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                        </Text>
                    </View>
                )}

                {/* Categories */}
                {business.categories?.length > 0 && (
                    <View className="mx-4 rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                        <Text className="text-sm font-semibold mb-3" style={{ color: theme.colors.text }}>
                            Categories ({business.categories.length})
                        </Text>
                        {business.categories.map((cat: any, i: number) => (
                            <View
                                key={cat.id ?? i}
                                className="flex-row items-center py-2"
                                style={{ borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                                <Text className="text-sm flex-1" style={{ color: theme.colors.text }}>{cat.name}</Text>
                                <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                    {cat.products?.length || 0} products
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
