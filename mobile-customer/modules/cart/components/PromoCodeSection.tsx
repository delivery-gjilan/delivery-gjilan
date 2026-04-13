import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface PromoCodeSectionProps {
    couponCode: string;
    onChangeCoupon: (code: string) => void;
    /** When true, renders without the card wrapper (for use inside a section container) */
    flat?: boolean;
    promoResult: {
        code: string;
        promotionSummary?: string | null;
        deliveryPromotionSummary?: string | null;
        orderDiscountAmount?: number;
        deliveryDiscountAmount?: number;
        autoApplyReason?: string | null;
        selectionReason?: string | null;
        discountAmount: number;
        freeDeliveryApplied: boolean;
        source?: 'eligible' | 'manual';
    } | null;
    promoError: string | null;
    loading: boolean;
    onApply: () => void;
    formatCurrency: (value: number) => string;
}

export function PromoCodeSection({
    couponCode,
    onChangeCoupon,
    flat,
    promoResult,
    promoError,
    loading,
    onApply,
    formatCurrency,
}: PromoCodeSectionProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const promoCodeLabel = (promoResult?.code || t.cart.promo_applied_title).toUpperCase();
    const orderDiscountAmount = Math.max(0, Number(promoResult?.orderDiscountAmount ?? promoResult?.discountAmount ?? 0));
    const deliveryDiscountAmount = Math.max(0, Number(promoResult?.deliveryDiscountAmount ?? 0));
    const promoIdentityLabel =
        promoResult?.source === 'manual'
            ? promoCodeLabel
            : (promoResult?.code ? promoCodeLabel : 'AUTO');
    const promoRows = [
        orderDiscountAmount > 0
            ? {
                  code: promoIdentityLabel,
                  summary: promoResult?.promotionSummary || t.cart.promo_type_fixed,
                  amount: `-${formatCurrency(orderDiscountAmount)}`,
              }
            : null,
        (deliveryDiscountAmount > 0 || promoResult?.freeDeliveryApplied)
            ? {
                  code: promoIdentityLabel,
                  summary: promoResult?.deliveryPromotionSummary || t.cart.free_delivery,
                  amount: deliveryDiscountAmount > 0 ? `-${formatCurrency(deliveryDiscountAmount)}` : t.common.free,
              }
            : null,
    ].filter((item): item is { code: string; summary: string; amount: string } => Boolean(item));
    const isAutoAppliedPromo = promoResult?.source === 'eligible';
    const autoApplyReason = promoResult?.autoApplyReason?.trim() || t.cart.auto_apply_reason_default;
    const selectionReason = promoResult?.selectionReason?.trim() || t.cart.auto_apply_best_savings;

    const inner = (
        <>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons
                        name="pricetag-outline"
                        size={13}
                        color={promoResult ? theme.colors.income : theme.colors.subtext}
                    />
                    <Text
                        style={[
                            styles.headerText,
                            { color: promoResult ? theme.colors.income : theme.colors.subtext },
                        ]}
                    >
                        {t.cart.promo_code}
                    </Text>
                </View>
                {promoResult && (
                    <View style={[styles.appliedBadge, { backgroundColor: theme.colors.income + '18' }]}>
                        <Ionicons name="checkmark-circle" size={10} color={theme.colors.income} />
                        <Text style={[styles.appliedText, { color: theme.colors.income }]}>{t.cart.promo_applied_title}</Text>
                    </View>
                )}
            </View>

            {promoResult ? (
                /* Applied state */
                <>
                    <View style={styles.appliedRowsWrap}>
                        {promoRows.map((row, index) => (
                            <View
                                key={`${row.code}:${row.summary}:${row.amount}`}
                                style={[styles.promoRow, { backgroundColor: theme.colors.income + '12', borderColor: theme.colors.income + '35' }]}
                            >
                                <View style={styles.rowLeft}>
                                    <View style={[styles.codePill, { backgroundColor: theme.colors.income + '25' }]}>
                                        <Text style={[styles.codeText, { color: theme.colors.income }]}>
                                            {row.code}
                                        </Text>
                                    </View>
                                    <Text style={[styles.summaryText, { color: theme.colors.income }]} numberOfLines={1}>
                                        {row.summary}
                                    </Text>
                                </View>
                                <View style={styles.rowRight}>
                                    <Text style={[styles.rowAmount, { color: theme.colors.income }]}>{row.amount}</Text>
                                    {index === 0 && (
                                        <TouchableOpacity
                                            onPress={() => onChangeCoupon('')}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={styles.closeBtn}
                                        >
                                            <Ionicons name="close-circle" size={16} color={theme.colors.subtext} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                    {isAutoAppliedPromo && (
                        <>
                            <View style={[styles.autoExplainCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '33' }]}>
                                <Text style={[styles.autoExplainTitle, { color: theme.colors.primary }]}>{selectionReason}</Text>
                                <Text style={[styles.autoExplainBody, { color: theme.colors.subtext }]}>{autoApplyReason}</Text>
                            </View>

                            <View style={[styles.inputRow, { marginTop: 10 }]}>
                                <TextInput
                                    value={couponCode}
                                    onChangeText={onChangeCoupon}
                                    placeholder={t.cart.enter_code}
                                    placeholderTextColor={theme.colors.subtext + '80'}
                                    autoCapitalize="characters"
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.colors.text,
                                            backgroundColor: theme.colors.background,
                                            borderColor: promoError ? theme.colors.expense + '70' : theme.colors.border,
                                        },
                                    ]}
                                />
                                <TouchableOpacity
                                    style={[styles.applyBtn, { backgroundColor: loading ? theme.colors.border : theme.colors.primary }]}
                                    onPress={onApply}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color={theme.colors.text} />
                                    ) : (
                                        <Text style={styles.applyText}>{t.common.apply}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </>
            ) : (
                /* Input state */
                <View style={styles.inputRow}>
                    <TextInput
                        value={couponCode}
                        onChangeText={onChangeCoupon}
                        placeholder={t.cart.enter_code}
                        placeholderTextColor={theme.colors.subtext + '80'}
                        autoCapitalize="characters"
                        style={[
                            styles.input,
                            {
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                                borderColor: promoError ? theme.colors.expense + '70' : theme.colors.border,
                            },
                        ]}
                    />
                    <TouchableOpacity
                        style={[styles.applyBtn, { backgroundColor: loading ? theme.colors.border : theme.colors.primary }]}
                        onPress={onApply}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.colors.text} />
                        ) : (
                            <Text style={styles.applyText}>{t.common.apply}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {promoError && (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={13} color={theme.colors.expense} />
                    <Text style={[styles.errorText, { color: theme.colors.expense }]}>{promoError}</Text>
                </View>
            )}
        </>
    );

    if (flat) {
        return <View>{inner}</View>;
    }

    return (
        <View
            style={[
                styles.card,
                {
                    borderColor: promoResult ? theme.colors.income + '50' : 'transparent',
                    backgroundColor: theme.colors.card,
                },
            ]}
        >
            {inner}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerText: { fontSize: 12, fontWeight: '600' },
    appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    appliedText: { fontSize: 10, fontWeight: '700' },

    appliedRowsWrap: { gap: 6 },
    codePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    codeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    promoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowAmount: { fontSize: 13, fontWeight: '700' },
    summaryText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
    closeBtn: { marginLeft: 2 },
    autoExplainCard: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 2,
    },
    autoExplainTitle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
    autoExplainBody: { fontSize: 11, lineHeight: 15 },

    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        fontSize: 13,
        borderWidth: StyleSheet.hairlineWidth,
    },
    applyBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    applyText: { color: 'white', fontWeight: '600', fontSize: 13 },

    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    errorText: { fontSize: 11, flex: 1 },
});
