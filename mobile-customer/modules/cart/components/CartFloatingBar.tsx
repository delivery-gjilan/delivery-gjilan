import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import { useCartAnimationStore } from '../store/cartAnimationStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useEffect, useRef, useState } from 'react';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const CartFloatingBar = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { total, count, isEmpty } = useCart();
    const { triggerCount } = useCartAnimationStore();
    const colorAnim = useRef(new Animated.Value(0)).current;
    const [isFlashing, setIsFlashing] = useState(false);
    const mountTriggerCount = useRef(triggerCount); // capture value at mount — don't flash for it

    // Color flash animation when items are added (not on initial mount)
    useEffect(() => {
        if (triggerCount === 0 || triggerCount === mountTriggerCount.current) return;
        setIsFlashing(true);
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
        ]).start(() => {
            setIsFlashing(false);
            colorAnim.setValue(0);
        });
    }, [triggerCount]);

    if (isEmpty) return null;

    // Get lighter version of primary color for flash effect
    const getLightColor = (hexColor: string) => {
        if (theme.dark === false && hexColor === '#7C3AED') return '#A78BFA';
        return '#DDD6FE';
    };

    const flashBackgroundColor = colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.primary, getLightColor(theme.colors.primary)],
    });

    return (
        <AnimatedTouchable
            activeOpacity={0.9}
            onPress={() => router.push('/cart')}
        >
            <Animated.View
                className="flex-row items-center justify-between p-4 rounded-2xl"
                style={{ backgroundColor: isFlashing ? flashBackgroundColor : theme.colors.primary }}
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
