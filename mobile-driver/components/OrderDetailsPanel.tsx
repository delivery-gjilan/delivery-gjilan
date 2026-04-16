import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { DriverOrder } from '@/utils/types';

interface Props {
    order: DriverOrder;
    isExpanded?: boolean;
    onToggle?: () => void;
    onNavigate?: () => void;
}

export function OrderDetailsPanel({
    order,
    isExpanded = false,
    onToggle,
    onNavigate,
}: Props) {
    const theme = useTheme();
    const isDirectDispatch = order.channel === 'DIRECT_DISPATCH';
    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const recipientLabel = order.recipientName ?? order.recipientPhone ?? '—';
    const netEarnings = Number(order.driverTakeHomePreview ?? 0);

    const allItems = (order.businesses ?? []).flatMap((b) => b.items ?? []);
    const itemCount = allItems.length;
    const totalStockUnits = allItems.reduce((sum, it) => sum + (it.inventoryQuantity ?? 0), 0);
    const totalMarketUnits = allItems.reduce((sum, it) => sum + Math.max(0, it.quantity - (it.inventoryQuantity ?? 0)), 0);

    const statusColor =
        order.status === 'READY' ? '#22c55e'
        : order.status === 'PREPARING' ? '#f59e0b'
        : order.status === 'OUT_FOR_DELIVERY' ? '#3b82f6'
        : '#6b7280';

    const statusLabel =
        order.status === 'READY' ? 'Ready'
        : order.status === 'PREPARING' ? 'Preparing'
        : order.status === 'OUT_FOR_DELIVERY' ? 'Out for delivery'
        : order.status;

    return (
        <View style={[styles.container, isDirectDispatch && styles.containerDD]}>
            {/* Collapsed Header - Always Visible */}
            <Pressable
                onPress={onToggle}
                style={[styles.header, isDirectDispatch && styles.headerDD]}
            >
                <View style={styles.headerLeft}>
                    <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.businessName} numberOfLines={1}>
                            {bizName}
                        </Text>
                        <View style={styles.headerSubtitle}>
                            <Text style={styles.headerSubtitleText} numberOfLines={1}>
                                {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'No items'}
                                {' · '}
                                €{netEarnings.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>
                <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={isDirectDispatch ? '#f97316' : theme.colors.subtext}
                />
            </Pressable>

            {/* Expanded Details */}
            {isExpanded && (
                <View style={styles.expandedContent}>
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>FROM BUSINESS</Text>
                        <Text style={styles.pickupName} numberOfLines={1}>{bizName}</Text>
                        <Text style={styles.status} numberOfLines={1}>
                            {statusLabel}
                            {order.estimatedReadyAt && order.status === 'PREPARING' && (
                                <Text>
                                    {' · Ready in '}
                                    {Math.ceil(
                                        (new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60000,
                                    )}
                                    {' min'}
                                </Text>
                            )}
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>DELIVERY TO</Text>
                        <Text style={styles.recipientName} numberOfLines={1}>{recipientLabel}</Text>
                        {order.dropOffLocation?.address && (
                            <Text style={styles.address} numberOfLines={1}>
                                📍 {order.dropOffLocation.address.split(',')[0]}
                            </Text>
                        )}
                    </View>

                    {itemCount > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>CONTENTS</Text>
                            {allItems.slice(0, 3).map((item, idx) => {
                                const fromStock = item.inventoryQuantity ?? 0;
                                const fromMarket = Math.max(0, item.quantity - fromStock);
                                return (
                                    <View key={idx} style={styles.itemLine}>
                                        <Text style={styles.itemName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <View style={styles.itemBadges}>
                                            {fromStock > 0 && (
                                                <Text style={styles.itemBadge}>📦 ×{fromStock}</Text>
                                            )}
                                            {fromMarket > 0 && (
                                                <Text style={styles.itemBadge}>🛒 ×{fromMarket}</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                            {itemCount > 3 && (
                                <Text style={styles.itemsMore}>+{itemCount - 3} more items</Text>
                            )}
                        </View>
                    )}

                    <View style={[styles.section, styles.financialSection]}>
                        <Text style={styles.sectionLabel}>YOUR EARNINGS</Text>
                        <View style={[styles.earningsRow, styles.netRow]}>
                            <Text style={styles.netLabel}>You Keep:</Text>
                            <Text style={styles.netAmount}>€{netEarnings.toFixed(2)}</Text>
                        </View>
                    </View>

                    {onNavigate && (
                        <Pressable
                            onPress={onNavigate}
                            style={[styles.navigateBtn, isDirectDispatch && styles.navigateBtnDD]}
                        >
                            <Ionicons
                                name="navigate-outline"
                                size={18}
                                color="#fff"
                            />
                            <Text style={styles.navigateBtnText}>Navigate</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.28)',
        marginBottom: 10,
        overflow: 'hidden',
    },
    containerDD: {
        borderColor: 'rgba(0,157,224,0.42)',
        backgroundColor: 'rgba(0,109,163,0.2)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: 'rgba(26,26,46,0.7)',
    },
    headerDD: {
        backgroundColor: 'rgba(0,157,224,0.18)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        flexShrink: 0,
    },
    businessName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#E2E8F0',
    },
    headerSubtitle: {
        marginTop: 3,
    },
    headerSubtitleText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    expandedContent: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.2)',
    },
    section: {
        marginBottom: 10,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    pickupName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E2E8F0',
    },
    recipientName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E2E8F0',
    },
    status: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    address: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    itemLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 2,
        backgroundColor: 'rgba(30,41,59,0.55)',
        borderRadius: 6,
    },
    itemName: {
        fontSize: 12,
        color: '#CBD5E1',
        flex: 1,
    },
    itemBadges: {
        flexDirection: 'row',
        gap: 4,
    },
    itemBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    itemsMore: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    financialSection: {
        backgroundColor: 'rgba(12,18,33,0.72)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,157,224,0.25)',
        marginBottom: 0,
    },
    earningsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    earningsLabel: {
        fontSize: 12,
        color: '#94A3B8',
    },
    earningsAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#22c55e',
    },
    deductionLabel: {
        fontSize: 12,
        color: '#94A3B8',
    },
    deductionAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ef4444',
    },
    netRow: {
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.2)',
    },
    netLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#15803d',
    },
    netAmount: {
        fontSize: 16,
        fontWeight: '900',
        color: '#22c55e',
    },
    navigateBtn: {
        backgroundColor: '#006da3',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,157,224,0.4)',
        marginTop: 10,
    },
    navigateBtnDD: {
        backgroundColor: '#3a0ca3',
    },
    navigateBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});
