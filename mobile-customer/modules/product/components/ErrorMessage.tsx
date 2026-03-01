import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface ErrorMessageProps {
    message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="alert-circle" size={64} color={theme.colors.expense} />
            <Text className="text-foreground text-xl font-semibold mt-4 text-center">{t.common.oops_error}</Text>
            <Text className="text-subtext text-base mt-2 text-center mb-6">{message}</Text>
            <TouchableOpacity
                onPress={() => router.back()}
                className="px-6 py-3 rounded-xl"
                style={{ backgroundColor: theme.colors.primary }}
                activeOpacity={0.7}
            >
                <Text className="text-white font-semibold text-base">{t.common.go_back}</Text>
            </TouchableOpacity>
        </View>
    );
}
