import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import type { CartItem } from '../types';
import { CartItemRow } from './CartItemRow';
import { PromotionProgressBar } from './PromotionProgressBar';

interface CartReviewProps {
    items: CartItem[];
    total: number;
    minimumMet: boolean;
    minOrderAmount: number;
    amountUntilMinimum: number;
    /** Threshold-based promotion data */
    applicableConditional: any | null;
    spendThreshold: number | null | undefined;
    progress: number;
    amountRemaining: number;
    promoResult: any | null;
    /** Pulse animation for the proceed button */
    pulseAnim: Animated.Value;
    formatCurrency: (value: number) => string;
    onUpdateQuantity: (cartItemId: string, quantity: number) => void;
    onRemove: (cartItemId: string) => void;
    onUpdateNotes: (cartItemId: string, notes: string) => void;
    onIncrementComplex: (productId: string) => void;
    onProceed: () => void;
}

export function CartReview({
    items,
    total,
    minimumMet,
    minOrderAmount,
    amountUntilMinimum,
    applicableConditional,
    spendThreshold,
    progress,
    amountRemaining,
    promoResult,
    pulseAnim,
    formatCurrency,
    onUpdateQuantity,
    onRemove,
    onUpdateNotes,
    onIncrementComplex,
    onProceed,
}: CartReviewProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

    return (
        <>
            {/* Promo threshold */}
            {applicableConditional && spendThreshold && progress > 0 && !promoResult && (
                <PromotionProgressBar
                    progress={progress}
                    amountRemaining={amountRemaining}
                    spendThreshold={spendThreshold}
                    promoName={applicableConditional.name || t.cart.promotion_label}
                    isUnlocked={progress >= 1}
                    isApplied={false}
                    formatCurrency={formatCurrency}
                />
            )}

            {/* Minimum order bar */}
            {minOrderAmount > 0 && !minimumMet && (
                <View style={[styles.minimumBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.minimumHeader}>
                        <Text style={[styles.minimumLabel, { color: theme.colors.subtext }]}>{t.cart.minimum_order_label}</Text>
                        <Text style={[styles.minimumAmount, { color: theme.colors.expense }]}>{formatCurrency(minOrderAmount)}</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min((total / minOrderAmount) * 100, 100)}%`,
                                    backgroundColor: theme.colors.expense,
                                },
                            ]}
                        />
                    </View>
                    <Text style={[styles.minimumHint, { color: theme.colors.subtext }]}>
                        {t.cart.minimum_not_met.replace('{amount}', formatCurrency(amountUntilMinimum))}
                    </Text>
                </View>
            )}

            {/* Items list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
                {/* Summary header */}
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.summaryRow}>
                        <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.countText, { color: theme.colors.primary }]}>
                                {items.length} {items.length === 1 ? t.common.item : t.common.items}
                            </Text>
                        </View>
                        <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
                            {formatCurrency(total)}
                        </Text>
                    </View>
                </View>

                {items.map((item, index) => (
                    <Reanimated.View
                        key={item.cartItemId}
                        entering={FadeInDown.delay(index * 40).duration(300).springify().damping(28).stiffness(160)}
                    >
                        <CartItemRow
                            item={item}
                            formatCurrency={formatCurrency}
                            onUpdateQuantity={onUpdateQuantity}
                            onRemove={onRemove}
                            onUpdateNotes={onUpdateNotes}
                            onIncrementComplex={onIncrementComplex}
                        />
                    </Reanimated.View>
                ))}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
                <View style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: theme.colors.subtext }]}>{t.common.subtotal}</Text>
                    <Text style={[styles.footerTotal, { color: theme.colors.primary }]}>{formatCurrency(total)}</Text>
                </View>
                <AnimatedTouchable
                    style={[
                        styles.proceedBtn,
                        {
                            backgroundColor: minimumMet ? theme.colors.primary : theme.colors.border,
                            opacity: minimumMet ? pulseAnim : 0.5,
                        },
                    ]}
                    activeOpacity={0.8}
                    onPress={onProceed}
                >
                    <Ionicons name="location-outline" size={18} color="white" />
                    <Text style={styles.proceedText}>{t.cart.choose_address}</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                </AnimatedTouchable>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    minimumBar: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 2,
        padding: 12,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    minimumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    minimumLabel: { fontSize: 11, fontWeight: '600' },
    minimumAmount: { fontSize: 11, fontWeight: '700' },
    progressTrack: { height: 4, borderRadius: 2 },
    progressFill: { height: 4, borderRadius: 2 },
    minimumHint: { fontSize: 11, marginTop: 4 },

    summaryCard: {
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    countText: { fontSize: 12, fontWeight: '700' },
    totalAmount: { fontSize: 18, fontWeight: '800' },

    footer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    footerLabel: { fontSize: 13 },
    footerTotal: { fontSize: 17, fontWeight: '700' },
    proceedBtn: {
        height: 54,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    proceedText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
