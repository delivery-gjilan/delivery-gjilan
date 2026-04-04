import React, { useState } from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BusinessType } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useComplexProductInCart } from '../hooks/useComplexProductInCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { RepeatOrCustomizeModal } from './RepeatOrCustomizeModal';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Reanimated.createAnimatedComponent(TouchableOpacity);

interface ComplexCartControlsProps {
    productId: string;
    businessType?: BusinessType;
}

export function ComplexCartControls({ productId, businessType }: ComplexCartControlsProps) {
    const theme = useTheme();
    const { totalQuantity, cartItems, decrementLast } = useComplexProductInCart(productId);
    const { updateQuantity } = useCartActions();
    const [modalVisible, setModalVisible] = useState(false);
    const scaleAnim = useSharedValue(1);
    const [showFloatingNumber, setShowFloatingNumber] = useState(false);
    const floatingOpacity = useSharedValue(0);
    const floatingTranslateY = useSharedValue(0);

    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));
    const floatingStyle = useAnimatedStyle(() => ({
        opacity: floatingOpacity.value,
        transform: [{ translateY: floatingTranslateY.value }],
    }));

    const triggerFloatingAnimation = () => {
        setShowFloatingNumber(true);
        floatingOpacity.value = 1;
        floatingTranslateY.value = 0;
        floatingOpacity.value = withTiming(0, { duration: 800 });
        floatingTranslateY.value = withTiming(-40, { duration: 800 });
        setTimeout(() => setShowFloatingNumber(false), 820);
    };

    const handleAddPress = (e: GestureResponderEvent) => {
        e.stopPropagation();

        // Bounce animation
        scaleAnim.value = withSequence(
            withSpring(1.2, { damping: 3, stiffness: 200 }),
            withSpring(1, { damping: 4, stiffness: 100 }),
        );

        // Not in cart yet — navigate to product detail
        router.push(`/product/${productId}`);
    };

    const handleIncrementPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        setModalVisible(true);
    };

    const handleDecrementPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        decrementLast();
    };

    const handleRepeat = (cartItem: (typeof cartItems)[number]) => {
        updateQuantity(cartItem.cartItemId, cartItem.quantity + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        triggerFloatingAnimation();
        setModalVisible(false);
    };

    const handleCustomize = () => {
        setModalVisible(false);
        router.push(`/product/${productId}`);
    };

    // Not in cart — show single + button
    if (totalQuantity === 0) {
        return (
            <View>
                <AnimatedTouchable
                    onPress={handleAddPress}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={[{ backgroundColor: theme.colors.primary }, scaleStyle]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={24} color="#ffffff" />
                </AnimatedTouchable>
            </View>
        );
    }

    // In cart — show −/qty/+ controls
    return (
        <View style={{ position: 'relative' }}>
            <View className="flex-row items-center bg-card border border-border rounded-full">
                <TouchableOpacity
                    onPress={handleDecrementPress}
                    className="w-9 h-9 items-center justify-center"
                    activeOpacity={0.7}
                >
                    <Ionicons name="remove" size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                <View className="px-3 min-w-[40px] items-center">
                    <Text className="text-foreground text-base font-semibold">{totalQuantity}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleIncrementPress}
                    className="w-9 h-9 items-center justify-center"
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {showFloatingNumber && (
                <Reanimated.Text
                    style={[
                        floatingStyle,
                        {
                            position: 'absolute',
                            top: -15,
                            right: 5,
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: theme.colors.primary,
                        },
                    ]}
                >
                    +1
                </Reanimated.Text>
            )}

            <RepeatOrCustomizeModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                cartItems={cartItems}
                onRepeat={handleRepeat}
                onCustomize={handleCustomize}
            />
        </View>
    );
}
