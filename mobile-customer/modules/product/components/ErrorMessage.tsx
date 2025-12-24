import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ErrorMessageProps {
    message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
    const theme = useTheme();

    return (
        <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="alert-circle" size={64} color={theme.colors.expense} />
            <Text className="text-foreground text-xl font-semibold mt-4 text-center">Oops! Something went wrong</Text>
            <Text className="text-subtext text-base mt-2 text-center mb-6">{message}</Text>
            <TouchableOpacity
                onPress={() => router.back()}
                className="px-6 py-3 rounded-xl"
                style={{ backgroundColor: theme.colors.primary }}
                activeOpacity={0.7}
            >
                <Text className="text-white font-semibold text-base">Go Back</Text>
            </TouchableOpacity>
        </View>
    );
}
