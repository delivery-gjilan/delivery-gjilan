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
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        icon: 'information-circle' as const,
        iconColor: '#93c5fd',
    },
    WARNING: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        icon: 'warning' as const,
        iconColor: '#fcd34d',
    },
    SUCCESS: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        icon: 'checkmark-circle' as const,
        iconColor: '#6ee7b7',
    },
};

export default function InfoBanner({ message, type = 'INFO', onDismiss }: InfoBannerProps) {
    const style = BANNER_STYLES[type] || BANNER_STYLES.INFO;

    return (
        <View className={`mx-4 mt-2 px-4 py-3 rounded-xl border flex-row items-center ${style.bg} ${style.border}`}>
            <Ionicons name={style.icon} size={20} color={style.iconColor} />
            <Text className={`flex-1 ml-3 text-sm font-medium ${style.text}`}>{message}</Text>
            {onDismiss && (
                <Pressable onPress={onDismiss} hitSlop={8}>
                    <Ionicons name="close" size={18} color="#9ca3af" />
                </Pressable>
            )}
        </View>
    );
}
