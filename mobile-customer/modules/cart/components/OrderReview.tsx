import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import type { SelectedAddress } from './AddressPicker';
import type { CartItem } from '../types';
import { CartItemRow } from './CartItemRow';
import { PriceBreakdown } from './PriceBreakdown';
import { DeliverySpeedPicker } from './DeliverySpeedPicker';
import { PromoCodeSection } from './PromoCodeSection';

interface OrderReviewProps {
    items: CartItem[];
    selectedLocation: SelectedAddress;
    total: number;
    /** Delivery */
    originalDeliveryPrice: number;
    effectiveDeliveryPrice: number;
    deliveryZoneName: string | null;
    deliveryPriceLoading: boolean;
    freeDeliveryApplied: boolean;
    /** Priority */
    isPriority: boolean;
    serverPrioritySurcharge: number;
    prioritySurcharge: number;
    /** Promo */
    hasEligiblePromotion: boolean;
    couponCode: string;
    promoResult: any | null;
    promoError: string | null;
    manualPromoLoading: boolean;
    deliveryPromoDiscount: number;
    appliedDiscount: number;
    /** Totals */
    finalTotal: number;
    minimumMet: boolean;
    minOrderAmount: number;
    amountUntilMinimum: number;
    /** Processing */
    isProcessing: boolean;
    orderLoading: boolean;
    isSelectedLocationInZone: boolean | null;
    /** Notes */
    driverNotes: string;
    formatCurrency: (value: number) => string;
    onChangeAddress: () => void;
    onEditCart: () => void;
    onSetPriority: (priority: boolean) => void;
    onChangeCoupon: (code: string) => void;
    onApplyCoupon: () => void;
    onChangeDriverNotes: (notes: string) => void;
    driverTip: number;
    onChangeTip: (tip: number) => void;
    onCheckout: () => void;
}

