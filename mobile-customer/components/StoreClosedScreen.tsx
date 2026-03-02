import React from 'react';
import { View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Ionicons } from '@expo/vector-icons';

interface StoreClosedScreenProps {
    message?: string;
}

export default function StoreClosedScreen({ message }: StoreClosedScreenProps) {
    const { colors } = useTheme();
    const { t } = useTranslations();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View className="flex-1 items-center justify-center px-6">
                <View className="items-center mb-8">
                    <View className="bg-orange-500/20 p-6 rounded-full mb-4">
                        <Ionicons name="time-outline" size={64} color="#f97316" />
                    </View>
                    <Text className="text-foreground text-2xl font-bold text-center mb-3">
                        {t.store_closed.title}
                    </Text>
                    <Text className="text-subtext text-base text-center leading-6">
                        {message || t.store_closed.default_message}
                    </Text>
                </View>

                <View className="w-full max-w-md">
                    <View className="bg-card/50 border border-border rounded-xl p-4">
                        <Text className="text-subtext text-sm text-center">
                            {t.store_closed.info}
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
