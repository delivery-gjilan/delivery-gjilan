import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useProductActions } from '../hooks/useProductActions';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ProductActionsProps {
    product: Partial<Product>;
}

export function ProductActions({ product }: ProductActionsProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const buttonScaleAnim = useRef(new Animated.Value(1)).current;
    const [showFloatingNumber, setShowFloatingNumber] = useState(false);
    const floatingOpacity = useRef(new Animated.Value(0)).current;
    const floatingTranslateY = useRef(new Animated.Value(0)).current;

    const {
        localQuantity,
        isInCart,
        hasQuantityChanged,
        incrementQuantity,
        decrementQuantity,
        addToCart,
        updateCart,
        removeFromCart,
    } = useProductActions(product);

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

    const handleIncrementPress = () => {
        triggerFloatingAnimation();
        incrementQuantity();
    };

    if (!product.isAvailable) {
        return (
            <View
                className="bg-card border-t border-border px-6"
                style={{
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 16 : 24,
                    paddingTop: 16,
                }}
            >
                <View className="bg-expense/20 py-4 rounded-xl items-center">
                    <Text className="text-expense text-base font-semibold">{t.product.unavailable_message}</Text>
                </View>
            </View>
        );
    }

    const getButtonText = () => {
        if (!isInCart) return t.product.add_to_order;
        if (hasQuantityChanged) return t.product.update_order;
        return t.product.in_cart;
    };

    const handleMainAction = () => {
        if (!isInCart) {
            // Bounce animation for adding to cart
            Animated.sequence([
                Animated.spring(buttonScaleAnim, {
                    toValue: 0.95,
                    friction: 3,
                    tension: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(buttonScaleAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 100,
                    useNativeDriver: true,
                }),
            ]).start();
            addToCart();
        } else if (hasQuantityChanged) {
            updateCart();
        }
    };

    return (
        <View
            className="bg-card border-t border-border px-6"
            style={{
                paddingBottom: Platform.OS === 'ios' ? insets.bottom + 16 : 24,
                paddingTop: 16,
            }}
        >
            {/* Quantity Controls */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-foreground text-lg font-semibold">{t.product.quantity}</Text>

                <View style={{ position: 'relative' }}>
                    <View className="flex-row items-center bg-background border border-border rounded-full">
                        <TouchableOpacity
                            onPress={decrementQuantity}
                            className="w-12 h-12 items-center justify-center"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="remove" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>

                        <View className="px-6 min-w-[60px] items-center">
                            <Text className="text-foreground text-xl font-bold">{localQuantity}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleIncrementPress}
                            className="w-12 h-12 items-center justify-center"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    
                    {showFloatingNumber && (
                        <Animated.Text
                            style={{
                                position: 'absolute',
                                top: -20,
                                right: 10,
                                fontSize: 22,
                                fontWeight: 'bold',
                                color: theme.colors.primary,
                                opacity: floatingOpacity,
                                transform: [{ translateY: floatingTranslateY }],
                            }}
                        >
                            +1
                        </Animated.Text>
                    )}
                </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
                {/* Main Action Button */}
                <AnimatedTouchable
                    onPress={handleMainAction}
                    disabled={isInCart && !hasQuantityChanged}
                    className="py-4 rounded-xl items-center"
                    style={{
                        backgroundColor: isInCart && !hasQuantityChanged ? theme.colors.subtext : theme.colors.primary,
                        opacity: isInCart && !hasQuantityChanged ? 0.5 : 1,
                        transform: [{ scale: buttonScaleAnim }]
                    }}
                    activeOpacity={0.7}
                >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name={isInCart ? 'checkmark-circle' : 'cart'} size={24} color="#ffffff" />
                        <Text className="text-white text-lg font-bold">{getButtonText()}</Text>
                    </View>
                </AnimatedTouchable>

                {/* Remove Button (only show if in cart) */}
                {isInCart && (
                    <TouchableOpacity
                        onPress={removeFromCart}
                        className="py-4 rounded-xl items-center border-2"
                        style={{ borderColor: theme.colors.expense }}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="trash-outline" size={20} color={theme.colors.expense} />
                            <Text className="text-base font-semibold" style={{ color: theme.colors.expense }}>
                                {t.product.remove_from_cart}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
