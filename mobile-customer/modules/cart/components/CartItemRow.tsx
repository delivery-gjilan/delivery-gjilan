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
        <View style={[styles.fullRow, { backgroundColor: theme.colors.card }]}>
            {item.imageUrl ? (
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.fullImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                />
            ) : (
                <View style={[styles.fullImagePlaceholder, { backgroundColor: theme.colors.border }]}>
                    <Ionicons name="image-outline" size={28} color={theme.colors.subtext} />
                </View>
            )}

            <View style={styles.fullContent}>
                <Text style={[styles.fullName, { color: theme.colors.text }]} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={[styles.fullPrice, { color: theme.colors.primary }]}>
                    {formatCurrency(unitTotal)}
                </Text>
                {item.quantity > 1 && (
                    <Text style={[styles.fullSubprice, { color: theme.colors.subtext }]}>
                        {item.quantity} × {formatCurrency(unitTotal)} = {formatCurrency(unitTotal * item.quantity)}
                    </Text>
                )}

                {item.selectedOptions.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                        {item.selectedOptions.map((opt) => (
                            <Text key={`${item.cartItemId}-${opt.optionId}`} style={[styles.optionText, { color: theme.colors.subtext }]}>
                                {opt.name}
                                {opt.extraPrice > 0 ? ` (+€${Number(opt.extraPrice).toFixed(2)})` : ''}
                            </Text>
                        ))}
                    </View>
                )}

                {item.childItems && item.childItems.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                        {item.childItems.map((child) => (
                            <Text key={`${item.cartItemId}-${child.productId}`} style={[styles.optionText, { color: theme.colors.subtext }]}>
                                + {child.name}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Quantity Controls */}
                <View style={styles.qtyContainer}>
                    <View style={[styles.qtyPill, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <TouchableOpacity
                            onPress={() => onUpdateQuantity?.(item.cartItemId, item.quantity - 1)}
                            style={[styles.qtyBtn, { backgroundColor: theme.colors.border }]}
                        >
                            <Ionicons name="remove" size={14} color={theme.colors.text} />
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
                            style={[styles.qtyBtn, { backgroundColor: theme.colors.primary }]}
                        >
                            <Ionicons name="add" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Item Notes */}
                <TextInput
                    value={item.notes || ''}
                    onChangeText={(text) => onUpdateNotes?.(item.cartItemId, text)}
                    placeholder={t.cart.item_notes_placeholder}
                    placeholderTextColor={theme.colors.subtext + '80'}
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

            {/* Remove Button */}
            <TouchableOpacity onPress={() => onRemove?.(item.cartItemId)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.subtext} />
            </TouchableOpacity>
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
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    fullImage: {
        width: 76,
        height: 76,
        borderRadius: 14,
    },
    fullImagePlaceholder: {
        width: 76,
        height: 76,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullContent: { flex: 1, marginLeft: 12 },
    fullName: { fontSize: 15, fontWeight: '600' },
    fullPrice: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    fullSubprice: { fontSize: 11, marginTop: 1 },
    optionText: { fontSize: 11 },

    qtyContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    qtyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 3,
        paddingVertical: 3,
        borderWidth: StyleSheet.hairlineWidth,
    },
    qtyBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: { fontSize: 14, fontWeight: '600', paddingHorizontal: 10 },

    notesInput: {
        fontSize: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: 8,
    },

    removeBtn: { marginLeft: 8, padding: 6 },
});
