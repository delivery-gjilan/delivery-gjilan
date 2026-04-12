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
        <View style={{ flex: 1 }}>
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

            {/* Minimum order strip */}
            {minOrderAmount > 0 && !minimumMet && (
                <View style={[styles.minimumStrip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.minimumStripTop}>
                        <Ionicons name="alert-circle-outline" size={13} color={theme.colors.expense} />
                        <Text style={[styles.minimumStripText, { color: theme.colors.subtext }]}>
                            {t.cart.minimum_not_met.replace('{amount}', formatCurrency(amountUntilMinimum))}
                        </Text>
                        <Text style={[styles.minimumStripAmount, { color: theme.colors.expense }]}>
                            {formatCurrency(minOrderAmount)}
                        </Text>
                    </View>
                    <View style={[styles.minimumTrack, { backgroundColor: theme.colors.border }]}>
                        <View
                            style={[
                                styles.minimumFill,
                                {
                                    width: `${Math.min((total / minOrderAmount) * 100, 100)}%` as any,
                                    backgroundColor: theme.colors.expense,
                                },
                            ]}
                        />
                    </View>
                </View>
            )}

            {/* Items header */}
            <View style={[styles.listHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.listHeaderLabel, { color: theme.colors.subtext }]}>
                    {items.length} {items.length === 1 ? t.common.item : t.common.items}
                </Text>
                <Text style={[styles.listHeaderTotal, { color: theme.colors.text }]}>
                    {formatCurrency(total)}
                </Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
            >
                {items.map((item, index) => (
                    <Reanimated.View
                        key={item.cartItemId}
                        entering={FadeInDown.delay(index * 40).duration(300).springify().damping(28).stiffness(160)}
                    >
                        <CartItemRow
                            item={item}
                            showSeparator={index < items.length - 1}
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
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                <AnimatedTouchable
                    style={[
                        styles.proceedBtn,
                        {
                            backgroundColor: minimumMet ? theme.colors.primary : theme.colors.border,
                            shadowColor: minimumMet ? theme.colors.primary : 'transparent',
                            opacity: minimumMet ? 1 : 0.5,
                            transform: [{ scale: minimumMet ? pulseAnim : 1 }],
                        },
                    ]}
                    activeOpacity={0.8}
                    onPress={onProceed}
                >
                    <Text style={styles.proceedText}>{t.cart.choose_address}</Text>
                    <Text style={styles.proceedTotalText}>{formatCurrency(total)}</Text>
                </AnimatedTouchable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Minimum order strip
    minimumStrip: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    minimumStripTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    minimumStripText: { flex: 1, fontSize: 12 },
    minimumStripAmount: { fontSize: 12, fontWeight: '700' },
    minimumTrack: { height: 3, borderRadius: 2 },
    minimumFill: { height: 3, borderRadius: 2 },

    // Items section header
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    listHeaderLabel: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1 },
    listHeaderTotal: { fontSize: 15, fontWeight: '700' },

    // Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    proceedBtn: {
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    proceedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    proceedText: { color: 'white', fontWeight: '600', fontSize: 16 },
    proceedTotalPill: {},
    proceedTotalText: { color: 'white', fontWeight: '800', fontSize: 17 },
});
