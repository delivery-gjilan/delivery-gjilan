import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';
import type { DriverOrder } from '@/utils/types';

interface Props {
    orders: DriverOrder[];
    accepting?: boolean;
    onAccept: (order: DriverOrder) => void;
    onAcceptAndNavigate: (order: DriverOrder) => void;
    onViewDetails: (order: DriverOrder) => void;
    onClose: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBizToDropoffKm(order: DriverOrder): string | null {
    const bizLoc = order.businesses?.[0]?.business?.location;
    const dropLoc = order.dropOffLocation;
    const lat1 = Number(bizLoc?.latitude), lon1 = Number(bizLoc?.longitude);
    const lat2 = Number(dropLoc?.latitude), lon2 = Number(dropLoc?.longitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return `${(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)} km`;
}

function ItemThumb({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
    if (imageUrl) return <Image source={{ uri: imageUrl }} style={{ width: 20, height: 20, borderRadius: 4 }} />;
    return (
        <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: 'rgba(148,163,184,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#cbd5e1', fontSize: 9, fontWeight: '800' }}>{name.charAt(0).toUpperCase()}</Text>
        </View>
    );
}

// ─── Pool card ────────────────────────────────────────────────────────────────

function PoolCard({ order, accepting, onAccept, onAcceptAndNavigate, onViewDetails, s }: {
    order: DriverOrder;
    accepting: boolean;
    onAccept: (o: DriverOrder) => void;
    onAcceptAndNavigate: (o: DriverOrder) => void;
    onViewDetails: (o: DriverOrder) => void;
    s: Record<string, string>;
}) {
    const biz = order.businesses?.[0]?.business;
    const bizName = biz?.name ?? 'Business';
    const dropAddress = order.dropOffLocation?.address ?? '—';
    const isDirectDispatch = order.channel === 'DIRECT_DISPATCH';
    const recipientLabel = order.recipientName ?? order.recipientPhone ?? null;

    const orderPrice = Number((order as any).orderPrice ?? 0);
    const inventoryPrice = Number((order as any).inventoryPrice ?? 0);
    const businessPrice = Math.max(0, orderPrice - inventoryPrice);
    const cashToCollect = Number((order as any).cashToCollect ?? 0);
    const totalPrice = Number(order.totalPrice ?? 0);
    const collectFromCustomer = isDirectDispatch ? cashToCollect : totalPrice;
    const showCollectAmount = !isDirectDispatch || cashToCollect > 0;
    const driverTakeHome = Number(order.driverTakeHomePreview ?? order.deliveryPrice ?? 0);

    const items = order.businesses?.flatMap((b) => b.items ?? []) ?? [];
    const totalStockUnits = items.reduce((sum, it) => sum + (it.inventoryQuantity ?? 0), 0);
    const totalMarketUnits = items.reduce((sum, it) => sum + Math.max(0, it.quantity - (it.inventoryQuantity ?? 0)), 0);
    const stockItems = items.filter((it) => (it.inventoryQuantity ?? 0) > 0);
    const bizItems = items.filter((it) => Math.max(0, it.quantity - (it.inventoryQuantity ?? 0)) > 0);
    const hasInventoryCoverage = totalStockUnits > 0;
    const dropoffDistanceLabel = formatBizToDropoffKm(order);

    const isReady = order.status === 'READY';
    const isPreparing = order.status === 'PREPARING';
    const etaLabel = (() => {
        if (isReady) return s.ready_now ?? 'Ready now';
        if (order.estimatedReadyAt) {
            const diff = Math.ceil((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60_000);
            if (diff > 0) return (s.min ?? '{{min}} min').replace('{{min}}', String(diff));
            return s.almost_ready ?? 'Almost ready';
        }
        return s.preparing ?? 'Preparing';
    })();

    const statusColor = isReady ? '#22c55e' : isPreparing ? '#f59e0b' : '#6b7280';

    return (
        <View style={[styles.card, isDirectDispatch && styles.cardDirect]}>
            {isDirectDispatch && <View style={{ height: 3, backgroundColor: '#f97316' }} />}

            {/* Top bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#f1f5f9', flexShrink: 1 }} numberOfLines={1}>{bizName}</Text>
                    {isDirectDispatch && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.5)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Ionicons name="call" size={9} color="#f97316" />
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#ea580c' }}>DIRECT</Text>
                        </View>
                    )}
                    <View style={{ backgroundColor: 'rgba(148,163,184,0.18)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>#{order.displayId}</Text>
                    </View>
                </View>
                <View style={{ backgroundColor: statusColor + '20', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>{etaLabel}</Text>
                </View>
            </View>

            {isDirectDispatch && recipientLabel && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#f97316' }} numberOfLines={1}>{recipientLabel}</Text>
                </View>
            )}

            {/* Pickup plan */}
            {items.length > 0 && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>Pickup Plan</Text>
                    {hasInventoryCoverage ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#c4b5fd' }}>Inventory</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#a78bfa' }}>×{totalStockUnits}</Text>
                                </View>
                                {stockItems.slice(0, 3).map((item, idx) => (
                                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 }}>
                                        <ItemThumb imageUrl={item.imageUrl} name={item.name} />
                                        <Text style={{ flex: 1, fontSize: 11, color: '#e2e8f0' }} numberOfLines={1}>{item.name}</Text>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#a78bfa' }}>×{item.inventoryQuantity ?? 0}</Text>
                                    </View>
                                ))}
                                {stockItems.length > 3 && <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>+{stockItems.length - 3} more</Text>}
                            </View>
                            <View style={{ width: 1, backgroundColor: 'rgba(148,163,184,0.18)' }} />
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#7dd3fc' }}>Business</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#38bdf8' }}>×{totalMarketUnits}</Text>
                                </View>
                                {bizItems.slice(0, 3).map((item, idx) => {
                                    const fromBiz = Math.max(0, item.quantity - (item.inventoryQuantity ?? 0));
                                    return (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 }}>
                                            <ItemThumb imageUrl={item.imageUrl} name={item.name} />
                                            <Text style={{ flex: 1, fontSize: 11, color: '#e2e8f0' }} numberOfLines={1}>{item.name}</Text>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#38bdf8' }}>×{fromBiz}</Text>
                                        </View>
                                    );
                                })}
                                {bizItems.length > 3 && <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>+{bizItems.length - 3} more</Text>}
                            </View>
                        </View>
                    ) : (
                        <View>
                            {items.slice(0, 3).map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 }}>
                                    <ItemThumb imageUrl={item.imageUrl} name={item.name} />
                                    <Text style={{ flex: 1, fontSize: 11, color: '#e2e8f0' }} numberOfLines={1}>{item.name}</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>×{item.quantity}</Text>
                                </View>
                            ))}
                            {items.length > 3 && <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>+{items.length - 3} more</Text>}
                        </View>
                    )}
                </View>
            )}

            {/* Route + Order Summary */}
            <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 6 }}>
                <View style={{ backgroundColor: 'rgba(2,132,199,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', paddingHorizontal: 8, paddingVertical: 6, gap: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.4 }}>Route</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#bae6fd' }}>Drop-off</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#e0f2fe' }} numberOfLines={1}>
                            {dropoffDistanceLabel ? `${dropoffDistanceLabel} from pickup` : dropAddress.split(',')[0] || '—'}
                        </Text>
                    </View>
                </View>

                <View style={{ backgroundColor: 'rgba(15,23,42,0.45)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(148,163,184,0.15)', paddingHorizontal: 8, paddingVertical: 6, gap: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>Order</Text>
                    {!isDirectDispatch && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, color: '#fca5a5' }}>Give business</Text>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f87171' }}>€{businessPrice.toFixed(2)}</Text>
                        </View>
                    )}
                    {inventoryPrice > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, color: '#c4b5fd' }}>Owed to platform</Text>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#a78bfa' }}>€{inventoryPrice.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#93c5fd' }}>Collect from customer</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#38bdf8' }}>
                            {showCollectAmount ? `€${collectFromCustomer.toFixed(2)}` : 'Confirm at pickup'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#86efac', fontWeight: '700' }}>Your cut</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>€{driverTakeHome.toFixed(2)}</Text>
                    </View>
                </View>
            </View>

            {/* CTAs */}
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
                <Pressable style={[styles.ctaBtn, styles.ctaBtnAccept]} onPress={() => onAccept(order)} disabled={accepting}>
                    {accepting ? <ActivityIndicator size={13} color="#fff" /> : <Ionicons name="checkmark" size={14} color="#fff" />}
                    <Text style={styles.ctaBtnText}>{s.accept ?? 'Accept'}</Text>
                </Pressable>
                <Pressable style={[styles.ctaBtn, styles.ctaBtnNavigate]} onPress={() => onAcceptAndNavigate(order)} disabled={accepting}>
                    {accepting ? <ActivityIndicator size={13} color="#fff" /> : <Ionicons name="navigate" size={14} color="#fff" />}
                    <Text style={styles.ctaBtnText}>{s.accept_go ?? 'Accept & Go'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

export function OrderPoolSheet({ orders, accepting = false, onAccept, onAcceptAndNavigate, onViewDetails, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const s = t.orderPool;
    const slideAnim = useRef(new Animated.Value(500)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 280, mass: 0.9 }),
            Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, []);

    const dismiss = () => {
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 500, useNativeDriver: true, damping: 20, stiffness: 300 }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(onClose);
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
                <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[styles.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: slideAnim }] }]}
                pointerEvents="auto"
            >
                {/* Handle bar */}
                <View style={styles.handleWrap}>
                    <View style={styles.handle} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.headerDot} />
                        <Text style={styles.headerTitle}>{s.available_orders}</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{orders.length}</Text>
                        </View>
                    </View>
                    <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={8}>
                        <Ionicons name="close" size={16} color="#64748b" />
                    </Pressable>
                </View>

                {orders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="storefront-outline" size={28} color="#334155" />
                        </View>
                        <Text style={styles.emptyTitle}>{s.no_orders_title}</Text>
                        <Text style={styles.emptySubtitle}>{s.no_orders_sub}</Text>
                    </View>
                ) : (
                    <ScrollView
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                    >
                        {orders.map((order) => (
                            <PoolCard
                                key={order.id}
                                order={order}
                                accepting={accepting}
                                onAccept={onAccept}
                                onAcceptAndNavigate={onAcceptAndNavigate}
                                onViewDetails={onViewDetails}
                                s={s}
                            />
                        ))}
                    </ScrollView>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 240,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 250,
        backgroundColor: '#0b1120',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '76%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 32,
        overflow: 'hidden',
    },

    /* Handle */
    handleWrap: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22d3ee',
    },
    headerTitle: {
        color: '#f1f5f9',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    countBadge: {
        backgroundColor: 'rgba(34,211,238,0.12)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.2)',
    },
    countText: {
        color: '#22d3ee',
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },

    /* Empty state */
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 10,
    },
    emptyIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '700',
    },
    emptySubtitle: {
        color: '#334155',
        fontSize: 12,
    },

    /* List */
    list: {
        padding: 14,
        gap: 12,
    },

    /* Card */
    card: {
        backgroundColor: 'rgba(17,24,39,0.95)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,157,224,0.3)',
        overflow: 'hidden',
    },
    cardDirect: {
        backgroundColor: 'rgba(249,115,22,0.06)',
        borderColor: 'rgba(249,115,22,0.3)',
    },

    /* Card footer / CTA */
    ctaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 10,
    },
    ctaBtnAccept: {
        backgroundColor: '#16a34a',
    },
    ctaBtnNavigate: {
        backgroundColor: '#4f46e5',
    },
    ctaBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});
