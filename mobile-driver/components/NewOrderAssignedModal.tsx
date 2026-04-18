import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DriverOrder } from '@/utils/types';

interface Props {
    order: DriverOrder;
    onDismiss: () => void;
}

export function NewOrderAssignedModal({ order, onDismiss }: Props) {
    const scaleAnim = useRef(new Animated.Value(0.72)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 60,
                friction: 9,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const bizName = order.businesses?.[0]?.business?.name ?? 'New order';
    const dropoffAddress = order.dropoffAddress ?? '';
    const earnings = Number(order.driverEarnings ?? 0).toFixed(2);
    const totalPrice = Number(order.totalPrice ?? 0).toFixed(2);
    const itemCount = (order.businesses ?? []).reduce(
        (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
        0,
    );

    return (
        <Modal transparent animationType="none" visible statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
            </Animated.View>

            {/* Card */}
            <View style={styles.centeredContainer} pointerEvents="box-none">
                <Animated.View
                    style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
                >
                    {/* Header accent strip */}
                    <View style={styles.headerStrip}>
                        <View style={styles.pulseRing}>
                            <Ionicons name="bag-add" size={26} color="#4ade80" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>New order assigned!</Text>
                            <Text style={styles.headerSub}>Admin assigned you a delivery</Text>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={onDismiss} hitSlop={10}>
                            <Ionicons name="close" size={18} color="#64748b" />
                        </Pressable>
                    </View>

                    {/* Business + address */}
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <Ionicons name="storefront-outline" size={16} color="#94a3b8" />
                            <Text style={styles.rowText} numberOfLines={1}>{bizName}</Text>
                        </View>
                        {!!dropoffAddress && (
                            <View style={styles.row}>
                                <Ionicons name="location-outline" size={16} color="#94a3b8" />
                                <Text style={styles.rowText} numberOfLines={2}>{dropoffAddress}</Text>
                            </View>
                        )}
                    </View>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>€{earnings}</Text>
                            <Text style={styles.statLabel}>Your cut</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>€{totalPrice}</Text>
                            <Text style={styles.statLabel}>Order total</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{itemCount}</Text>
                            <Text style={styles.statLabel}>{itemCount === 1 ? 'item' : 'items'}</Text>
                        </View>
                    </View>

                    {/* CTA */}
                    <Pressable style={styles.ctaBtn} onPress={onDismiss}>
                        <Text style={styles.ctaBtnText}>Got it</Text>
                        <Ionicons name="checkmark" size={18} color="#0a0f1a" />
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    centeredContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.25)',
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 20,
    },
    headerStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(74,222,128,0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(74,222,128,0.15)',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    pulseRing: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(74,222,128,0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(74,222,128,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#f1f5f9',
        fontSize: 16,
        fontWeight: '800',
    },
    headerSub: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    rowText: {
        color: '#94a3b8',
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    statValue: {
        color: '#f1f5f9',
        fontSize: 17,
        fontWeight: '800',
    },
    statLabel: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 4,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: 16,
        backgroundColor: '#4ade80',
        borderRadius: 14,
        paddingVertical: 14,
    },
    ctaBtnText: {
        color: '#0a0f1a',
        fontSize: 15,
        fontWeight: '800',
    },
});
