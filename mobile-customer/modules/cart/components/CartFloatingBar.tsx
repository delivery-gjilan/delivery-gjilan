import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import { useCartAnimationStore } from '../store/cartAnimationStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';
import { useEffect, useRef, useState } from 'react';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withRepeat,
    withDelay,
    Easing,
    interpolateColor,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const CartFloatingBar = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { total, count, isEmpty } = useCart();
    const { triggerCount } = useCartAnimationStore();
    const successModalVisible = useSuccessModalStore((state) => state.visible);
    const successModalType = useSuccessModalStore((state) => state.type);
    const suppressCartBarUntil = useSuccessModalStore((state) => state.suppressCartBarUntil);
    const [isPostSuccessCooldownActive, setIsPostSuccessCooldownActive] = useState(false);
    const mountTriggerCount = useRef(triggerCount);

    // Slide-up entrance / slide-down exit
    const translateY = useSharedValue(80);
    const opacity = useSharedValue(0);
    const breatheScale = useSharedValue(1);

    // Color flash (0 = normal, 1 = light flash)
    const flashProgress = useSharedValue(0);

    // Appear on mount + start breathing after entrance
    useEffect(() => {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
        breatheScale.value = withDelay(
            300,
            withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 900, easing: Easing.inOut(Easing.quad) }),
                    withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
                ),
                -1,
                false,
            ),
        );
    }, []);

    // Color flash when items are added (not on mount)
    useEffect(() => {
        if (triggerCount === 0 || triggerCount === mountTriggerCount.current) return;
        flashProgress.value = withSequence(
            withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
        );
    }, [triggerCount]);

    useEffect(() => {
        const remainingMs = suppressCartBarUntil - Date.now();
        if (remainingMs <= 0) {
            setIsPostSuccessCooldownActive(false);
            return;
        }

        setIsPostSuccessCooldownActive(true);
        const timeoutId = setTimeout(() => {
            setIsPostSuccessCooldownActive(false);
        }, remainingMs);

        return () => clearTimeout(timeoutId);
    }, [suppressCartBarUntil]);

    const wrapperStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }, { scale: breatheScale.value }],
    }));

    const flashStyle = useAnimatedStyle(() => {
        const lightColor = theme.dark === false ? '#A78BFA' : '#DDD6FE';
        return {
            backgroundColor: interpolateColor(
                flashProgress.value,
                [0, 1],
                [theme.colors.primary, lightColor],
            ),
        };
    });

    const hideForSuccessTransition =
        (successModalVisible && successModalType === 'order_created') ||
        isPostSuccessCooldownActive;

    if (isEmpty || hideForSuccessTransition) return null;

    return (
        <AnimatedTouchable
            activeOpacity={0.9}
            onPress={() => router.push('/cart')}
            style={wrapperStyle}
        >
            <Animated.View
                className="flex-row items-center justify-between p-4 rounded-2xl"
                style={flashStyle}
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
