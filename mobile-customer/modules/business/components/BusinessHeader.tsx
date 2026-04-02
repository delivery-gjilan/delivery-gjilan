import React, { useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolate,
    SharedValue,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Business } from '@/gql/graphql';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export const HERO_HEIGHT = 260;
const LOGO_SIZE = 80;
const LOGO_OVERLAP = LOGO_SIZE / 2;

export function BusinessHeader({ business, scrollY }: { business: Partial<Business>; scrollY?: SharedValue<number> }) {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Mount zoom-in for hero image (Wolt-style entrance)
    const mountScale = useSharedValue(1.12);
    useEffect(() => {
        mountScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    }, []);

    const mountStyle = useAnimatedStyle(() => ({
        transform: [{ scale: mountScale.value }],
    }));

    // Parallax on the image
    const imageStyle = useAnimatedStyle(() => {
        const translateY = scrollY
            ? interpolate(scrollY.value, [-100, 0, HERO_HEIGHT], [-40, 0, HERO_HEIGHT * 0.4], Extrapolate.CLAMP)
            : 0;
        const scale = scrollY
            ? interpolate(scrollY.value, [-200, 0], [1.3, 1], Extrapolate.CLAMP)
            : 1;
        return {
            transform: [
                { translateY },
                { scale },
            ],
        } as any;
    }) as any;

    return (
        <View style={{ height: HERO_HEIGHT + LOGO_OVERLAP, overflow: 'visible', backgroundColor: theme.colors.background }}>
            {/* Hero image container */}
            <View style={{ height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: theme.colors.card }}>
                {/* Parallax Image */}
                <Animated.View style={[{ position: 'absolute', top: -40, left: 0, right: 0, bottom: -40 }, imageStyle as any, mountStyle]}>
                    {business.imageUrl ? (
                        <ExpoImage
                            source={{ uri: business.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            transition={300}
                            placeholder={null}
                        />
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card }}>
                            <Ionicons name="restaurant-outline" size={64} color={theme.colors.subtext} />
                        </View>
                    )}
                </Animated.View>

                {/* Top gradient — status bar legibility */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent']}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 60 }}
                />

                {/* Bottom gradient — bleeds into content below */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)', theme.colors.background]}
                    locations={[0, 0.6, 1]}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_HEIGHT * 0.65 }}
                />

                {/* Floating Back Button */}
                <View style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                        style={{
                            width: 38, height: 38, borderRadius: 19,
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Floating Heart Button */}
                <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 10 }}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={{
                            width: 38, height: 38, borderRadius: 19,
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="heart-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Centered Logo – overlaps the hero bottom edge */}
            <View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    zIndex: 20,
                }}
            >
                <View
                    style={{
                        width: LOGO_SIZE,
                        height: LOGO_SIZE,
                        borderRadius: 18,
                        backgroundColor: theme.colors.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        elevation: 6,
                    }}
                >
                    {business.imageUrl ? (
                        <ExpoImage
                            source={{ uri: business.imageUrl }}
                            style={{ width: LOGO_SIZE - 8, height: LOGO_SIZE - 8, borderRadius: 14 }}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <Ionicons name="restaurant" size={36} color={theme.colors.subtext} />
                    )}
                </View>
            </View>
        </View>
    );
}
