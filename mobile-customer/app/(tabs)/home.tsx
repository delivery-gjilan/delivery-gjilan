import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore - expo-router types
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useBusinesses } from '@/hooks/useBusinesses';

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { businesses, loading, error } = useBusinesses();

    const handleBusinessPress = (businessId: string) => {
        router.push(`/`);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1">
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                        {t.home.title || 'Restaurants'}
                    </Text>
                    <Text className="text-base mt-1" style={{ color: theme.colors.subtext }}>
                        {t.home.subtitle || 'Choose from our partners'}
                    </Text>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : error ? (
                    <View className="flex-1 justify-center items-center px-4">
                        <Text style={{ color: theme.colors.text }}>Error loading restaurants</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            {(error as any).message || 'Something went wrong'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={businesses}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleBusinessPress(item.id)}
                                className="rounded-lg overflow-hidden mb-4"
                                style={{ backgroundColor: theme.colors.card }}
                            >
                                <View className="aspect-video bg-gray-200 justify-center items-center">
                                    {item.imageUrl ? (
                                        <Text>{item.name}</Text>
                                    ) : (
                                        <Text style={{ color: theme.colors.subtext }}>
                                            {item.name}
                                        </Text>
                                    )}
                                </View>
                                <View className="p-3">
                                    <Text
                                        className="text-lg font-semibold"
                                        style={{ color: theme.colors.text }}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                                        {item.businessType}
                                    </Text>
                                    <View className="flex-row mt-2 items-center">
                                        <View
                                            className="w-2 h-2 rounded-full mr-2"
                                            style={{
                                                backgroundColor: item.isOpen
                                                    ? '#10b981'
                                                    : '#ef4444',
                                            }}
                                        />
                                        <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                            {item.isOpen ? 'Open' : 'Closed'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
