import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type InfoBannerType = 'INFO' | 'WARNING' | 'SUCCESS';

interface InfoBannerProps {
    message: string;
    type?: InfoBannerType;
    onDismiss?: () => void;
}

const BANNER_STYLES = {
    INFO: {
        bg: 'bg-primary/10',
        border: 'border-primary/30',
        text: 'text-primary',
        icon: 'information-circle' as const,
        iconColor: '#7C3AED',
    },
    WARNING: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        icon: 'warning' as const,
        iconColor: '#fcd34d',
    },
    SUCCESS: {
        bg: 'bg-income/10',
        border: 'border-income/30',
        text: 'text-income',
        icon: 'checkmark-circle' as const,
        iconColor: '#22C55E',
    },
};

export default function InfoBanner({ message, type = 'INFO', onDismiss }: InfoBannerProps) {
    const style = BANNER_STYLES[type] || BANNER_STYLES.INFO;

    return (
        <View className={`mx-4 mt-2 px-4 py-3 rounded-xl border flex-row items-center ${style.bg} ${style.border}`}>
            <Ionicons name={style.icon} size={20} color={style.iconColor} />
            <Text className={`flex-1 ml-3 text-sm ${style.text}`}>{message}</Text>
            {onDismiss && (
                <Pressable onPress={onDismiss} hitSlop={8}>
                    <Ionicons name="close" size={18} color="#a1a1aa" />
                </Pressable>
            )}
        </View>
    );
}
