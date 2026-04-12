import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';

interface Props {
    orders: any[];
    accepting?: boolean;
    onAccept: (order: any) => void;
    onAcceptAndNavigate: (order: any) => void;
    onClose: () => void;
}

export function OrderPoolSheet({ orders, accepting = false, onAccept, onAcceptAndNavigate, onClose }: Props) {
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
                        {orders.map((order: any) => {
                            const biz = order.businesses?.[0]?.business;
                            const bizName = biz?.name ?? 'Business';
                            const bizImageUrl = biz?.imageUrl;
                            const isRestaurant = biz?.businessType === 'RESTAURANT';
                            const itemCount = (order.businesses ?? []).reduce(
                                (acc: number, b: any) => acc + (b.items?.length ?? 0), 0,
                            );
                            const dropAddress = order.dropOffLocation?.address ?? '';
                            const shortAddress = dropAddress.split(',')[0] || s.see_map;
                            const deliveryFee = Number(order.deliveryPrice ?? 0).toFixed(2);
                            const orderTip = Number(order.driverTip ?? 0);
                            const isReady = order.status === 'READY';
                            const etaLabel = (() => {
                                if (isReady) return s.ready_now;
                                if (order.estimatedReadyAt) {
                                    const diff = Math.ceil((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60_000);
                                    if (diff > 0) return s.min.replace('{{min}}', String(diff));
                                    return s.almost_ready;
                                }
                                return s.preparing;
                            })();

                            return (
                                <View key={order.id} style={styles.card}>
                                    {/* Left accent */}
                                    <View style={[styles.cardAccent, isReady && styles.cardAccentReady]} />

                                    <View style={styles.cardBody}>
                                        {/* Row 1: Business + Fee */}
                                        <View style={styles.cardTop}>
                                            {/* Business avatar */}
                                            <View style={styles.bizAvatarWrap}>
                                                {bizImageUrl ? (
                                                    <Image source={{ uri: bizImageUrl }} style={styles.bizImage} />
                                                ) : (
                                                    <View style={styles.bizInitialWrap}>
                                                        <Ionicons
                                                            name={isRestaurant ? 'restaurant' : 'storefront'}
                                                            size={16}
                                                            color="#a78bfa"
                                                        />
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.bizInfo}>
                                                <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                                                <Text style={styles.orderId}>#{order.displayId ?? '—'}</Text>
                                            </View>

                                            {/* Earnings */}
                                            <View style={styles.earningsBadge}>
                                                <Text style={styles.earningsLabel}>{s.earn}</Text>
                                                <Text style={styles.earningsValue}>€{deliveryFee}{orderTip > 0 ? ` +€${orderTip.toFixed(2)}` : ''}</Text>
                                            </View>
                                        </View>

                                        {/* Row 2: meta chips */}
                                        <View style={styles.metaRow}>
                                            <View style={[styles.chip, isReady ? styles.chipReady : styles.chipPreparing]}>
                                                <View style={[styles.chipDot, isReady ? styles.chipDotReady : styles.chipDotPreparing]} />
                                                <Text style={[styles.chipText, isReady ? styles.chipTextReady : styles.chipTextPreparing]}>
                                                    {etaLabel}
                                                </Text>
                                            </View>

                                            <View style={styles.chip}>
                                                <Ionicons name="bag-handle-outline" size={11} color="#64748b" />
                                                <Text style={styles.chipText}>
                                                    {itemCount} {itemCount === 1 ? s.item : s.items}
                                                </Text>
                                            </View>

                                            <View style={[styles.chip, styles.chipFlex]}>
                                                <Ionicons name="navigate-outline" size={11} color="#64748b" />
                                                <Text style={styles.chipText} numberOfLines={1}>{shortAddress}</Text>
                                            </View>
                                        </View>

                                        {/* Row 3: direct action CTAs */}
                                        <View style={styles.ctaRow}>
                                            <Pressable
                                                style={[styles.ctaBtn, styles.ctaBtnAccept]}
                                                onPress={() => onAccept(order)}
                                                disabled={accepting}
                                            >
                                                {accepting ? (
                                                    <ActivityIndicator size={13} color="#fff" />
                                                ) : (
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                )}
                                                <Text style={styles.ctaBtnText}>{s.accept}</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.ctaBtn, styles.ctaBtnNavigate]}
                                                onPress={() => onAcceptAndNavigate(order)}
                                                disabled={accepting}
                                            >
                                                {accepting ? (
                                                    <ActivityIndicator size={13} color="#fff" />
                                                ) : (
                                                    <Ionicons name="navigate" size={14} color="#fff" />
                                                )}
                                                <Text style={styles.ctaBtnText}>{s.accept_go}</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
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
        gap: 10,
    },

    /* Card */
    card: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    cardAccent: {
        width: 3,
        backgroundColor: '#6366f1',
        borderRadius: 3,
        marginVertical: 12,
        marginLeft: 12,
        minHeight: 60,
    },
    cardAccentReady: {
        backgroundColor: '#22c55e',
    },
    cardBody: {
        flex: 1,
        padding: 12,
        gap: 9,
    },

    /* Card top row */
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bizAvatarWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        overflow: 'hidden',
    },
    bizImage: {
        width: 38,
        height: 38,
        borderRadius: 12,
    },
    bizInitialWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(167,139,250,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bizInfo: {
        flex: 1,
    },
    bizName: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    orderId: {
        color: '#475569',
        fontSize: 11,
        marginTop: 1,
    },
    earningsBadge: {
        alignItems: 'flex-end',
    },
    earningsLabel: {
        color: '#475569',
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    earningsValue: {
        color: '#4ade80',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.5,
    },

    /* Meta chips row */
    metaRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
    },
    chipFlex: {
        flex: 1,
        minWidth: 0,
    },
    chipReady: {
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(34,197,94,0.2)',
    },
    chipPreparing: {
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(251,191,36,0.15)',
    },
    chipDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    chipDotReady: {
        backgroundColor: '#22c55e',
    },
    chipDotPreparing: {
        backgroundColor: '#fbbf24',
    },
    chipText: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '500',
    },
    chipTextReady: {
        color: '#4ade80',
        fontWeight: '600',
    },
    chipTextPreparing: {
        color: '#fbbf24',
        fontWeight: '600',
    },

    /* Card footer / CTA */
    ctaRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
    },
    ctaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
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
        fontSize: 12,
        fontWeight: '700',
    },
});
