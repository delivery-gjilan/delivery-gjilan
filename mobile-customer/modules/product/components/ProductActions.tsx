import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
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
                    paddingHorizontal: 20,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 20,
                    paddingTop: 14,
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
                paddingBottom: Platform.OS === 'ios' ? insets.bottom + 4 : 16,
                paddingTop: 12,
            }}
        >
            {/* Quantity + Action in single row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Quantity stepper */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.colors.background,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingVertical: 4,
                        paddingHorizontal: 4,
                    }}
                >
                    <TouchableOpacity
                        onPress={decrementQuantity}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="remove" size={20} color={localQuantity <= 1 ? theme.colors.border : theme.colors.text} />
                    </TouchableOpacity>

                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>
                        {localQuantity}
                    </Text>

                    <TouchableOpacity
                        onPress={incrementQuantity}
                        activeOpacity={0.7}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Main action button */}
                <AnimatedTouchable
                    onPress={handleMainAction}
                    disabled={isDisabled}
                    activeOpacity={0.75}
                    style={[
                        buttonScaleStyle,
                        {
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDisabled ? theme.colors.subtext : theme.colors.primary,
                            opacity: isDisabled ? 0.4 : 1,
                            paddingVertical: 16,
                            paddingHorizontal: 20,
                            borderRadius: 14,
                            gap: 6,
                        },
                    ]}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                        {getButtonLabel()}
                    </Text>
                    {isSelectionValid && (
                        <>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>·</Text>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                                €{runningTotal.toFixed(2)}
                            </Text>
                        </>
                    )}
                </AnimatedTouchable>
            </View>

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
                        marginTop: 8,
                        paddingVertical: 10,
                    }}
                >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.expense} />
                    <Text style={{ color: theme.colors.expense, fontSize: 14, fontWeight: '600' }}>
                        {t.product.remove_from_cart}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
