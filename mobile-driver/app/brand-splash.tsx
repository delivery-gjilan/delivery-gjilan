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
import { useAuthStore } from '@/store/authStore';

export default function BrandSplashScreen() {
    const router = useRouter();
    const theme = useTheme();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const logoScale = useSharedValue(0.3);
    const logoOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const progressWidth = useSharedValue(0);

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/login');
            return;
        }

        logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
        logoOpacity.value = withTiming(1, { duration: 450 });
        textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

        progressWidth.value = withDelay(
            200,
            withTiming(100, {
                duration: 1200,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }),
        );

        const timer = setTimeout(() => {
            router.replace('/(tabs)/drive');
        }, 1450);

        return () => clearTimeout(timer);
    }, [isAuthenticated, logoOpacity, logoScale, progressWidth, router, textOpacity]);

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
                    <Image
                        source={require('@/assets/images/icon.png')}
                        style={{ width: 80, height: 80, borderRadius: 16 }}
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>

            <Animated.View style={textStyle}>
                <Text
                    style={{
                        color: 'white',
                        fontSize: 26,
                        fontWeight: '700',
                        textAlign: 'center',
                        marginBottom: 6,
                    }}
                >
                    Zipp Driver
                </Text>
                <Text
                    style={{
                        color: 'rgba(255,255,255,0.78)',
                        fontSize: 14,
                        textAlign: 'center',
                    }}
                >
                    Getting your map ready
                </Text>
            </Animated.View>

            <Animated.View
                style={[
                    textStyle,
                    {
                        position: 'absolute',
                        bottom: 88,
                        left: 48,
                        right: 48,
                    },
                ]}
            >
                <View
                    style={{
                        height: 3,
                        backgroundColor: 'rgba(255,255,255,0.25)',
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
