import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

interface Category {
    id: string;
    label: string;
    imageUrl: string;
    onPress?: () => void;
}

interface CategoryIconsProps {
    categories: Category[];
}

// Category-specific gradient colors for a modern look
const categoryGradients: Record<string, string[]> = {
    restaurants: ['#ff6b6b', '#ee5a52'],
    groceries: ['#51cf66', '#37b24d'],
    health: ['#4dabf7', '#339af0'],
    beauty: ['#cc5de8', '#be4bdb'],
    drinks: ['#ff922b', '#fd7e14'],
};

export function CategoryIcons({ categories }: CategoryIconsProps) {
    const theme = useTheme();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexGrow: 1, justifyContent: 'center' }}
        >
            {categories.map((cat) => {
                const gradientColors = categoryGradients[cat.id] || ['#868e96', '#495057'];
                
                return (
                    <TouchableOpacity
                        key={cat.id}
                        onPress={cat.onPress}
                        activeOpacity={0.8}
                        style={{ alignItems: 'center', width: 62 }}
                    >
                        <View
                            style={{
                                width: 54,
                                height: 54,
                                borderRadius: 16,
                                marginBottom: 6,
                                overflow: 'hidden',
                                ...(Platform.OS === 'ios' && {
                                    shadowColor: gradientColors[0],
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                }),
                                ...(Platform.OS === 'android' && {
                                    elevation: 4,
                                }),
                            }}
                        >
                            <LinearGradient
                                colors={gradientColors as [string, string, ...string[]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Image
                                    source={{ uri: cat.imageUrl }}
                                    style={{ width: 28, height: 28, tintColor: 'white' }}
                                    resizeMode="contain"
                                />
                            </LinearGradient>
                        </View>
                        <Text
                            style={{
                                color: theme.colors.text,
                                fontSize: 11,
                                fontWeight: '600',
                                textAlign: 'center',
                            }}
                            numberOfLines={2}
                        >
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}
