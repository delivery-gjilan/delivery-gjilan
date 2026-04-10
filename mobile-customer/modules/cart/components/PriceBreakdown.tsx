import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface PriceBreakdownProps {
    subtotal: number;
    originalDeliveryPrice: number;
    effectiveDeliveryPrice: number;
    deliveryZoneName: string | null;
    deliveryPriceLoading: boolean;
    freeDeliveryApplied: boolean;
    isPriority: boolean;
    prioritySurcharge: number;
    deliveryPromoDiscount: number;
    appliedDiscount: number;
    finalTotal: number;
    formatCurrency: (value: number) => string;
}

export function PriceBreakdown({
    subtotal,
    originalDeliveryPrice,
    effectiveDeliveryPrice,
    deliveryZoneName,
    deliveryPriceLoading,
    freeDeliveryApplied,
    isPriority,
    prioritySurcharge,
    deliveryPromoDiscount,
    appliedDiscount,
    finalTotal,
    formatCurrency,
}: PriceBreakdownProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {/* Subtotal */}
            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.colors.subtext }]}>{t.common.subtotal}</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{formatCurrency(subtotal)}</Text>
            </View>

            {/* Delivery */}
            <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.label, { color: theme.colors.subtext }]}>{t.common.delivery}</Text>
                    {deliveryZoneName && (
                        <Text style={{ fontSize: 11, color: theme.colors.primary }}>({deliveryZoneName})</Text>
                    )}
                </View>
                {deliveryPriceLoading ? (
                    <Text style={[styles.value, { color: theme.colors.text }]}>...</Text>
                ) : freeDeliveryApplied && deliveryPromoDiscount > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.value, { color: theme.colors.subtext, textDecorationLine: 'line-through' }]}>
                            {formatCurrency(originalDeliveryPrice)}
                        </Text>
                        <Text style={[styles.value, { color: theme.colors.income }]}>{t.common.free}</Text>
                    </View>
                ) : (
                    <Text style={[styles.value, { color: theme.colors.text }]}>{formatCurrency(effectiveDeliveryPrice)}</Text>
                )}
            </View>

            {/* Delivery promo discount */}
            {deliveryPromoDiscount > 0 && (
                <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.subtext }]}>{t.common.delivery} {t.cart.promo}</Text>
                    <Text style={[styles.value, { color: theme.colors.income }]}>
                        -{formatCurrency(deliveryPromoDiscount)}
                    </Text>
                </View>
            )}

            {/* Priority surcharge */}
            {isPriority && (
                <View style={styles.row}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="flash" size={12} color={theme.colors.primary} />
                        <Text style={[styles.label, { color: theme.colors.subtext }]}>{t.cart.priority_fee}</Text>
                    </View>
                    <Text style={[styles.value, { color: theme.colors.primary }]}>+{formatCurrency(prioritySurcharge)}</Text>
                </View>
            )}

            {/* Promo discount */}
            {appliedDiscount > 0 && (
                <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.subtext }]}>{t.cart.promo}</Text>
                    <Text style={[styles.value, { color: theme.colors.income }]}>
                        -{formatCurrency(appliedDiscount)}
                    </Text>
                </View>
            )}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Total */}
            <View style={styles.row}>
                <Text style={[styles.totalLabel, { color: theme.colors.text }]}>{t.common.total}</Text>
                <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{formatCurrency(finalTotal)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: { fontSize: 13 },
    value: { fontSize: 13, fontWeight: '600' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
    totalLabel: { fontSize: 15, fontWeight: '700' },
    totalValue: { fontSize: 19, fontWeight: '800' },
});
