import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import { useCartAnimationStore } from '../store/cartAnimationStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useEffect, useRef } from 'react';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const CartFloatingBar = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { total, count, isEmpty } = useCart();
    const { triggerCount } = useCartAnimationStore();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const colorAnim = useRef(new Animated.Value(0)).current;

    // Breathing animation
    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.03,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ]),
        );
        animation.start();
        return () => animation.stop();
    }, [scaleAnim]);

    // Color flash animation when items are added
    useEffect(() => {
        if (triggerCount === 0) return;
        
        Animated.sequence([
            Animated.timing(colorAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: false,
            }),
            Animated.timing(colorAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [triggerCount, colorAnim]);

    if (isEmpty) return null;

    // Get lighter version of primary color for flash effect
    const getLightColor = (hexColor: string) => {
        // Flash to lighter purple
        if (theme.dark === false && hexColor === '#7C3AED') {
            return '#A78BFA'; // violet-400 (accent color)
        }
        return '#DDD6FE'; // accent for any theme
    };

    const backgroundColor = colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.primary, getLightColor(theme.colors.primary)],
    });

    return (
        <AnimatedTouchable
            activeOpacity={0.9}
            onPress={() => router.push('/cart')}
            style={{ 
                transform: [{ scale: scaleAnim }],
            }}
        >
            <Animated.View 
                className="flex-row items-center justify-between p-4 rounded-2xl"
                style={{ backgroundColor: backgroundColor }}
            >
                <View className="flex-row items-center space-x-3 gap-3">
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                        <Text className="text-white font-bold">{count}</Text>
                    </View>
                    <Text className="text-white font-medium text-lg">{t.cart.view_cart}</Text>
                </View>
                <View className="flex-row items-center space-x-1">
                    <Text className="text-white font-bold text-lg">€{total.toFixed(2)}</Text>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
            </Animated.View>
        </AnimatedTouchable>
    );
};
