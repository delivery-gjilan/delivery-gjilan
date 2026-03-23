import React, { useEffect } from 'react';
import { View, Text, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

/**
 * Brand splash screen shown after login/signup before entering the app.
 * Placeholder for brand identity — customize the logo, colors, and messaging here.
 * Background work (pre-fetching, cache warming, etc.) can run during this screen.
 */
export default function BrandSplashScreen() {
    const router = useRouter();
    const theme = useTheme();

    const logoScale = useSharedValue(0.3);
    const logoOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const progressWidth = useSharedValue(0);

    useEffect(() => {
        // Animate logo entrance
        logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
        logoOpacity.value = withTiming(1, { duration: 600 });

        // Animate text after logo
        textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

        // Progress bar animation
        progressWidth.value = withDelay(
            200,
            withTiming(100, {
                duration: 2200,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }),
        );

        // TODO: Run any background initialization tasks here
        // e.g., prefetch user data, warm caches, sync preferences

        // Navigate to home after the splash
        const timer = setTimeout(() => {
            router.replace('/(tabs)/home');
        }, 2800);

        return () => clearTimeout(timer);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
        opacity: logoOpacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%` as any,
    }));

    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.primary,
            }}
        >
            <StatusBar barStyle="light-content" />

            {/* Logo Container */}
            <Animated.View style={logoStyle}>
                <View
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 32,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                    }}
                >
                    {/* Replace with your brand logo/icon */}
                    <Image
                        source={require('@/assets/images/icon.png')}
                        style={{ width: 80, height: 80, borderRadius: 16 }}
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>

            {/* App Name & Tagline */}
            <Animated.View style={textStyle}>
                <Text
                    style={{
                        color: 'white',
                        fontSize: 28,
                        fontWeight: '700',
                        textAlign: 'center',
                        marginBottom: 6,
                    }}
                >
                    Zipp Go
                </Text>
                <Text
                    style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 16,
                        textAlign: 'center',
                    }}
                >
                    Your favorite food, delivered
                </Text>
            </Animated.View>

            {/* Progress Bar */}
            <Animated.View
                style={[
                    textStyle,
                    {
                        position: 'absolute',
                        bottom: 80,
                        left: 48,
                        right: 48,
                    },
                ]}
            >
                <View
                    style={{
                        height: 3,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}
                >
                    <Animated.View
                        style={[
                            progressBarStyle,
                            {
                                height: 3,
                                backgroundColor: 'white',
                                borderRadius: 2,
                            },
                        ]}
                    />
                </View>
            </Animated.View>
        </View>
    );
}
