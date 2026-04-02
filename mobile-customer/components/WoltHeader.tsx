import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export type WoltHeaderBannerType = 'INFO' | 'WARNING' | 'SUCCESS';

const BANNER_ICON: Record<WoltHeaderBannerType, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
    INFO:    { name: 'information-circle', color: '#a78bfa' },
    WARNING: { name: 'warning',            color: '#fcd34d' },
    SUCCESS: { name: 'checkmark-circle',   color: '#4ade80' },
};

interface WoltHeaderProps {
    cityName?: string;
    onPressProfile?: () => void;
    onPressCity?: () => void;
    onPressNotifications?: () => void;
    bannerMessage?: string | null;
    bannerType?: WoltHeaderBannerType;
}

export function WoltHeader({
    cityName = 'Gjilan',
    onPressProfile,
    onPressCity,
    onPressNotifications,
    bannerMessage,
    bannerType = 'INFO',
}: WoltHeaderProps) {
    const theme = useTheme();
    const bannerIcon = BANNER_ICON[bannerType] ?? BANNER_ICON.INFO;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 10,
            }}
        >
            {/* Profile icon */}
            <Pressable
                onPress={onPressProfile}
                style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: pressed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                })}
            >
                <Ionicons name="person-outline" size={20} color="#fff" />
            </Pressable>

            {/* Center: banner or city name */}
            {bannerMessage ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 6 }}>
                    <Ionicons name={bannerIcon.name} size={15} color={bannerIcon.color} />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                        {bannerMessage}
                    </Text>
                </View>
            ) : (
                <Pressable
                    onPress={onPressCity}
                    style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        opacity: pressed ? 0.7 : 1,
                    })}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                        {cityName}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#fff" />
                </Pressable>
            )}

            {/* Notifications */}
            {!!onPressNotifications && (
            <Pressable
                onPress={onPressNotifications}
                style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: pressed ? 'rgba(255,255,255,0.15)' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                })}
            >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
            </Pressable>
            )}
        </View>
    );
}
