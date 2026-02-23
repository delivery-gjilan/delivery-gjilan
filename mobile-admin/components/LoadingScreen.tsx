import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface LoadingScreenProps {
    message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
    const theme = useTheme();

    return (
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.colors.background }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            {message && (
                <Text className="text-sm mt-4" style={{ color: theme.colors.subtext }}>
                    {message}
                </Text>
            )}
        </View>
    );
}
