import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useProductActions } from '../hooks/useProductActions';
import type { ProductOrVariant, FullProduct } from '../hooks/useProductActions';
import { getEffectiveProductPrice } from '../utils/pricing';

const AnimatedTouchable = Reanimated.createAnimatedComponent(TouchableOpacity);

interface ProductActionsProps {
    product: ProductOrVariant;
    selectedOptions: Record<string, string[]>;
    parentProduct?: FullProduct;
    editingCartItemId?: string;
}

export function ProductActions({ product, selectedOptions, parentProduct, editingCartItemId }: ProductActionsProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const buttonScale = useSharedValue(1);

    const buttonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

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
        return optionGroups.every((og) => {
            const selected = selectedOptions[og.id] || [];
            return selected.length >= og.minSelections;
        });
    }, [product, selectedOptions, parentProduct]);

    // Calculate running total (base price + extras) * quantity
    const runningTotal = useMemo(() => {
        const basePrice = getEffectiveProductPrice(product);
        let extrasTotal = 0;
        const optionGroups =
            product.optionGroups && product.optionGroups.length > 0
                ? product.optionGroups
                : (parentProduct?.optionGroups ?? []);
        for (const group of optionGroups) {
            const selectedIds = selectedOptions[group.id] || [];
            for (const opt of group.options) {
                if (selectedIds.includes(opt.id) && opt.extraPrice > 0) {
                    extrasTotal += opt.extraPrice;
                }
            }
        }
        return (basePrice + extrasTotal) * localQuantity;
    }, [product, parentProduct, selectedOptions, localQuantity]);

    if (!product.isAvailable) {
        return (
            <View
                style={{
                    backgroundColor: theme.colors.card,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    paddingHorizontal: 24,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 16 : 24,
                    paddingTop: 16,
                }}
            >
                <View style={{ backgroundColor: theme.colors.expense + '20', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.expense, fontSize: 16, fontWeight: '600' }}>{t.product.unavailable_message}</Text>
                </View>
            </View>
        );
    }

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

    const isDisabled = !isSelectionValid || (isInCart && !hasQuantityChanged);

    const getButtonLabel = () => {
        if (!isSelectionValid) return t.product.select_required;
        if (!isInCart) return t.product.add_to_order;
        if (hasQuantityChanged) return t.product.update_order;
        return t.product.in_cart;
    };

    return (
        <View
            style={{
                backgroundColor: theme.colors.card,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingHorizontal: 20,
                paddingBottom: Platform.OS === 'ios' ? insets.bottom + 12 : 20,
                paddingTop: 14,
            }}
        >
            {/* Quantity row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <TouchableOpacity
                    onPress={decrementQuantity}
                    activeOpacity={0.7}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: theme.colors.background,
                        borderWidth: 1.5,
                        borderColor: theme.colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="remove" size={22} color={localQuantity <= 1 ? theme.colors.border : theme.colors.primary} />
                </TouchableOpacity>

                <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', minWidth: 56, textAlign: 'center' }}>
                    {localQuantity}
                </Text>

                <TouchableOpacity
                    onPress={incrementQuantity}
                    activeOpacity={0.7}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: theme.colors.primary + '15',
                        borderWidth: 1.5,
                        borderColor: theme.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="add" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Main action button with total */}
            <AnimatedTouchable
                onPress={handleMainAction}
                disabled={isDisabled}
                activeOpacity={0.75}
                style={[
                    buttonScaleStyle,
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isDisabled ? theme.colors.subtext : theme.colors.primary,
                        opacity: isDisabled ? 0.45 : 1,
                        paddingVertical: 17,
                        paddingHorizontal: 24,
                        borderRadius: 18,
                    },
                ]}
            >
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
                    {getButtonLabel()}
                </Text>
                {isSelectionValid && (
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
                        €{runningTotal.toFixed(2)}
                    </Text>
                )}
            </AnimatedTouchable>

            {/* Remove button */}
            {isInCart && (
                <TouchableOpacity
                    onPress={removeFromCart}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 10,
                        paddingVertical: 12,
                    }}
                >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                    <Text style={{ color: theme.colors.expense, fontSize: 15, fontWeight: '600' }}>
                        {t.product.remove_from_cart}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
