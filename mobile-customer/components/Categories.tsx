import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface Category {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress?: () => void;
}

export function Categories() {
    const theme = useTheme();

    const categories: Category[] = [
        {
            id: '1',
            name: 'Restaurants',
            icon: 'restaurant',
            color: '#8B4513',
            onPress: () => console.log('Restaurants'),
        },
        {
            id: '2',
            name: 'Groceries',
            icon: 'nutrition',
            color: '#228B22',
            onPress: () => console.log('Groceries'),
        },
        {
            id: '3',
            name: 'Health & Wellbeing',
            icon: 'medical',
            color: '#DC143C',
            onPress: () => console.log('Health'),
        },
        {
            id: '4',
            name: 'Beauty & Care',
            icon: 'color-wand',
            color: '#6A5ACD',
            onPress: () => console.log('Beauty'),
        },

    ];

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
            {categories.map((category) => (
                <TouchableOpacity
                    key={category.id}
                    onPress={category.onPress}
                    activeOpacity={0.7}
                    style={{
                        alignItems: 'center',
                        width: 80,
                    }}
                >
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            backgroundColor: category.color,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 8,
                        }}
                    >
                        <Ionicons name={category.icon} size={32} color="#fff" />
                    </View>
                    <Text
                        className="text-xs text-center font-medium"
                        style={{ color: theme.colors.text }}
                        numberOfLines={2}
                    >
                        {category.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}
