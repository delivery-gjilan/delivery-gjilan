import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useProductActions } from '../hooks/useProductActions';

const AnimatedTouchable = Reanimated.createAnimatedComponent(TouchableOpacity);

interface ProductActionsProps {
    product: any;
    selectedOptions: Record<string, string[]>;
    parentProduct?: any;
    editingCartItemId?: string;
}

export function ProductActions({ product, selectedOptions, parentProduct, editingCartItemId }: ProductActionsProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const buttonScale = useSharedValue(1);
    const [showFloatingNumber, setShowFloatingNumber] = useState(false);
    const floatingOpacity = useSharedValue(0);
    const floatingTranslateY = useSharedValue(0);

    const buttonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
    const floatingStyle = useAnimatedStyle(() => ({
        opacity: floatingOpacity.value,
        transform: [{ translateY: floatingTranslateY.value }],
    }));

    const {
        localQuantity,
        isInCart,
        hasQuantityChanged,
        incrementQuantity,
        decrementQuantity,
        addToCart,
        updateCart,
        removeFromCart,
    } = useProductActions(product, selectedOptions, parentProduct, editingCartItemId);

    // Validation: Check if all mandatory option groups have enough selections
    const isSelectionValid = useMemo(() => {
        const optionGroups =
            product.optionGroups && product.optionGroups.length > 0
                ? product.optionGroups
                : (parentProduct?.optionGroups ?? []);
        return optionGroups.every((og: any) => {
            const selected = selectedOptions[og.id] || [];
            return selected.length >= og.minSelections;
        });
    }, [product, selectedOptions, parentProduct]);

    const triggerFloatingAnimation = () => {
        setShowFloatingNumber(true);
        floatingOpacity.value = 1;
        floatingTranslateY.value = 0;
        floatingOpacity.value = withDelay(0, withTiming(0, { duration: 800 }));
        floatingTranslateY.value = withTiming(-40, { duration: 800 }, (finished) => {
            if (finished) {
                // reset handled by re-setting on next trigger
            }
        });
        setTimeout(() => setShowFloatingNumber(false), 820);
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
                <View style={{ backgroundColor: theme.colors.expense + '20', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}>
                    <Text className="text-expense text-base font-semibold">{t.product.unavailable_message}</Text>
                </View>
            </View>
        );
    }

    const getButtonText = () => {
        if (!isSelectionValid) return 'Please select required options';
        if (!isInCart) return t.product.add_to_order;
        if (hasQuantityChanged) return t.product.update_order;
        return t.product.in_cart;
    };

    const handleMainAction = () => {
        if (!isSelectionValid) return;
        if (!isInCart) {
            buttonScale.value = withSequence(
                withSpring(0.95, { damping: 4, stiffness: 200 }),
                withSpring(1, { damping: 6, stiffness: 100 }),
            );
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
                    <View className="flex-row items-center bg-background border border-border" style={{ borderRadius: 24 }}>
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
                        <Reanimated.Text
                            style={[
                                floatingStyle,
                                {
                                    position: 'absolute',
                                    top: -20,
                                    right: 10,
                                    fontSize: 22,
                                    fontWeight: 'bold',
                                    color: theme.colors.primary,
                                },
                            ]}
                        >
                            +1
                        </Reanimated.Text>
                    )}
                </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
                {/* Main Action Button */}
                <AnimatedTouchable
                    onPress={handleMainAction}
                    disabled={!isSelectionValid || (isInCart && !hasQuantityChanged)}
                    style={[
                        buttonScaleStyle,
                        {
                        backgroundColor: (!isSelectionValid || (isInCart && !hasQuantityChanged)) ? theme.colors.subtext : theme.colors.primary,
                        opacity: (!isSelectionValid || (isInCart && !hasQuantityChanged)) ? 0.5 : 1,
                        paddingVertical: 16,
                        borderRadius: 16,
                        alignItems: 'center' as const,
                        },
                    ]}
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
                        activeOpacity={0.7}
                        style={{
                            paddingVertical: 16,
                            borderRadius: 16,
                            alignItems: 'center',
                            borderWidth: 1.5,
                            borderColor: theme.colors.expense,
                        }}
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
