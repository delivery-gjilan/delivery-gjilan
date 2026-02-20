import React from 'react';
import { View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface StoreClosedScreenProps {
    message?: string;
}

export default function StoreClosedScreen({ message }: StoreClosedScreenProps) {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View className="flex-1 items-center justify-center px-6">
                <View className="items-center mb-8">
                    <View className="bg-orange-500/20 p-6 rounded-full mb-4">
                        <Ionicons name="time-outline" size={64} color="#f97316" />
                    </View>
                    <Text className="text-white text-2xl font-bold text-center mb-3">
                        Store Temporarily Closed
                    </Text>
                    <Text className="text-neutral-400 text-base text-center leading-6">
                        {message || "We are too busy at the moment. Please come back later!"}
                    </Text>
                </View>

                <View className="w-full max-w-md">
                    <View className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <Text className="text-neutral-300 text-sm text-center">
                            We&apos;ll be back soon! Check back in a few minutes.
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