export function OrderReview({
    items,
    selectedLocation,
    total,
    originalDeliveryPrice,
    effectiveDeliveryPrice,
    deliveryZoneName,
    deliveryPriceLoading,
    freeDeliveryApplied,
    isPriority,
    serverPrioritySurcharge,
    prioritySurcharge,
    hasEligiblePromotion,
    couponCode,
    promoResult,
    promoError,
    manualPromoLoading,
    deliveryPromoDiscount,
    appliedDiscount,
    finalTotal,
    minimumMet,
    minOrderAmount,
    amountUntilMinimum,
    isProcessing,
    orderLoading,
    isSelectedLocationInZone,
    driverNotes,
    formatCurrency,
    onChangeAddress,
    onEditCart,
    onSetPriority,
    onChangeCoupon,
    onApplyCoupon,
    onChangeDriverNotes,
    driverTip,
    onChangeTip,
    onCheckout,
}: OrderReviewProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const [itemsExpanded, setItemsExpanded] = useState(false);
    const [isCustomTip, setIsCustomTip] = useState(false);
    const [customTipValue, setCustomTipValue] = useState('');
    const TIP_PRESETS: number[] = [0, 0.5, 1, 2];

    const toggleItems = () => {
        if (Platform.OS === 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setItemsExpanded(v => !v);
    };

    const isCheckoutDisabled =
        isProcessing || deliveryPriceLoading || isSelectedLocationInZone === false || !minimumMet;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Deliver To ──────────────────── */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onChangeAddress}
                    style={styles.section}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.deliver_to}</Text>
                        <Ionicons name="pencil" size={14} color={theme.colors.primary} />
                    </View>
                    <View style={styles.addressRow}>
                        <View style={[styles.addressIcon, { backgroundColor: theme.colors.primary + '12' }]}>
                            <Ionicons name="location" size={18} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.addressLabel, { color: theme.colors.text }]}>
                                {selectedLocation.label ?? t.cart.selected_address}
                            </Text>
                            <Text style={[styles.addressSubtext, { color: theme.colors.subtext }]} numberOfLines={2}>
                                {selectedLocation.address}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />

                {/* ── Delivery Speed + Payment ─────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="timer-outline" size={13} color={theme.colors.subtext} />
                            <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.delivery_type}</Text>
                        </View>
                    </View>
                    <DeliverySpeedPicker
                        flat
                        isPriority={isPriority}
                        prioritySurcharge={serverPrioritySurcharge}
                        formatCurrency={formatCurrency}
                        onSelect={onSetPriority}
                    />
                    <View style={[styles.paymentInlineRow, { borderTopColor: theme.colors.border }]}>
                        <Ionicons name="wallet-outline" size={15} color={theme.colors.subtext} />
                        <Text style={[styles.paymentInlineText, { color: theme.colors.subtext }]}>{t.cart.cash_on_delivery}</Text>
                        <View style={[styles.paymentConfirmed, { backgroundColor: theme.colors.primary + '18' }]}>
                            <Ionicons name="checkmark" size={11} color={theme.colors.primary} />
                            <Text style={[styles.paymentConfirmedText, { color: theme.colors.primary }]}>{t.cart.cash_on_delivery}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />

                {/* ── Order Items ──────────────────── */}
                <View style={styles.section}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={toggleItems}
                        style={styles.sectionHeader}
                    >
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>
                            {t.cart.your_items} ({items.length})
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity onPress={onEditCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="pencil" size={14} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <Ionicons
                                name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={theme.colors.subtext}
                            />
                        </View>
                    </TouchableOpacity>
                    {itemsExpanded && items.map((item, idx) => (
                        <Reanimated.View
                            key={item.cartItemId}
                            entering={FadeInDown.delay(idx * 35).duration(280).springify().damping(28).stiffness(160)}
                        >
                            <CartItemRow
                                item={item}
                                compact
                                showSeparator={idx < items.length - 1}
                                formatCurrency={formatCurrency}
                            />
                        </Reanimated.View>
                    ))}
                </View>

                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />

                {/* ── Promo Code ───────────────────── */}
                {!hasEligiblePromotion && (
                    <>
                        <View style={styles.section}>
                            <PromoCodeSection
                                flat
                                couponCode={couponCode}
                                onChangeCoupon={onChangeCoupon}
                                promoResult={promoResult}
                                promoError={promoError}
                                loading={manualPromoLoading}
                                onApply={onApplyCoupon}
                                formatCurrency={formatCurrency}
                            />
                        </View>
                        <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />
                    </>
                )}

                {/* ── Price Breakdown ──────────────── */}
                <View style={styles.section}>
                    <PriceBreakdown
                        flat
                        subtotal={total}
                        originalDeliveryPrice={originalDeliveryPrice}
                        effectiveDeliveryPrice={effectiveDeliveryPrice}
                        deliveryZoneName={deliveryZoneName}
                        deliveryPriceLoading={deliveryPriceLoading}
                        freeDeliveryApplied={freeDeliveryApplied}
                        isPriority={isPriority}
                        prioritySurcharge={prioritySurcharge}
                        deliveryPromoDiscount={deliveryPromoDiscount}
                        appliedDiscount={appliedDiscount}
                        driverTip={driverTip}
                        finalTotal={finalTotal}
                        formatCurrency={formatCurrency}
                    />
                </View>

                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />

                {/* ── Driver Tip ────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="heart-outline" size={13} color={theme.colors.subtext} />
                            <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.tip_driver}</Text>
                        </View>
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext + '60' }]}>{t.cart.tip_optional}</Text>
                    </View>
                    <View style={styles.tipRow}>
                        {TIP_PRESETS.map((amount) => {
                            const selected = driverTip === amount && !isCustomTip;
                            return (
                                <TouchableOpacity
                                    key={amount}
                                    style={[
                                        styles.tipBtn,
                                        {
                                            backgroundColor: selected ? theme.colors.primary : theme.colors.card,
                                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                                        },
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => { setIsCustomTip(false); setCustomTipValue(''); onChangeTip(amount); }}
                                >
                                    <Text style={[styles.tipBtnText, { color: selected ? '#fff' : theme.colors.text }]}>
                                        {formatCurrency(amount)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={[
                                styles.tipBtn,
                                styles.tipBtnFlex,
                                {
                                    backgroundColor: isCustomTip ? theme.colors.primary : theme.colors.card,
                                    borderColor: isCustomTip ? theme.colors.primary : theme.colors.border,
                                },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => setIsCustomTip(true)}
                        >
                            <Text style={[styles.tipBtnText, { color: isCustomTip ? '#fff' : theme.colors.text }]}>
                                {t.cart.tip_custom}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {isCustomTip && (
                        <TextInput
                            autoFocus
                            keyboardType="decimal-pad"
                            value={customTipValue}
                            onChangeText={(v) => {
                                setCustomTipValue(v);
                                const parsed = parseFloat(v);
                                onChangeTip(!isNaN(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0);
                            }}
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.subtext + '80'}
                            style={[
                                styles.tipCustomInput,
                                { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text },
                            ]}
                        />
                    )}
                </View>

                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />

                {/* ── Driver Notes ───────────────── */}
                <View style={styles.section}>
                    <View style={styles.notesHeader}>
                        <Ionicons name="chatbubble-outline" size={14} color={theme.colors.subtext} />
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.driver_notes}</Text>
                    </View>
                    <TextInput
                        value={driverNotes}
                        onChangeText={onChangeDriverNotes}
                        placeholder={t.cart.driver_notes_placeholder}
                        placeholderTextColor={theme.colors.subtext + '80'}
                        style={[
                            styles.notesInput,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                                color: theme.colors.text,
                            },
                        ]}
                        numberOfLines={2}
                        maxLength={300}
                    />
                    {driverNotes.length > 0 && (
                        <Text style={[styles.charCount, { color: theme.colors.subtext }]}>{driverNotes.length}/300</Text>
                    )}
                </View>

                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />
            </ScrollView>

            {/* ── Sticky Footer ────────────────── */}
            <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                    style={[
                        styles.checkoutBtn,
                        {
                            backgroundColor: isCheckoutDisabled ? theme.colors.border : theme.colors.primary,
                            shadowColor: isCheckoutDisabled ? 'transparent' : theme.colors.primary,
                            opacity: isCheckoutDisabled ? 0.5 : 1,
                        },
                    ]}
                    activeOpacity={0.8}
                    onPress={onCheckout}
                    disabled={isCheckoutDisabled}
                >
                    {isProcessing || orderLoading ? (
                        <View style={styles.checkoutRow}>
                            <ActivityIndicator size="small" color="white" />
                            <Text style={styles.checkoutText}>{t.cart.placing_order}</Text>
                        </View>
                    ) : (
                        <View style={styles.checkoutRow}>
                            <Ionicons name="shield-checkmark" size={18} color="white" />
                            <Text style={styles.checkoutText}>{t.cart.confirm_order}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {isSelectedLocationInZone === false && (
                    <Text style={styles.warningText}>{t.cart.outside_zone_inline_warning}</Text>
                )}
                {!minimumMet && minOrderAmount > 0 && (
                    <Text style={[styles.warningText, { color: theme.colors.expense }]}>
                        {t.cart.minimum_not_met.replace('{amount}', formatCurrency(amountUntilMinimum))}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Unified layout
    section: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionLabel: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1, color: '#9CA3AF' },
    sectionDivider: { height: StyleSheet.hairlineWidth },

    // Address
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    addressLabel: { fontSize: 15, fontWeight: '600' },
    addressSubtext: { fontSize: 13, marginTop: 2, lineHeight: 18 },

    // Payment inline row (inside delivery section)
    paymentInlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    paymentInlineText: { flex: 1, fontSize: 13 },
    paymentConfirmed: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    paymentConfirmedText: { fontSize: 11, fontWeight: '600' },

    // Notes
    notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    notesInput: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        fontSize: 13,
        borderWidth: StyleSheet.hairlineWidth,
    },
    charCount: { fontSize: 10, marginTop: 4, textAlign: 'right' },

    // Sticky Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    checkoutBtn: {
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    checkoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkoutText: { color: 'white', fontWeight: '700', fontSize: 16 },
    warningText: { fontSize: 11, marginTop: 8, textAlign: 'center', fontWeight: '600', color: '#F97316' },

    // Tip picker
    tipRow: { flexDirection: 'row', gap: 8, flexWrap: 'nowrap' },
    tipBtn: {
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 56,
    },
    tipBtnFlex: { flex: 1 },
    tipBtnText: { fontSize: 13, fontWeight: '600' },
    tipCustomInput: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        fontSize: 15,
        borderWidth: StyleSheet.hairlineWidth,
        textAlign: 'right',
    },
});
