import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

const { width } = Dimensions.get('window');

interface OrderSuccessScreenProps {
    onTrackOrder: () => void;
    onGoHome: () => void;
}

export default function OrderSuccessScreen({ onTrackOrder, onGoHome }: OrderSuccessScreenProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const checkScale = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(20)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const buttonsOpacity = useRef(new Animated.Value(0)).current;
    const buttonsTranslateY = useRef(new Animated.Value(30)).current;
    const confettiRef = useRef<any>(null);

    useEffect(() => {
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
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Confetti */}
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
                    '#fbbf24', // amber
                    '#34d399', // emerald
                    '#60a5fa', // blue
                    '#f472b6', // pink
                    '#a78bfa', // violet
                ]}
            />

            {/* Content */}
            <View style={styles.content}>
                {/* Animated checkmark circle */}
                <Animated.View
                    style={[
                        styles.checkCircle,
                        {
                            backgroundColor: theme.colors.primary + '15',
                            borderColor: theme.colors.primary + '30',
                            transform: [{ scale: checkScale }],
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.checkInner,
                            { backgroundColor: theme.colors.primary },
                        ]}
                    >
                        <Ionicons name="checkmark" size={40} color="#fff" />
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
                    {t.cart.order_success_title}
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
                    {t.cart.order_success_subtitle}
                </Animated.Text>
            </View>

            {/* Buttons */}
            <Animated.View
                style={[
                    styles.buttons,
                    {
                        opacity: buttonsOpacity,
                        transform: [{ translateY: buttonsTranslateY }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={onTrackOrder}
                    activeOpacity={0.8}
                >
                    <Ionicons name="navigate-outline" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                        {t.cart.order_success_track}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                    onPress={onGoHome}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.subtext }]}>
                        {t.common.close}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
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
