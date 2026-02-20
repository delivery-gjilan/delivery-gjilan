import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ProfileRowProps {
    title: string;
    subtitle?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    showChevron?: boolean;
    showDivider?: boolean;
}

export function ProfileRow({ title, subtitle, icon, onPress, showChevron = true, showDivider = true }: ProfileRowProps) {
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
                {icon && (
                    <View style={{ marginRight: 12 }}>
                        <Ionicons name={icon} size={22} color={theme.colors.primary} />
                    </View>
                )}
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
