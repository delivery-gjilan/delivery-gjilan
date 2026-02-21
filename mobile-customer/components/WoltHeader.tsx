import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WoltHeaderProps {
    onPressNotifications?: () => void;
}

export function WoltHeader({
    onPressNotifications,
}: WoltHeaderProps) {
    return (
        <View className="flex-row items-center justify-end px-4 py-3">
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
