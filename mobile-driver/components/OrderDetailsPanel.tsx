import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    const isDirectDispatch = order.channel === 'DIRECT_DISPATCH';
    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const recipientLabel = order.recipientName ?? order.recipientPhone ?? null;
    const netEarnings = Number(order.driverTakeHomePreview ?? 0);
    const allItems = (order.businesses ?? []).flatMap((b) => b.items ?? []);
    const itemCount = allItems.length;

    const statusColor =
        order.status === 'READY' ? '#22c55e'
        : order.status === 'PREPARING' ? '#f59e0b'
        : order.status === 'OUT_FOR_DELIVERY' ? '#3b82f6'
        : '#6b7280';

    const statusLabel =
        order.status === 'READY' ? 'Ready'
        : order.status === 'PREPARING' ? 'Preparing'
        : order.status === 'OUT_FOR_DELIVERY' ? 'Delivering'
        : order.status;

    return (
        <View style={[styles.container, isDirectDispatch && styles.containerDD]}>
            {/* Left status accent bar */}
            <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

            <View style={styles.inner}>
                {/* Main row — always visible */}
                <Pressable style={styles.mainRow} onPress={onToggle}>
                    <View style={styles.infoBlock}>
                        <View style={styles.bizRow}>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                            {isDirectDispatch && (
                                <View style={styles.ddChip}>
                                    <Ionicons name="call" size={9} color="#fff" />
                                    <Text style={styles.ddChipText}>Direct</Text>
                                </View>
                            )}
                        </View>
                        {recipientLabel ? (
                            <Text style={styles.subText} numberOfLines={1}>{recipientLabel}</Text>
                        ) : (
                            <Text style={styles.subText} numberOfLines={1}>
                                {statusLabel}{itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}
                            </Text>
                        )}
                    </View>

                    <View style={styles.rightBlock}>
                        <View style={styles.earningsChip}>
                            <Text style={styles.earningsText}>€{netEarnings.toFixed(2)}</Text>
                        </View>
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color="#475569"
                        />
                    </View>
                </Pressable>

                {/* Expanded content */}
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.expandedTopRow}>
                            <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '35' }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                            {order.estimatedReadyAt && order.status === 'PREPARING' && (() => {
                                const mins = Math.ceil((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60000);
                                return (
                                    <Text style={styles.etaText}>
                                        {mins > 0 ? `Ready in ${mins} min` : 'Almost ready'}
                                    </Text>
                                );
                            })()}
                        </View>

                        {order.dropOffLocation?.address && (
                            <View style={styles.detailRow}>
                                <Ionicons name="location-outline" size={12} color="#475569" />
                                <Text style={styles.detailText} numberOfLines={1}>
                                    {order.dropOffLocation.address.split(',')[0]}
                                </Text>
                            </View>
                        )}

                        {itemCount > 0 && (
                            <View style={styles.itemsList}>
                                {allItems.slice(0, 5).map((item, idx) => (
                                    <View key={idx} style={styles.itemsListRow}>
                                        {(item as any).imageUrl ? (
                                            <Image source={{ uri: (item as any).imageUrl }} style={styles.itemThumb} />
                                        ) : (
                                            <View style={styles.itemThumbFallback}>
                                                <Text style={styles.itemThumbText}>{item.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.itemsListName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.itemsListQty}>×{item.quantity}</Text>
                                    </View>
                                ))}
                                {itemCount > 5 && (
                                    <Text style={styles.itemsMore}>+{itemCount - 5} more items</Text>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(10,14,26,0.90)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        marginBottom: 10,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 10,
        elevation: 8,
    },
    containerDD: {
        borderColor: 'rgba(249,115,22,0.28)',
        backgroundColor: 'rgba(18,10,4,0.92)',
    },
    accentBar: {
        width: 4,
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
    },
    inner: {
        flex: 1,
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    infoBlock: {
        flex: 1,
        gap: 3,
    },
    bizRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bizName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#e2e8f0',
        flex: 1,
    },
    ddChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F97316',
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    ddChipText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#fff',
    },
    subText: {
        fontSize: 11,
        color: '#64748b',
    },
    rightBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    earningsChip: {
        backgroundColor: 'rgba(22,163,74,0.18)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.28)',
    },
    earningsText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#22c55e',
    },
    expandedContent: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 2,
        gap: 7,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    expandedTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    etaText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
        color: '#64748b',
        flex: 1,
    },
    itemsList: {
        gap: 5,
        marginTop: 2,
    },
    itemsListRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemThumb: {
        width: 26,
        height: 26,
        borderRadius: 5,
        flexShrink: 0,
    },
    itemThumbFallback: {
        width: 26,
        height: 26,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    itemThumbText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    itemsListName: {
        fontSize: 12,
        color: '#94a3b8',
        flex: 1,
    },
    itemsListQty: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    itemsMore: {
        fontSize: 10,
        color: '#475569',
        textAlign: 'center',
        marginTop: 2,
    },
});
