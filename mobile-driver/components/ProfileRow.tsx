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
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                {icon && (
                    <View style={{ marginRight: 12, width: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={icon} size={22} color={theme.colors.text} style={{ opacity: 0.5 }} />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 2 }}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                {showChevron && <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} style={{ opacity: 0.5 }} />}
            </TouchableOpacity>
            {showDivider && (
                <View
                    style={{
                        height: 1,
                        backgroundColor: theme.colors.subtext,
                        opacity: 0.1,
                        marginLeft: 20,
                    }}
                />
            )}
        </>
    );
}
