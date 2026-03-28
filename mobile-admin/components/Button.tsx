import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export function Button({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
    size = 'md',
    icon,
    style,
    textStyle,
}: ButtonProps) {
    const theme = useTheme();

    const bgColors = {
        primary: theme.colors.primary,
        secondary: theme.colors.card,
        danger: theme.colors.danger,
        ghost: 'transparent',
    };

    const textColors = {
        primary: '#ffffff',
        secondary: theme.colors.text,
        danger: '#ffffff',
        ghost: theme.colors.primary,
    };

    const paddings = {
        sm: 'py-2 px-3',
        md: 'py-3.5 px-5',
        lg: 'py-4 px-6',
    };

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    return (
        <TouchableOpacity
            className={`rounded-xl items-center justify-center flex-row ${paddings[size]}`}
            style={[
                {
                    backgroundColor: bgColors[variant],
                    opacity: disabled || loading ? 0.6 : 1,
                    borderWidth: variant === 'secondary' ? 1 : 0,
                    borderColor: theme.colors.border,
                },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}>
            {loading ? (
                <ActivityIndicator size="small" color={textColors[variant]} />
            ) : (
                <View className="flex-row items-center">
                    {icon && <Ionicons name={icon} size={size === 'sm' ? 14 : 18} color={textColors[variant]} style={{ marginRight: 6 }} />}
                    <Text
                        className={`font-semibold ${textSizes[size]}`}
                        style={[{ color: textColors[variant] }, textStyle]}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
