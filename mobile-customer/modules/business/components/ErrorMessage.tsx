import React from 'react';
import { View, Text } from 'react-native';
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
            <Text className="text-subtext text-base mt-2 text-center">{message}</Text>
        </View>
    );
}
