import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Dimensions,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

const { width } = Dimensions.get('window');

type SuccessModalType = 'order_created' | 'order_delivered';
type SuccessModalPhase = 'loading' | 'success';

interface OrderSuccessScreenProps {
    orderId?: string | null;
    type?: SuccessModalType;
    phase?: SuccessModalPhase;
    onTrackOrder?: () => void;
    onGoHome: () => void;
}

export default function OrderSuccessScreen({ orderId, type = 'order_created', phase = 'success', onTrackOrder, onGoHome }: OrderSuccessScreenProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    
    const isDelivered = type === 'order_delivered';
    const isLoading = phase === 'loading';

    const checkScale = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(20)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const buttonsOpacity = useRef(new Animated.Value(0)).current;
    const buttonsTranslateY = useRef(new Animated.Value(30)).current;
    const confettiRef = useRef<any>(null);
    const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isLoading) {
            checkScale.setValue(0);
            titleOpacity.setValue(1);
            titleTranslateY.setValue(0);
            subtitleOpacity.setValue(1);
            buttonsOpacity.setValue(0);
            buttonsTranslateY.setValue(30);
            return;
        }

        // Haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Staggered entrance animation
        Animated.sequence([
            // 1. Checkmark pops in
            Animated.spring(checkScale, {
                toValue: 1,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
            }),
            // 2. Title fades in
            Animated.parallel([
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(titleTranslateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
            // 3. Subtitle fades in
            Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            // 4. Buttons slide up
            Animated.parallel([
                Animated.timing(buttonsOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonsTranslateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Auto-close after 12 seconds
        autoCloseTimerRef.current = setTimeout(() => {
            onGoHome();
        }, 12000);

        // Cleanup timer on unmount
        return () => {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
            }
        };
    }, [checkScale, titleOpacity, titleTranslateY, subtitleOpacity, buttonsOpacity, buttonsTranslateY, isLoading, onGoHome]);

    const handleTrackOrder = () => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
        }
        onTrackOrder();
    };

    const handleGoHome = () => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
        }
        onGoHome();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Confetti */}
            {!isLoading && (
                <ConfettiCannon
                    ref={confettiRef}
                    count={120}
                    origin={{ x: width / 2, y: -20 }}
                    autoStart
                    fadeOut
                    fallSpeed={2800}
                    explosionSpeed={350}
                    colors={[
                        theme.colors.primary,
                        '#fbbf24',
                        '#34d399',
                        '#60a5fa',
                        '#f472b6',
                        '#a78bfa',
                    ]}
                />
            )}

            {/* Content */}
            <View style={styles.content}>
                {/* Animated checkmark circle */}
                <Animated.View
                    style={[
                        styles.checkCircle,
                        {
                            backgroundColor: theme.colors.primary + '15',
                            borderColor: theme.colors.primary + '30',
                            transform: [{ scale: isLoading ? 1 : checkScale }],
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.checkInner,
                            { backgroundColor: theme.colors.primary },
                        ]}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#fff" />
                        ) : (
                            <Ionicons name="checkmark" size={40} color="#fff" />
                        )}
                    </View>
                </Animated.View>

                {/* Title */}
                <Animated.Text
                    style={[
                        styles.title,
                        {
                            color: theme.colors.text,
                            opacity: titleOpacity,
                            transform: [{ translateY: titleTranslateY }],
                        },
                    ]}
                >
                    {isLoading ? t.cart.placing_order : isDelivered ? t.orders.details.order_delivered : t.cart.order_success_title}
                </Animated.Text>

                {/* Subtitle */}
                <Animated.Text
                    style={[
                        styles.subtitle,
                        {
                            color: theme.colors.subtext,
                            opacity: subtitleOpacity,
                        },
                    ]}
                >
                    {isLoading ? t.common.processing : isDelivered ? t.orders.details.order_delivered_message : t.cart.order_success_subtitle}
                </Animated.Text>
            </View>

            {/* Buttons */}
            {!isLoading && (
                <Animated.View
                    style={[
                        styles.buttons,
                        {
                            opacity: buttonsOpacity,
                            transform: [{ translateY: buttonsTranslateY }],
                        },
                    ]}
                >
                {!isDelivered && onTrackOrder && (
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleTrackOrder}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="navigate-outline" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>
                            {t.cart.order_success_track}
                        </Text>
                    </TouchableOpacity>
                )}

                {isDelivered && onTrackOrder && (
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleTrackOrder}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="receipt-outline" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>
                            {t.orders.details.view_order}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                    onPress={handleGoHome}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.subtext }]}>
                        {isDelivered ? t.common.go_home : t.common.close}
                    </Text>
                </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    checkCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    checkInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttons: {
        position: 'absolute',
        bottom: 60,
        left: 24,
        right: 24,
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
