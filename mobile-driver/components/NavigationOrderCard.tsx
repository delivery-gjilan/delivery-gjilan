import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DriverOrder } from '@/utils/types';

interface Props {
    order: DriverOrder;
    isDirectDispatch?: boolean;
    etaMins?: number | null;
    phase?: 'to_pickup' | 'to_dropoff' | null;
}

export function NavigationOrderCard({
    order,
    isDirectDispatch = false,
    etaMins = null,
    phase = null,
}: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const netEarnings = Number(order.driverTakeHomePreview ?? 0);

    const allItems = (order.businesses ?? []).flatMap((b) => b.items ?? []);
    const totalStockUnits = allItems.reduce((sum, it) => sum + (it.inventoryQuantity ?? 0), 0);
    const totalMarketUnits = allItems.reduce((sum, it) => sum + Math.max(0, it.quantity - (it.inventoryQuantity ?? 0)), 0);

    const derivedPhase = order.status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';
    const currentPhase = phase ?? derivedPhase;
    const businessName = order.businesses?.[0]?.business?.name ?? 'Business';
    const recipientLabel = order.recipientName ?? order.recipientPhone ?? null;

    return (
        <Pressable
            onPress={() => setIsExpanded(prev => !prev)}
            style={[styles.container, isExpanded && styles.containerExpanded]}
        >
            {/* Collapsed Pill */}
            <View style={styles.pill}>
                <View style={styles.pillDot} />
                <View style={styles.pillContent}>
                    <Text style={styles.pillTitle} numberOfLines={1}>
                        Order #{order.displayId}
                    </Text>
                    <View style={styles.pillSubtitleRow}>
                        <Text style={styles.pillSubtitle} numberOfLines={1}>
                            {currentPhase === 'to_dropoff' ? recipientLabel || 'Delivery' : businessName}
                        </Text>
                        {etaMins != null && (
                            <Text style={styles.pillEta}>
                                · {etaMins <= 0 ? '<1m' : `${etaMins}m`} {currentPhase === 'to_dropoff' ? 'drop' : 'pickup'}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.pillRight}>
                    <Text style={styles.pillEarning}>€{netEarnings.toFixed(2)}</Text>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#6b7280"
                    />
                </View>
            </View>

            {/* Expanded Details */}
            {isExpanded && (
                <View style={styles.expandedPanel}>
                    {currentPhase === 'to_pickup' ? (
                        <>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Business</Text>
                                <Text style={styles.detailValue} numberOfLines={1}>{businessName}</Text>
                            </View>
                            {allItems.length > 0 && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Items</Text>
                                    <Text style={styles.detailValue}>
                                        {totalStockUnits > 0 && `📦 ${totalStockUnits}`}
                                        {totalStockUnits > 0 && totalMarketUnits > 0 && ' · '}
                                        {totalMarketUnits > 0 && `🛒 ${totalMarketUnits}`}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Recipient</Text>
                                <Text style={styles.detailValue} numberOfLines={1}>{recipientLabel || '—'}</Text>
                            </View>
                            {order.dropOffLocation?.address && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Destination</Text>
                                    <Text style={styles.detailValue} numberOfLines={1}>
                                        {order.dropOffLocation.address.split(',')[0]}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* Financial Summary */}
                    <View style={styles.financialSummary}>
                        <View style={[styles.financialRow, styles.financialRowNet]}>
                            <Text style={styles.financialNetLabel}>You Keep</Text>
                            <Text style={styles.financialNetValue}>€{netEarnings.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.3)',
    },
    containerExpanded: {
        borderColor: 'rgba(0,157,224,0.38)',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
        backgroundColor: 'rgba(26,26,46,0.72)',
    },
    pillDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#009de0',
    },
    pillContent: {
        flex: 1,
    },
    pillTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E2E8F0',
    },
    pillSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    pillSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 4,
    },
    pillEta: {
        fontSize: 11,
        color: '#67E8F9',
        fontWeight: '700',
    },
    pillRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    pillEarning: {
        fontSize: 13,
        fontWeight: '800',
        color: '#22c55e',
    },
    expandedPanel: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(15,23,42,0.82)',
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    detailValue: {
        fontSize: 12,
        color: '#CBD5E1',
        flex: 1,
        textAlign: 'right',
    },
    financialSummary: {
        backgroundColor: 'rgba(12,18,33,0.86)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,157,224,0.22)',
        marginTop: 4,
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    financialLabel: {
        fontSize: 11,
        color: '#94A3B8',
    },
    financialValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E2E8F0',
    },
    financialRowNet: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.2)',
        paddingTop: 6,
    },
    financialNetLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#15803d',
    },
    financialNetValue: {
        fontSize: 14,
        fontWeight: '900',
        color: '#22c55e',
    },
});
