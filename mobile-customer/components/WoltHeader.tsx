import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface WoltHeaderProps {
    cityName?: string;
    onPressProfile?: () => void;
    onPressCity?: () => void;
    onPressNotifications?: () => void;
}

export function WoltHeader({
    cityName = 'Gjilan',
    onPressProfile,
    onPressCity,
    onPressNotifications,
}: WoltHeaderProps) {
    const theme = useTheme();

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

            {/* City name */}
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

            {/* Notifications */}
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
        </View>
    );
}
