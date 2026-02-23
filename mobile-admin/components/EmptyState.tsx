import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon = 'document-text-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
    const theme = useTheme();

    return (
        <View className="flex-1 items-center justify-center py-12 px-6">
            <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                style={{ backgroundColor: `${theme.colors.primary}15` }}>
                <Ionicons name={icon} size={28} color={theme.colors.primary} />
            </View>
            <Text className="text-lg font-semibold text-center mb-1" style={{ color: theme.colors.text }}>
                {title}
            </Text>
            {message && (
                <Text className="text-sm text-center" style={{ color: theme.colors.subtext }}>
                    {message}
                </Text>
            )}
            {actionLabel && onAction && (
                <TouchableOpacity
                    className="mt-4 px-5 py-2.5 rounded-xl"
                    style={{ backgroundColor: theme.colors.primary }}
                    onPress={onAction}>
                    <Text className="text-white font-semibold text-sm">{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
