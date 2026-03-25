import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Confetti particle ──────────────────────────────────
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6', '#34D399', '#FDE047'];
const PARTICLE_COUNT = 18;

interface ConfettiParticle {
    id: number;
    x: Animated.Value;
    y: Animated.Value;
    rotate: Animated.Value;
    scale: Animated.Value;
    opacity: Animated.Value;
    color: string;
    size: number;
}

function useConfetti() {
    const particles = useRef<ConfettiParticle[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);

    if (particles.current.length === 0) {
        particles.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            id: i,
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotate: new Animated.Value(0),
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            size: 6 + Math.random() * 6,
        }));
    }

    const fire = () => {
        setShowConfetti(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        particles.current.forEach((p) => {
            p.x.setValue(0);
            p.y.setValue(0);
            p.rotate.setValue(0);
            p.scale.setValue(0);
            p.opacity.setValue(1);

            const angle = (Math.random() * Math.PI * 2);
            const distance = 40 + Math.random() * 80;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance - 20; // bias upward

            Animated.parallel([
                Animated.timing(p.x, { toValue: targetX, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(p.y, { toValue: targetY + 40, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.timing(p.rotate, { toValue: Math.random() * 720, duration: 700, useNativeDriver: true }),
                Animated.sequence([
                    Animated.spring(p.scale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
                    Animated.timing(p.scale, { toValue: 0, duration: 200, delay: 300, useNativeDriver: true }),
                ]),
                Animated.timing(p.opacity, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }),
            ]).start();
        });

        setTimeout(() => setShowConfetti(false), 1000);
    };

    return { particles: particles.current, showConfetti, fire };
}

// ─── Progress bar component ──────────────────────────────
interface PromotionProgressBarProps {
    /** 0–1 progress value */
    progress: number;
    /** € amount remaining */
    amountRemaining: number;
    /** € spend threshold */
    spendThreshold: number;
    /** Name of the promotion */
    promoName: string;
    /** Whether the promo has been unlocked (progress ≥ 1) */
    isUnlocked: boolean;
    /** Whether a promo is currently applied */
    isApplied: boolean;
    /** Format currency helper */
    formatCurrency: (value: number) => string;
}

export function PromotionProgressBar({
    progress,
    amountRemaining,
    spendThreshold,
    promoName,
    isUnlocked,
    isApplied,
    formatCurrency,
}: PromotionProgressBarProps) {
    const theme = useTheme();
    const { particles, showConfetti, fire } = useConfetti();

    // Animated progress width
    const progressAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(1)).current;
    const badgeScale = useRef(new Animated.Value(0)).current;
    const prevUnlocked = useRef(false);

    // Smooth progress animation
    useEffect(() => {
        Animated.spring(progressAnim, {
            toValue: Math.min(progress, 1),
            tension: 40,
            friction: 8,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    // Shimmer on the progress bar
    useEffect(() => {
        if (isUnlocked) return;
        const loop = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1800,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [isUnlocked]);

    // Celebration when unlocked!
    useEffect(() => {
        if (isUnlocked && !prevUnlocked.current) {
            // Fire confetti
            fire();

            // Bounce the whole bar
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
                Animated.spring(bounceAnim, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
            ]).start();

            // Glow pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(glowAnim, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                { iterations: 3 },
            ).start();

            // Badge pop-in
            Animated.spring(badgeScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
        }

        if (!isUnlocked) {
            badgeScale.setValue(0);
        }

        prevUnlocked.current = isUnlocked;
    }, [isUnlocked]);

    const progressPercent = Math.round(Math.min(progress, 1) * 100);

    // Animated width
    const barWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const shimmerTranslateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-120, SCREEN_WIDTH],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
    });

    // --- Colors based on progress ---
    const barGradient: [string, string] = isUnlocked
        ? ['#059669', '#34D399'] // green celebratory
        : progress > 0.7
            ? ['#7C3AED', '#A78BFA'] // purple close!
            : ['#6366F1', '#818CF8']; // indigo default

    return (
        <Animated.View
            style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                transform: [{ scale: bounceAnim }],
            }}
        >
            {/* Label row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: isUnlocked ? '#059669' : theme.colors.primary + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 8,
                        }}
                    >
                        <Ionicons
                            name={isUnlocked ? 'checkmark-circle' : 'gift-outline'}
                            size={16}
                            color={isUnlocked ? '#fff' : theme.colors.primary}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: isUnlocked ? '#059669' : theme.colors.text,
                            }}
                        >
                            {isUnlocked
                                ? (isApplied ? `${promoName} applied!` : `${promoName} unlocked!`)
                                : promoName}
                        </Text>
                        {!isUnlocked && (
                            <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 1 }}>
                                Spend {formatCurrency(spendThreshold)} to unlock
                            </Text>
                        )}
                    </View>
                </View>

                {/* Amount remaining or unlocked badge */}
                {isUnlocked ? (
                    <Animated.View
                        style={{
                            transform: [{ scale: badgeScale }],
                            backgroundColor: '#059669',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                            UNLOCKED
                        </Text>
                    </Animated.View>
                ) : (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                        {formatCurrency(amountRemaining)} left
                    </Text>
                )}
            </View>

            {/* Progress bar container — relative for confetti overlay */}
            <View style={{ position: 'relative' }}>
                {/* Background track */}
                <View
                    style={{
                        height: 10,
                        backgroundColor: theme.colors.border,
                        borderRadius: 5,
                        overflow: 'hidden',
                    }}
                >
                    {/* Animated fill with gradient */}
                    <Animated.View
                        style={{
                            height: 10,
                            width: barWidth,
                            borderRadius: 5,
                            overflow: 'hidden',
                        }}
                    >
                        <LinearGradient
                            colors={barGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                        {/* Shimmer sweep */}
                        {!isUnlocked && (
                            <Animated.View
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: 40,
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                    transform: [{ translateX: shimmerTranslateX }, { skewX: '-20deg' }],
                                }}
                            />
                        )}
                    </Animated.View>
                </View>

                {/* Glow overlay when unlocked */}
                {isUnlocked && (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: -4,
                            left: 0,
                            right: 0,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#34D399',
                            opacity: glowOpacity,
                        }}
                    />
                )}

                {/* Confetti particles */}
                {showConfetti && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            // overflow visible so particles fly outside bar
                            overflow: 'visible',
                        }}
                        pointerEvents="none"
                    >
                        {particles.map((p) => (
                            <Animated.View
                                key={p.id}
                                style={{
                                    position: 'absolute',
                                    width: p.size,
                                    height: p.size,
                                    borderRadius: p.size / 2,
                                    backgroundColor: p.color,
                                    transform: [
                                        { translateX: p.x },
                                        { translateY: p.y },
                                        { scale: p.scale },
                                        { rotate: p.rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] }) },
                                    ],
                                    opacity: p.opacity,
                                }}
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* Percentage notches */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: theme.colors.subtext }}>€0</Text>
                <Text style={{ fontSize: 10, color: theme.colors.subtext, fontWeight: '600' }}>
                    {progressPercent}%
                </Text>
                <Text style={{ fontSize: 10, color: theme.colors.subtext }}>
                    {formatCurrency(spendThreshold)}
                </Text>
            </View>
        </Animated.View>
    );
}
