import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ProfileRowProps {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showChevron?: boolean;
    showDivider?: boolean;
}

export function ProfileRow({ title, subtitle, onPress, showChevron = true, showDivider = true }: ProfileRowProps) {
    const theme = useTheme();

    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={{
                    paddingVertical: 16,
                    paddingHorizontal: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <View style={{ flex: 1 }}>
                    <Text className="text-base" style={{ color: theme.colors.text }}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                {showChevron && <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} />}
            </TouchableOpacity>
            {showDivider && (
                <View
                    style={{
                        height: 1,
                        backgroundColor: theme.colors.subtext,
                        opacity: 0.1,
                    }}
                />
            )}
        </>
    );
}
