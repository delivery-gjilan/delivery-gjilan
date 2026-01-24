import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface WoltHeaderProps {
    location?: string;
    onPressLocation?: () => void;
    onPressProfile?: () => void;
    onPressNotifications?: () => void;
}

export function WoltHeader({
    location = 'Pristina',
    onPressLocation,
    onPressProfile,
    onPressNotifications,
}: WoltHeaderProps) {
    const theme = useTheme();

    return (
        <View className="flex-row items-center justify-between px-4 py-3">
            {/* Left: Profile/Menu Button */}
            <Pressable
                onPress={onPressProfile}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={({ pressed }) => ({
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                })}
            >
                <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
            </Pressable>

            {/* Center: Location Selector */}
            <Pressable
                onPress={onPressLocation}
                className="flex-1 items-center justify-center mx-4"
                style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                })}
            >
                <View className="flex-row items-center gap-1">
                    <Text className="text-base font-medium" style={{ color: '#FFFFFF' }}>
                        {location}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                </View>
            </Pressable>

            {/* Right: Notifications Button */}
            <Pressable
                onPress={onPressNotifications}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={({ pressed }) => ({
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                })}
            >
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </Pressable>
        </View>
    );
}
