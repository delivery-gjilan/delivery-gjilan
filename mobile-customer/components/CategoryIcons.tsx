import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Category {
    id: string;
    label: string;
    imageUrl: string;
    onPress?: () => void;
}

interface CategoryIconsProps {
    categories: Category[];
}

export function CategoryIcons({ categories }: CategoryIconsProps) {
    const theme = useTheme();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
        >
            {categories.map((cat) => (
                <TouchableOpacity
                    key={cat.id}
                    onPress={cat.onPress}
                    activeOpacity={0.7}
                    style={{ alignItems: 'center', width: 72 }}
                >
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: theme.colors.card,
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                            marginBottom: 6,
                        }}
                    >
                        <Image
                            source={{ uri: cat.imageUrl }}
                            style={{ width: 40, height: 40 }}
                            resizeMode="contain"
                        />
                    </View>
                    <Text
                        style={{
                            color: theme.colors.text,
                            fontSize: 11,
                            fontWeight: '500',
                            textAlign: 'center',
                        }}
                        numberOfLines={2}
                    >
                        {cat.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}
