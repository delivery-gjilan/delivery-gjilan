import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    color?: string;
    style?: ViewStyle;
}

export function StatCard({ title, value, subtitle, icon, color, style }: StatCardProps) {
    const theme = useTheme();

    return (
        <View
            className="rounded-2xl p-4 flex-1 min-w-[140px]"
            style={[{ backgroundColor: theme.colors.card }, style]}>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-medium" style={{ color: theme.colors.subtext }}>
                    {title}
                </Text>
                {icon && <View>{icon}</View>}
            </View>
            <Text
                className="text-2xl font-bold"
                style={{ color: color || theme.colors.text }}>
                {value}
            </Text>
            {subtitle && (
                <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}
