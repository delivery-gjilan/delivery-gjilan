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
    const promoKindsLabel = [promoResult?.promotionSummary, promoResult?.deliveryPromotionSummary]
        .filter((value): value is string => Boolean(value))
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .join(' + ');
    const isAutoAppliedPromo = promoResult?.source === 'eligible';

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
                    <View style={[styles.appliedRow, { backgroundColor: theme.colors.income + '12', borderColor: theme.colors.income + '35' }]}>
                        <View style={styles.appliedInfo}>
                            <View style={[styles.codePill, { backgroundColor: theme.colors.income + '25' }]}>
                                <Text style={[styles.codeText, { color: theme.colors.income }]}>
                                    {promoCodeLabel}
                                </Text>
                            </View>
                            {promoKindsLabel ? (
                                <Text style={[styles.promoKindsText, { color: theme.colors.income }]} numberOfLines={2}>
                                    {promoKindsLabel}
                                </Text>
                            ) : null}
                            <Text style={[styles.savings, { color: theme.colors.income }]}>
                                {promoResult.freeDeliveryApplied && promoResult.discountAmount === 0
                                    ? t.cart.free_delivery
                                    : `-${formatCurrency(promoResult.discountAmount)}`}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => onChangeCoupon('')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={16} color={theme.colors.subtext} />
                        </TouchableOpacity>
                    </View>
                    {isAutoAppliedPromo && (
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

    appliedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    appliedInfo: { flex: 1, gap: 6, paddingRight: 8 },
    codePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    codeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    promoKindsText: { fontSize: 11, fontWeight: '600' },
    savings: { fontSize: 13, fontWeight: '600' },

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
