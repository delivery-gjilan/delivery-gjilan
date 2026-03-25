import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Animated, Easing, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@apollo/client/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { GET_ACTIVE_GLOBAL_PROMOTIONS } from '@/graphql/operations/promotions';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** Describes a displayable promotion for the banner */
interface PromoBannerInfo {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    gradient: [string, string];
}

export function GlobalPromoBanner() {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { data } = useQuery(GET_ACTIVE_GLOBAL_PROMOTIONS, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 60_000, // refresh every minute
        context: { silentErrors: true }, // don't toast if the server doesn't have this query yet
    });

    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const promos = useMemo<PromoBannerInfo[]>(() => {
        const list = (data as any)?.getActiveGlobalPromotions;
        if (!list || !Array.isArray(list)) return [];

        return list
            .filter((p: any) => p.isActive && !dismissed.has(p.id))
            .map((p: any): PromoBannerInfo => {
                if (p.type === 'FREE_DELIVERY') {
                    return {
                        id: p.id,
                        icon: 'bicycle-outline',
                        label: p.description || t.cart.free_delivery || 'Free delivery on all orders!',
                        gradient: ['#059669', '#10B981'] as [string, string],
                    };
                }
                if (p.type === 'PERCENTAGE') {
                    return {
                        id: p.id,
                        icon: 'pricetag-outline',
                        label: p.description || `${p.discountValue}% off your order!`,
                        gradient: ['#7C3AED', '#A78BFA'] as [string, string],
                    };
                }
                if (p.type === 'FIXED_AMOUNT') {
                    return {
                        id: p.id,
                        icon: 'cash-outline',
                        label: p.description || `€${p.discountValue?.toFixed(2)} off your order!`,
                        gradient: ['#D97706', '#F59E0B'] as [string, string],
                    };
                }
                if (p.type?.startsWith('SPEND_X_')) {
                    return {
                        id: p.id,
                        icon: 'trending-up-outline',
                        label: p.description || `Spend €${p.spendThreshold?.toFixed(2)} and save!`,
                        gradient: ['#2563EB', '#60A5FA'] as [string, string],
                    };
                }
                return {
                    id: p.id,
                    icon: 'gift-outline',
                    label: p.description || p.name,
                    gradient: ['#7C3AED', '#A78BFA'] as [string, string],
                };
            });
    }, [data, dismissed, t]);

    // ---- Animations ----
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const iconPulse = useRef(new Animated.Value(1)).current;
    const isVisible = promos.length > 0;

    // Slide in/out
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isVisible ? 0 : -120,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [isVisible]);

    // Shimmer loop
    useEffect(() => {
        if (!isVisible) return;
        const loop = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 2500,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [isVisible]);

    // Icon pulse
    useEffect(() => {
        if (!isVisible) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(iconPulse, { toValue: 1.2, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(iconPulse, { toValue: 1, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [isVisible]);

    if (!isVisible) return null;

    // Show first promo (could rotate, but let's keep it simple)
    const promo = promos[0];

    const shimmerTranslateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                overflow: 'hidden',
            }}
        >
            <LinearGradient
                colors={promo.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: insets.top + 8,
                    paddingBottom: 10,
                    paddingHorizontal: 16,
                    overflow: 'hidden',
                }}
            >
                {/* Shimmer overlay */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: 80,
                        transform: [{ translateX: shimmerTranslateX }, { skewX: '-20deg' }],
                        backgroundColor: 'rgba(255,255,255,0.15)',
                    }}
                />

                {/* Icon */}
                <Animated.View style={{ transform: [{ scale: iconPulse }], marginRight: 10 }}>
                    <Ionicons name={promo.icon} size={20} color="rgba(255,255,255,0.9)" />
                </Animated.View>

                {/* Label */}
                <Text
                    numberOfLines={1}
                    style={{
                        flex: 1,
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: '700',
                        letterSpacing: 0.3,
                    }}
                >
                    {promo.label}
                </Text>

                {/* Dismiss */}
                <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setDismissed((prev) => new Set(prev).add(promo.id))}
                >
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    );
}
