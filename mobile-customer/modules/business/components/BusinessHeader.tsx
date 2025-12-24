import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Business } from '@/gql/graphql';

export function BusinessHeader({ business }: { business: Business }) {
    const theme = useTheme();

    return (
        <View className="w-full">
            {/* Business Image */}
            <View className="w-full h-64 bg-card">
                {business.imageUrl ? (
                    <Image source={{ uri: business.imageUrl }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <View className="w-full h-full items-center justify-center bg-card">
                        <Ionicons name="business" size={64} color={theme.colors.subtext} />
                    </View>
                )}
            </View>

            {/* Business Info */}
            <View className="px-4 py-6">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-foreground text-3xl font-bold flex-1">{business.name}</Text>
                    <View className={`px-3 py-1 rounded-full ${business.isOpen ? 'bg-income' : 'bg-expense'}`}>
                        <Text className="text-white text-sm font-semibold">{business.isOpen ? 'Open' : 'Closed'}</Text>
                    </View>
                </View>

                <Text className="text-subtext text-base mb-4 capitalize">{business.businessType}</Text>

                {/* Location */}
                <View className="flex-row items-center mb-3">
                    <Ionicons name="location" size={20} color={theme.colors.primary} />
                    <Text className="text-foreground text-sm ml-2 flex-1">{business.location.address}</Text>
                </View>

                {/* Working Hours */}
                <View className="flex-row items-center">
                    <Ionicons name="time" size={20} color={theme.colors.primary} />
                    <Text className="text-foreground text-sm ml-2">
                        {business.workingHours.opensAt} - {business.workingHours.closesAt}
                    </Text>
                </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-border mx-4" />
        </View>
    );
}
