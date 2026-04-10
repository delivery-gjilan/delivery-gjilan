import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
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
    onCheckout,
}: OrderReviewProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const isCheckoutDisabled =
        isProcessing || deliveryPriceLoading || isSelectedLocationInZone === false || !minimumMet;

    return (
        <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {/* Delivery Address */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onChangeAddress}
                    style={[styles.addressCard, { backgroundColor: theme.colors.card }]}
                >
                    <View style={styles.addressHeader}>
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.deliver_to}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="pencil" size={11} color={theme.colors.primary} />
                            <Text style={[styles.changeText, { color: theme.colors.primary }]}>{t.cart.change_address}</Text>
                        </View>
                    </View>
                    <View style={styles.addressRow}>
                        <View style={[styles.addressIcon, { backgroundColor: theme.colors.primary + '12' }]}>
                            <Ionicons name="location" size={18} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.addressLabel, { color: theme.colors.text }]}>
                                {selectedLocation.label ?? t.cart.selected_address}
                            </Text>
                            <Text style={[styles.addressText, { color: theme.colors.subtext }]} numberOfLines={2}>
                                {selectedLocation.address}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Delivery Speed */}
                <DeliverySpeedPicker
                    isPriority={isPriority}
                    prioritySurcharge={serverPrioritySurcharge}
                    formatCurrency={formatCurrency}
                    onSelect={onSetPriority}
                />

                {/* Order Items (compact) */}
                <View style={[styles.itemsCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.itemsHeader}>
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>
                            {t.cart.your_items} ({items.length})
                        </Text>
                        <TouchableOpacity onPress={onEditCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={[styles.editLink, { color: theme.colors.primary }]}>{t.cart.edit_cart}</Text>
                        </TouchableOpacity>
                    </View>
                    {items.map((item, idx) => (
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

                {/* Price Breakdown */}
                <PriceBreakdown
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
                    finalTotal={finalTotal}
                    formatCurrency={formatCurrency}
                />

                {/* Promo Code */}
                {!hasEligiblePromotion && (
                    <PromoCodeSection
                        couponCode={couponCode}
                        onChangeCoupon={onChangeCoupon}
                        promoResult={promoResult}
                        promoError={promoError}
                        loading={manualPromoLoading}
                        onApply={onApplyCoupon}
                        formatCurrency={formatCurrency}
                    />
                )}

                {/* Driver Notes */}
                <View style={[styles.notesCard, { backgroundColor: theme.colors.card }]}>
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
                        multiline
                        numberOfLines={3}
                        maxLength={300}
                    />
                    {driverNotes.length > 0 && (
                        <Text style={[styles.charCount, { color: theme.colors.subtext }]}>{driverNotes.length}/300</Text>
                    )}
                </View>

                {/* Payment Method */}
                <View style={[styles.paymentCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.paymentHeader}>
                        <Ionicons name="wallet-outline" size={14} color={theme.colors.subtext} />
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.payment_method}</Text>
                    </View>
                    <View style={[styles.paymentRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <View style={[styles.paymentIcon, { backgroundColor: theme.colors.income + '12' }]}>
                            <Ionicons name="cash-outline" size={16} color={theme.colors.income} />
                        </View>
                        <Text style={[styles.paymentText, { color: theme.colors.text }]}>{t.cart.cash_on_delivery}</Text>
                    </View>
                </View>

                <View style={{ height: 16 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
                <View style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: theme.colors.subtext }]}>{t.common.total}</Text>
                    <Text style={[styles.footerTotal, { color: theme.colors.primary }]}>{formatCurrency(finalTotal)}</Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.checkoutBtn,
                        {
                            backgroundColor: isCheckoutDisabled ? theme.colors.border : theme.colors.primary,
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
        </>
    );
}

const styles = StyleSheet.create({
    sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Address
    addressCard: {
        borderRadius: 18, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    },
    addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    changeText: { fontSize: 11, fontWeight: '600' },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    addressIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    addressLabel: { fontSize: 15, fontWeight: '600' },
    addressText: { fontSize: 13, marginTop: 2, lineHeight: 18 },

    // Items
    itemsCard: {
        borderRadius: 18, marginBottom: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    },
    itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    editLink: { fontSize: 11, fontWeight: '600' },

    // Notes
    notesCard: {
        borderRadius: 18, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    },
    notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    notesInput: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        fontSize: 13,
        borderWidth: StyleSheet.hairlineWidth,
    },
    charCount: { fontSize: 10, marginTop: 4, textAlign: 'right' },

    // Payment
    paymentCard: {
        borderRadius: 18, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    },
    paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    paymentIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    paymentText: { fontSize: 13, fontWeight: '600' },

    // Footer
    footer: {
        paddingHorizontal: 16, paddingVertical: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
    },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    footerLabel: { fontSize: 13 },
    footerTotal: { fontSize: 17, fontWeight: '700' },
    checkoutBtn: {
        height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    checkoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkoutText: { color: 'white', fontWeight: '700', fontSize: 16 },
    warningText: { fontSize: 11, marginTop: 8, textAlign: 'center', fontWeight: '600', color: '#F97316' },
});
