import React, { memo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import type { CartItem } from '../types';
import { calculateItemUnitTotal } from '../utils/price';

interface CartItemRowProps {
    item: CartItem;
    /** Compact = Step 3 read-only summary, full = Step 1 editable */
    compact?: boolean;
    /** Show separator line at bottom */
    showSeparator?: boolean;
    onUpdateQuantity?: (cartItemId: string, quantity: number) => void;
    onRemove?: (cartItemId: string) => void;
    onUpdateNotes?: (cartItemId: string, notes: string) => void;
    /** Handler for when + is pressed on a complex item */
    onIncrementComplex?: (productId: string) => void;
    formatCurrency: (value: number) => string;
}

export const CartItemRow = memo(function CartItemRow({
    item,
    compact = false,
    showSeparator = false,
    onUpdateQuantity,
    onRemove,
    onUpdateNotes,
    onIncrementComplex,
    formatCurrency,
}: CartItemRowProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const unitTotal = calculateItemUnitTotal(item);

    if (compact) {
        return (
            <View
                style={[
                    styles.compactRow,
                    showSeparator && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
                ]}
            >
                {item.imageUrl ? (
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.compactImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.compactImagePlaceholder, { backgroundColor: theme.colors.border }]}>
                        <Ionicons name="fast-food-outline" size={14} color={theme.colors.subtext} />
                    </View>
                )}
                <View style={styles.compactContent}>
                    <Text style={[styles.compactName, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.selectedOptions.length > 0 && (
                        <Text style={[styles.compactOptions, { color: theme.colors.subtext }]} numberOfLines={1}>
                            {item.selectedOptions.map((opt) => opt.name).join(', ')}
                        </Text>
                    )}
                </View>
                <View style={styles.compactRight}>
                    <Text style={[styles.compactPrice, { color: theme.colors.text }]}>
                        {formatCurrency(unitTotal * item.quantity)}
                    </Text>
                    {item.quantity > 1 && (
                        <Text style={[styles.compactQty, { color: theme.colors.subtext }]}>×{item.quantity}</Text>
                    )}
                </View>
            </View>
        );
    }

    const isComplex = item.selectedOptions.length > 0 || (item.childItems?.length ?? 0) > 0;

    return (
        <View
            style={[
                styles.fullRow,
                showSeparator && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
            ]}
        >
            {/* Image */}
            {item.imageUrl ? (
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.fullImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                />
            ) : (
                <View style={[styles.fullImagePlaceholder, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="fast-food-outline" size={22} color={theme.colors.subtext} />
                </View>
            )}

            {/* Content */}
            <View style={styles.fullContent}>
                <View style={styles.fullNameRow}>
                    <Text style={[styles.fullName, { color: theme.colors.text }]} numberOfLines={2}>
                        {item.name}
                    </Text>
                    <TouchableOpacity
                        onPress={() => onRemove?.(item.cartItemId)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.removeBtn}
                    >
                        <Ionicons name="close" size={15} color={theme.colors.subtext} />
                    </TouchableOpacity>
                </View>

                {item.selectedOptions.length > 0 && (
                    <Text style={[styles.optionText, { color: theme.colors.subtext }]} numberOfLines={2}>
                        {item.selectedOptions.map((opt) =>
                            opt.name + (opt.extraPrice > 0 ? ` +€${Number(opt.extraPrice).toFixed(2)}` : '')
                        ).join(' · ')}
                    </Text>
                )}

                {item.childItems && item.childItems.length > 0 && (
                    <Text style={[styles.optionText, { color: theme.colors.subtext }]} numberOfLines={1}>
                        {item.childItems.map((c) => `+ ${c.name}`).join(', ')}
                    </Text>
                )}

                {/* Price + Qty row */}
                <View style={styles.priceQtyRow}>
                    <Text style={[styles.fullPrice, { color: theme.colors.text }]}>
                        {formatCurrency(unitTotal * item.quantity)}
                    </Text>
                    {item.quantity > 1 && (
                        <Text style={[styles.fullSubprice, { color: theme.colors.subtext }]}>
                            {item.quantity} × {formatCurrency(unitTotal)}
                        </Text>
                    )}

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Qty stepper */}
                    <View style={[styles.qtyPill, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <TouchableOpacity
                            onPress={() => onUpdateQuantity?.(item.cartItemId, item.quantity - 1)}
                            style={styles.qtyBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Ionicons name="remove" size={13} color={theme.colors.subtext} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: theme.colors.text }]}>{item.quantity}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (isComplex) {
                                    onIncrementComplex?.(item.productId);
                                } else {
                                    onUpdateQuantity?.(item.cartItemId, item.quantity + 1);
                                }
                            }}
                            style={[styles.qtyBtn, styles.qtyBtnAdd, { backgroundColor: theme.colors.primary }]}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Ionicons name="add" size={13} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Item Notes */}
                <TextInput
                    value={item.notes || ''}
                    onChangeText={(text) => onUpdateNotes?.(item.cartItemId, text)}
                    placeholder={t.cart.item_notes_placeholder}
                    placeholderTextColor={theme.colors.subtext + '60'}
                    style={[
                        styles.notesInput,
                        {
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                            color: theme.colors.text,
                        },
                    ]}
                    multiline
                    numberOfLines={2}
                    maxLength={200}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    // ─── Compact (Step 3) ───
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    compactImage: {
        width: 36,
        height: 36,
        borderRadius: 8,
        marginRight: 12,
    },
    compactImagePlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 8,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactContent: { flex: 1 },
    compactName: { fontSize: 14, fontWeight: '500' },
    compactOptions: { fontSize: 11, marginTop: 1 },
    compactRight: { alignItems: 'flex-end', marginLeft: 8 },
    compactPrice: { fontSize: 14, fontWeight: '600' },
    compactQty: { fontSize: 11, marginTop: 1 },

    // ─── Full (Step 1) ───
    fullRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    fullImage: {
        width: 68,
        height: 68,
        borderRadius: 14,
        flexShrink: 0,
    },
    fullImagePlaceholder: {
        width: 68,
        height: 68,
        borderRadius: 14,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullContent: { flex: 1, marginLeft: 12 },
    fullNameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 3 },
    fullName: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },
    fullPrice: { fontSize: 15, fontWeight: '700' },
    fullSubprice: { fontSize: 11, marginLeft: 6 },
    optionText: { fontSize: 11, lineHeight: 16, marginTop: 2 },

    priceQtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },

    qtyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    qtyBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyBtnAdd: { borderRadius: 0 },
    qtyText: { fontSize: 13, fontWeight: '600', paddingHorizontal: 10, minWidth: 28, textAlign: 'center' },

    notesInput: {
        fontSize: 12,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: 10,
    },

    removeBtn: {
        padding: 2,
        marginLeft: 2,
        opacity: 0.5,
    },
});
