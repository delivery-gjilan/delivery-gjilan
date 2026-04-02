import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
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
    const slideAnim = useSharedValue(-120);
    const shimmerAnim = useSharedValue(0);
    const iconPulse = useSharedValue(1);
    const isVisible = promos.length > 0;

    const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideAnim.value }] }));
    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shimmerAnim.value * (SCREEN_WIDTH * 2) - SCREEN_WIDTH }, { skewX: '-20deg' }],
    }));
    const iconPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconPulse.value }] }));

    // Slide in/out
    useEffect(() => {
        slideAnim.value = withSpring(isVisible ? 0 : -120, { damping: 12, stiffness: 80 });
    }, [isVisible]);

    // Shimmer loop
    useEffect(() => {
        if (!isVisible) return;
        shimmerAnim.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.linear }), -1, false);
        return () => { shimmerAnim.value = 0; };
    }, [isVisible]);

    // Icon pulse
    useEffect(() => {
        if (!isVisible) return;
        iconPulse.value = withRepeat(withSequence(
            withTiming(1.2, { duration: 600, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) }),
        ), -1, false);
        return () => { iconPulse.value = 1; };
    }, [isVisible]);

    if (!isVisible) return null;

    // Show first promo (could rotate, but let's keep it simple)
    const promo = promos[0];

    return (
        <Reanimated.View
            style={[
                slideStyle,
                { overflow: 'hidden' },
            ]}
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
                <Reanimated.View
                    style={[
                        shimmerStyle,
                        {
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: 80,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                        },
                    ]}
                />

                {/* Icon */}
                <Reanimated.View style={[iconPulseStyle, { marginRight: 10 }]}>
                    <Ionicons name={promo.icon} size={20} color="rgba(255,255,255,0.9)" />
                </Reanimated.View>

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
        </Reanimated.View>
    );
}
