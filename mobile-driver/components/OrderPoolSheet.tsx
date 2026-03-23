import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    orders: any[];
    onSelectOrder: (order: any) => void;
    onClose: () => void;
}

export function OrderPoolSheet({ orders, onSelectOrder, onClose }: Props) {
    const insets = useSafeAreaInsets();

    return (
        /* Full-screen backdrop — tap outside panel to dismiss */
        <Pressable style={styles.backdrop} onPress={onClose}>
            {/* Panel — stop propagation so taps inside don't dismiss */}
            <Pressable
                style={[styles.panel, { top: insets.top + 8 }]}
                onPress={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Available Orders</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{orders.length}</Text>
                        </View>
                    </View>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={18} color="#94a3b8" />
                    </Pressable>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {orders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cube-outline" size={36} color="#334155" />
                        <Text style={styles.emptyTitle}>No orders available</Text>
                        <Text style={styles.emptySubtitle}>New orders will appear here</Text>
                    </View>
                ) : (
                    <ScrollView
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {orders.map((order: any) => {
                            const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
                            const itemCount = (order.businesses ?? []).reduce(
                                (acc: number, b: any) => acc + (b.items?.length ?? 0),
                                0,
                            );
                            const dropAddress = order.dropOffLocation?.address ?? '';
                            const shortAddress = dropAddress.split(',')[0] || 'See map';
                            const deliveryFee = Number(order.deliveryPrice ?? 0).toFixed(2);

                            return (
                                <Pressable
                                    key={order.id}
                                    style={styles.orderCard}
                                    onPress={() => onSelectOrder(order)}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.bizCircle}>
                                            <Text style={styles.bizInitial}>
                                                {bizName.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.cardHeaderText}>
                                            <Text style={styles.cardBizName} numberOfLines={1}>
                                                {bizName}
                                            </Text>
                                            <Text style={styles.cardOrderId}>
                                                #{order.displayId ?? '—'}
                                            </Text>
                                        </View>
                                        <View style={styles.feeBadge}>
                                            <Text style={styles.feeText}>€{deliveryFee}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardDetails}>
                                        <View style={styles.detailChip}>
                                            <Ionicons name="bag-handle-outline" size={12} color="#94a3b8" />
                                            <Text style={styles.detailText}>
                                                {itemCount} item{itemCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                        <View style={styles.detailChip}>
                                            <Ionicons name="location-outline" size={12} color="#94a3b8" />
                                            <Text style={styles.detailText} numberOfLines={1}>
                                                {shortAddress}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardAction}>
                                        <Text style={styles.viewText}>View & Accept</Text>
                                        <Ionicons name="chevron-forward" size={14} color="#22d3ee" />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}
            </Pressable>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 250,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    panel: {
        position: 'absolute',
        left: 12,
        right: 12,
        backgroundColor: '#0f172a',
        borderRadius: 20,
        maxHeight: '65%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
        elevation: 28,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        color: '#f1f5f9',
        fontSize: 16,
        fontWeight: '800',
    },
    countBadge: {
        backgroundColor: '#22d3ee',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    countText: {
        color: '#0f172a',
        fontSize: 12,
        fontWeight: '800',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginHorizontal: 18,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyTitle: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 4,
    },
    emptySubtitle: {
        color: '#475569',
        fontSize: 12,
    },
    listContent: {
        padding: 14,
        gap: 10,
    },
    orderCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    bizCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bizInitial: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    cardHeaderText: {
        flex: 1,
    },
    cardBizName: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '700',
    },
    cardOrderId: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 1,
    },
    feeBadge: {
        backgroundColor: 'rgba(34,211,238,0.1)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.2)',
    },
    feeText: {
        color: '#22d3ee',
        fontSize: 14,
        fontWeight: '800',
    },
    cardDetails: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    detailText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    cardAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    viewText: {
        color: '#22d3ee',
        fontSize: 12,
        fontWeight: '700',
    },
});
