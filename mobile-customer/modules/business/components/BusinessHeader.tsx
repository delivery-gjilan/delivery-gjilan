import React from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolate,
    SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Business } from '@/gql/graphql';
import { useRouter } from 'expo-router';

export function BusinessHeader({ business, scrollY }: { business: Business; scrollY?: SharedValue<number> }) {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Wolt-style constants
    const HERO_HEIGHT = 280;
    const COLLAPSED_HEIGHT = 90 + insets.top;
    const SCROLL_RANGE = HERO_HEIGHT - COLLAPSED_HEIGHT;

    // Hero container height - smoothly interpolates
    const headerAnimatedStyle = useAnimatedStyle(() => {
        if (!scrollY) return { height: HERO_HEIGHT };
        
        return {
            height: interpolate(
                scrollY.value,
                [0, SCROLL_RANGE],
                [HERO_HEIGHT, COLLAPSED_HEIGHT],
                Extrapolate.CLAMP
            ),
        };
    });

    // Dark overlay opacity
    const overlayAnimatedStyle = useAnimatedStyle(() => {
        if (!scrollY) return { opacity: 0 };
        
        return {
            opacity: interpolate(
                scrollY.value,
                [0, SCROLL_RANGE],
                [0, 0.65],
                Extrapolate.CLAMP
            ),
        };
    });

    // Large title in hero - moves up and fades
    const heroTitleAnimatedStyle = useAnimatedStyle(() => {
        if (!scrollY) return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
        
        return {
            opacity: interpolate(
                scrollY.value,
                [0, SCROLL_RANGE * 0.5],
                [1, 0],
                Extrapolate.CLAMP
            ),
            transform: [
                {
                    translateY: interpolate(
                        scrollY.value,
                        [0, SCROLL_RANGE],
                        [0, -50],
                        Extrapolate.CLAMP
                    ),
                },
                {
                    scale: interpolate(
                        scrollY.value,
                        [0, SCROLL_RANGE * 0.5],
                        [1, 0.85],
                        Extrapolate.CLAMP
                    ),
                },
            ],
        };
    });

    // Search bar - morphs from center to top and stays visible
    const searchBarAnimatedStyle = useAnimatedStyle(() => {
        if (!scrollY) return { opacity: 0, transform: [{ translateY: 0 }, { scale: 1 }] };
        
        return {
            opacity: interpolate(
                scrollY.value,
                [SCROLL_RANGE * 0.2, SCROLL_RANGE * 0.5],
                [0, 1],
                Extrapolate.CLAMP
            ),
            transform: [
                {
                    translateY: interpolate(
                        scrollY.value,
                        [0, SCROLL_RANGE],
                        [0, -80],
                        Extrapolate.CLAMP
                    ),
                },
                {
                    scale: interpolate(
                        scrollY.value,
                        [SCROLL_RANGE * 0.2, SCROLL_RANGE * 0.5],
                        [0.95, 1],
                        Extrapolate.CLAMP
                    ),
                },
            ],
        };
    });

    // Sticky top bar - fades in when collapsed
    const stickyBarAnimatedStyle = useAnimatedStyle(() => {
        if (!scrollY) return { opacity: 0, transform: [{ translateY: -10 }] };
        
        return {
            opacity: interpolate(
                scrollY.value,
                [SCROLL_RANGE * 0.7, SCROLL_RANGE],
                [0, 1],
                Extrapolate.CLAMP
            ),
            transform: [
                {
                    translateY: interpolate(
                        scrollY.value,
                        [SCROLL_RANGE * 0.7, SCROLL_RANGE],
                        [-10, 0],
                        Extrapolate.CLAMP
                    ),
                },
            ],
        };
    });

    return (
        <Animated.View style={[{ overflow: 'visible' }, headerAnimatedStyle]}>
            {/* Layer 1: Fixed Hero Image */}
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: HERO_HEIGHT,
                    overflow: 'hidden',
                }}
            >
                {business.imageUrl ? (
                    <Image
                        source={{ uri: business.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        className="w-full h-full items-center justify-center"
                        style={{ backgroundColor: theme.colors.card }}
                    >
                        <Ionicons name="restaurant-outline" size={64} color={theme.colors.subtext} />
                    </View>
                )}
            </View>

            {/* Layer 2: Dark Overlay */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: HERO_HEIGHT,
                        backgroundColor: '#000',
                    },
                    overlayAnimatedStyle,
                ]}
            />

            {/* Layer 3: Hero Title (Large) */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        bottom: 100,
                        left: 16,
                        right: 16,
                    },
                    heroTitleAnimatedStyle,
                ]}
            >
                <Text className="text-4xl font-bold text-white mb-2">{business.name}</Text>
                <Text className="text-base text-white/90 capitalize">
                    {business.businessType.toLowerCase().replace('_', ' ')}
                </Text>
            </Animated.View>

            {/* Layer 4: Search Bar - Positioned at Bottom of Hero */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        right: 16,
                    },
                    searchBarAnimatedStyle,
                ]}
            >
                <View
                    className="flex-row items-center px-4 py-3.5 rounded-xl"
                    style={{
                        backgroundColor: theme.colors.card,
                        ...(Platform.OS === 'ios' && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                        }),
                        ...(Platform.OS === 'android' && {
                            elevation: 4,
                        }),
                    }}
                >
                    <Ionicons name="search-outline" size={22} color={theme.colors.subtext} />
                    <Text className="ml-3 text-base" style={{ color: theme.colors.subtext }}>
                        Search menu items...
                    </Text>
                </View>
            </Animated.View>

            {/* Layer 5: Sticky Top Bar (Appears When Collapsed) */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: COLLAPSED_HEIGHT,
                        paddingTop: insets.top,
                        backgroundColor: theme.colors.card,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.background,
                        ...(Platform.OS === 'ios' && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                        }),
                        ...(Platform.OS === 'android' && {
                            elevation: 4,
                        }),
                    },
                    stickyBarAnimatedStyle,
                ]}
            >
                <View className="flex-1 flex-row items-center px-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.colors.background }}
                    >
                        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                    </TouchableOpacity>

                    <View className="flex-1">
                        <Text
                            className="text-lg font-bold"
                            style={{ color: theme.colors.text }}
                            numberOfLines={1}
                        >
                            {business.name}
                        </Text>
                    </View>

                    <View
                        className="px-2.5 py-1 rounded-md"
                        style={{ backgroundColor: business.isOpen ? '#10b981' : '#ef4444' }}
                    >
                        <Text className="text-white text-xs font-semibold">
                            {business.isOpen ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Floating Back Button (Always Visible Over Hero) */}
            <View
                style={{
                    position: 'absolute',
                    top: Math.max(insets.top + 12, 16),
                    left: 16,
                    zIndex: 100,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        ...(Platform.OS === 'ios' && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                        }),
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}
