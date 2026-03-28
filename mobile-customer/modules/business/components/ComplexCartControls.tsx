import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BusinessType } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useComplexProductInCart } from '../hooks/useComplexProductInCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { RepeatOrCustomizeModal } from './RepeatOrCustomizeModal';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ComplexCartControlsProps {
    productId: string;
    businessType?: BusinessType;
}

export function ComplexCartControls({ productId, businessType }: ComplexCartControlsProps) {
    const theme = useTheme();
    const { totalQuantity, cartItems, decrementLast } = useComplexProductInCart(productId);
    const { updateQuantity } = useCartActions();
    const [modalVisible, setModalVisible] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [showFloatingNumber, setShowFloatingNumber] = useState(false);
    const floatingOpacity = useRef(new Animated.Value(0)).current;
    const floatingTranslateY = useRef(new Animated.Value(0)).current;

    const triggerFloatingAnimation = () => {
        setShowFloatingNumber(true);
        floatingOpacity.setValue(1);
        floatingTranslateY.setValue(0);

        Animated.parallel([
            Animated.timing(floatingOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(floatingTranslateY, {
                toValue: -40,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowFloatingNumber(false);
        });
    };

    const handleAddPress = (e: GestureResponderEvent) => {
        e.stopPropagation();

        // Bounce animation
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1.2,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();

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
                    style={{
                        backgroundColor: theme.colors.primary,
                        transform: [{ scale: scaleAnim }],
                    }}
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
                <Animated.Text
                    style={{
                        position: 'absolute',
                        top: -15,
                        right: 5,
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: theme.colors.primary,
                        opacity: floatingOpacity,
                        transform: [{ translateY: floatingTranslateY }],
                    }}
                >
                    +1
                </Animated.Text>
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
