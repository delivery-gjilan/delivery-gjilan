import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ORDER_STATUS_COLORS } from '@/utils/constants';

interface StatusBadgeProps {
    status: string;
    label?: string;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
    const color = ORDER_STATUS_COLORS[status] || '#6b7280';

    const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
    const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

    return (
        <View
            className={`rounded-full ${paddingClass} self-start`}
            style={{ backgroundColor: `${color}20` }}>
            <Text className={`font-semibold ${textClass}`} style={{ color }}>
                {label || status.replace(/_/g, ' ')}
            </Text>
        </View>
    );
}

interface FilterChipProps {
    label: string;
    active: boolean;
    onPress: () => void;
    color?: string;
    style?: ViewStyle;
}

export function FilterChip({ label, active, onPress, color, style }: FilterChipProps) {
    const theme = useTheme();
    const chipColor = color || theme.colors.primary;

    return (
        <TouchableOpacity
            className="rounded-full px-3 py-1.5 mr-2"
            style={[
                {
                    backgroundColor: active ? chipColor : theme.colors.card,
                    borderWidth: active ? 0 : 1,
                    borderColor: theme.colors.border,
                    shadowColor: active ? chipColor : '#000',
                    shadowOffset: { width: 0, height: active ? 2 : 1 },
                    shadowOpacity: active ? 0.25 : 0.05,
                    shadowRadius: active ? 3 : 2,
                    elevation: active ? 2 : 1,
                },
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.7}>
            <Text
                className="text-xs font-semibold"
                style={{ color: active ? '#ffffff' : theme.colors.text }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}
