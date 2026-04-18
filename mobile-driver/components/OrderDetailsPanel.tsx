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

// ─────────────────────────────────────────────────────────────────────────────
//  OrderDetailsPanel — compact card shown at the top of the map while an order
//  is active.  Has a coloured status strip, key info row, and optional item
//  list when expanded.
// ─────────────────────────────────────────────────────────────────────────────

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
    const shortAddress = order.dropOffLocation?.address
        ? order.dropOffLocation.address.split(',')[0]
        : null;

    const statusColor =
        order.status === 'READY' ? '#22c55e'
        : order.status === 'PREPARING' ? '#f59e0b'
        : order.status === 'OUT_FOR_DELIVERY' ? '#3b82f6'
        : '#6b7280';

    const statusLabel =
        order.status === 'READY' ? 'Ready for pickup'
        : order.status === 'PREPARING' ? 'Preparing'
        : order.status === 'OUT_FOR_DELIVERY' ? 'Delivering'
        : order.status;

    const etaMins = order.estimatedReadyAt && order.status === 'PREPARING'
        ? Math.ceil((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60000)
        : null;

    return (
        <View style={[styles.card, isDirectDispatch && styles.cardDD]}>
            {/* Top status strip */}
            <View style={[styles.statusStrip, { backgroundColor: statusColor }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{statusLabel}</Text>
                {etaMins !== null && etaMins > 0 && (
                    <Text style={styles.etaText}>· ready in {etaMins} min</Text>
                )}
                {isDirectDispatch && (
                    <View style={styles.ddPill}>
                        <Ionicons name="call" size={8} color="#fff" />
                        <Text style={styles.ddPillText}>Direct</Text>
                    </View>
                )}
            </View>

            {/* Main content — tappable to expand items */}
            <Pressable style={styles.body} onPress={onToggle}>
                {/* Row 1: biz + earnings */}
                <View style={styles.mainRow}>
                    <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                    <View style={styles.earningsChip}>
                        <Text style={styles.earningsText}>€{netEarnings.toFixed(2)}</Text>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color="#334155"
                    />
                </View>

                {/* Row 2: recipient / address */}
                <View style={styles.subRow}>
                    <Ionicons name="person-outline" size={11} color="#475569" />
                    <Text style={styles.subText} numberOfLines={1}>
                        {recipientLabel ?? `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                    </Text>
                    {shortAddress ? (
                        <>
                            <Text style={styles.subSep}>·</Text>
                            <Ionicons name="location-outline" size={11} color="#475569" />
                            <Text style={styles.addressText} numberOfLines={1}>{shortAddress}</Text>
                        </>
                    ) : null}
                </View>

                {/* Expanded item list */}
                {isExpanded && itemCount > 0 && (
                    <View style={styles.itemsList}>
                        {allItems.slice(0, 5).map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                {(item as any).imageUrl ? (
                                    <Image source={{ uri: (item as any).imageUrl }} style={styles.itemThumb} />
                                ) : (
                                    <View style={styles.itemThumbFallback}>
                                        <Text style={styles.itemThumbText}>{item.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.itemQty}>×{item.quantity}</Text>
                            </View>
                        ))}
                        {itemCount > 5 && (
                            <Text style={styles.itemsMore}>+{itemCount - 5} more</Text>
                        )}
                    </View>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(10,14,26,0.92)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    cardDD: {
        borderColor: 'rgba(249,115,22,0.30)',
        backgroundColor: 'rgba(18,10,4,0.94)',
    },
    statusStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        gap: 5,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.55)',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    etaText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
    ddPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 'auto' as any,
    },
    ddPillText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#fff',
    },
    body: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 4,
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    bizName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#e2e8f0',
        flex: 1,
    },
    earningsChip: {
        backgroundColor: 'rgba(22,163,74,0.18)',
        borderRadius: 7,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.28)',
        flexShrink: 0,
    },
    earningsText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#22c55e',
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    subText: {
        fontSize: 11,
        color: '#64748b',
        flexShrink: 1,
    },
    subSep: {
        fontSize: 11,
        color: '#334155',
    },
    addressText: {
        fontSize: 11,
        color: '#64748b',
        flex: 1,
    },
    itemsList: {
        gap: 5,
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 7,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemThumb: {
        width: 24,
        height: 24,
        borderRadius: 5,
        flexShrink: 0,
    },
    itemThumbFallback: {
        width: 24,
        height: 24,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    itemThumbText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#475569',
    },
    itemName: {
        fontSize: 11,
        color: '#94a3b8',
        flex: 1,
    },
    itemQty: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    itemsMore: {
        fontSize: 10,
        color: '#475569',
        textAlign: 'center',
    },
});
