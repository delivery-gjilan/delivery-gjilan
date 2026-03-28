import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Large confetti burst for celebration overlay ─────────
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6', '#34D399', '#FDE047', '#60A5FA', '#FB923C'];
const BURST_COUNT = 30;

interface PromoAppliedCelebrationProps {
    visible: boolean;
    /** Message to show — e.g. "Free delivery applied!" */
    message: string;
    /** Savings amount to show — e.g. "You save €3.50" */
    savingsText?: string;
    /** Called when the animation completes */
    onComplete?: () => void;
}

export function PromoAppliedCelebration({ visible, message, savingsText, onComplete }: PromoAppliedCelebrationProps) {
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const iconRotate = useRef(new Animated.Value(0)).current;
    const checkScale = useRef(new Animated.Value(0)).current;
    const savingsSlide = useRef(new Animated.Value(20)).current;
    const savingsOpacity = useRef(new Animated.Value(0)).current;

    // Confetti particles
    const confettiParticles = useRef(
        Array.from({ length: BURST_COUNT }, (_, i) => ({
            x: new Animated.Value(SCREEN_WIDTH / 2),
            y: new Animated.Value(200),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
            rotate: new Animated.Value(0),
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            size: 5 + Math.random() * 8,
        })),
    ).current;

    useEffect(() => {
        if (!visible) return;

        // Haptic burst
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 350);

        // 1. Backdrop fade
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        // 2. Card pop-in
        cardOpacity.setValue(1);
        Animated.spring(cardScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true, delay: 100 }).start();

        // 3. Icon rotate
        Animated.timing(iconRotate, { toValue: 1, duration: 500, delay: 200, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();

        // 4. Checkmark bounce
        Animated.spring(checkScale, { toValue: 1, tension: 200, friction: 6, delay: 400, useNativeDriver: true }).start();

        // 5. Savings slide up
        if (savingsText) {
            Animated.parallel([
                Animated.timing(savingsSlide, { toValue: 0, duration: 300, delay: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(savingsOpacity, { toValue: 1, duration: 300, delay: 500, useNativeDriver: true }),
            ]).start();
        }

        // 6. Fire confetti burst
        confettiParticles.forEach((p) => {
            p.x.setValue(SCREEN_WIDTH / 2);
            p.y.setValue(180);
            p.opacity.setValue(1);
            p.scale.setValue(0);
            p.rotate.setValue(0);

            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 140;
            const targetX = (SCREEN_WIDTH / 2) + Math.cos(angle) * dist;
            const targetY = 180 + Math.sin(angle) * dist - 60;

            Animated.parallel([
                Animated.timing(p.x, { toValue: targetX, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.sequence([
                    Animated.timing(p.y, { toValue: targetY, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(p.y, { toValue: targetY + 80, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.spring(p.scale, { toValue: 1, tension: 200, friction: 6, delay: Math.random() * 150, useNativeDriver: true }),
                    Animated.timing(p.scale, { toValue: 0, duration: 200, delay: 400, useNativeDriver: true }),
                ]),
                Animated.timing(p.rotate, { toValue: 720, duration: 800, useNativeDriver: true }),
                Animated.timing(p.opacity, { toValue: 0, duration: 300, delay: 600, useNativeDriver: true }),
            ]).start();
        });

        // Auto-dismiss after 2.5s
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(cardScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => {
                // Reset
                cardScale.setValue(0);
                checkScale.setValue(0);
                iconRotate.setValue(0);
                savingsSlide.setValue(20);
                savingsOpacity.setValue(0);
                onComplete?.();
            });
        }, 2500);

        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]} pointerEvents="none">
            {/* Confetti */}
            {confettiParticles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size > 8 ? 2 : p.size / 2,
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

            {/* Main card */}
            <Animated.View
                style={[
                    styles.card,
                    {
                        transform: [{ scale: cardScale }],
                        opacity: cardOpacity,
                    },
                ]}
            >
                <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    {/* Animated icon */}
                    <Animated.View
                        style={{
                            transform: [
                                { rotate: iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                            ],
                        }}
                    >
                        <View style={styles.iconCircle}>
                            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                                <Ionicons name="checkmark" size={28} color="#059669" />
                            </Animated.View>
                        </View>
                    </Animated.View>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Savings */}
                    {savingsText && (
                        <Animated.View
                            style={{
                                transform: [{ translateY: savingsSlide }],
                                opacity: savingsOpacity,
                            }}
                        >
                            <Text style={styles.savings}>{savingsText}</Text>
                        </Animated.View>
                    )}
                </LinearGradient>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    card: {
        width: SCREEN_WIDTH - 64,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },
    cardGradient: {
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    message: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    savings: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
