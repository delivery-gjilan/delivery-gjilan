import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface DiscoverSectionProps {
    title: string;
    onSeeAll?: () => void;
    seeAllLabel?: string;
    children: React.ReactNode;
}

export function DiscoverSection({
    title,
    onSeeAll,
    seeAllLabel,
    children,
}: DiscoverSectionProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const displaySeeAllLabel = seeAllLabel ?? t.home.see_all;

    return (
        <View style={{ marginBottom: 20 }}>
            {/* Section Header */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    marginBottom: 10,
                }}
            >
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>
                    {title}
                </Text>
                {onSeeAll && (
                    <TouchableOpacity 
                        onPress={onSeeAll} 
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                            backgroundColor: theme.colors.primary + '26',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>
                            {displaySeeAllLabel}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Horizontal Scroll Content */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 4 }}
            >
                {children}
            </ScrollView>
        </View>
    );
}
