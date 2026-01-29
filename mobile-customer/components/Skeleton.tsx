import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const theme = useTheme();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: theme.colors.card,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function RestaurantCardSkeleton() {
    const theme = useTheme();

    return (
        <View className="mb-5">
            {/* Image */}
            <Skeleton width="100%" height={192} borderRadius={16} />

            {/* Content Card */}
            <View
                className="mt-[-16] pt-4 px-4 pb-4 rounded-2xl"
                style={{ backgroundColor: theme.colors.card }}
            >
                {/* Title and Time */}
                <View className="flex-row justify-between items-start mb-2">
                    <Skeleton width="60%" height={20} />
                    <Skeleton width={80} height={32} borderRadius={8} />
                </View>

                {/* Subtitle */}
                <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />

                {/* Metadata Row */}
                <View className="flex-row items-center gap-3">
                    <Skeleton width={60} height={14} />
                    <Skeleton width={40} height={14} />
                    <Skeleton width={50} height={14} />
                </View>
            </View>
        </View>
    );
}

export function ProductCardSkeleton() {
    return (
        <View className="mb-4">
            <View className="flex-row" style={{ minHeight: 112 }}>
                {/* Image */}
                <Skeleton width={112} height={112} borderRadius={16} style={{ marginRight: 12 }} />

                {/* Content */}
                <View className="flex-1 py-2">
                    <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
                    <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
                    <Skeleton width="60%" height={14} style={{ marginBottom: 12 }} />
                    <Skeleton width={80} height={24} />
                </View>
            </View>
        </View>
    );
}

export function BusinessHeaderSkeleton() {
    return (
        <View>
            {/* Hero Image */}
            <Skeleton width="100%" height={280} borderRadius={0} />

            {/* Content with spacing for products */}
            <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
                <Skeleton width="40%" height={28} style={{ marginBottom: 16 }} />
            </View>
        </View>
    );
}
