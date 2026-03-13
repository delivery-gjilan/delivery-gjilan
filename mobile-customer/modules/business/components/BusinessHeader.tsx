import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';

export const HERO_HEIGHT = 220;
const LOGO_SIZE = 80;
const LOGO_OVERLAP = LOGO_SIZE / 2;

export function BusinessHeader({ business, scrollY }: { business: Partial<Business>; scrollY?: SharedValue<number> }) {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Parallax on the image
    const imageStyle = useAnimatedStyle(() => {
        const translateY = scrollY
            ? interpolate(scrollY.value, [-100, 0, HERO_HEIGHT], [-30, 0, HERO_HEIGHT * 0.35], Extrapolate.CLAMP)
            : 0;
        const scale = scrollY
            ? interpolate(scrollY.value, [-200, 0], [1.4, 1], Extrapolate.CLAMP)
            : 1;
        return {
            transform: [
                { translateY },
                { scale },
            ],
        } as any;
    }) as any;

    return (
        <View style={{ height: HERO_HEIGHT + LOGO_OVERLAP, overflow: 'visible' }}>
            {/* Hero image container */}
            <View style={{ height: HERO_HEIGHT, overflow: 'hidden' }}>
                {/* Parallax Image */}
                <Animated.View style={[{ position: 'absolute', top: -30, left: 0, right: 0, bottom: -30 }, imageStyle as any]}>
                    {business.imageUrl ? (
                        <Image
                            source={{ uri: business.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card }}>
                            <Ionicons name="restaurant-outline" size={64} color={theme.colors.subtext} />
                        </View>
                    )}
                </Animated.View>

                {/* Bottom gradient */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.45)']}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_HEIGHT * 0.55 }}
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
                        backgroundColor: '#fff',
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
                        <Image
                            source={{ uri: business.imageUrl }}
                            style={{ width: LOGO_SIZE - 8, height: LOGO_SIZE - 8, borderRadius: 14 }}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="restaurant" size={36} color={theme.colors.subtext} />
                    )}
                </View>
            </View>
        </View>
    );
}
