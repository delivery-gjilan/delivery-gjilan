import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { MARK_BUSINESS_MESSAGES_READ_BUSINESS } from '@/graphql/messages';

export type AlertType = 'INFO' | 'WARNING' | 'URGENT';

interface BusinessMessageBannerProps {
    senderName: string;
    body: string;
    alertType: AlertType;
    adminId: string | null;
    onDismiss: () => void;
}

const ALERT_CONFIG: Record<AlertType, {
    bg: string;
    accent: string;
    border: string;
    labelBg: string;
    labelText: string;
    iconName: string;
    iconColor: string;
    label: string;
}> = {
    INFO: {
        bg: '#130a2e',
        accent: '#7c3aed',
        border: '#5b21b640',
        labelBg: '#5b21b620',
        labelText: '#c4b5fd',
        iconName: 'information-circle',
        iconColor: '#a78bfa',
        label: 'INFO',
    },
    WARNING: {
        bg: '#1c0e00',
        accent: '#f59e0b',
        border: '#d9770640',
        labelBg: '#d9770620',
        labelText: '#fcd34d',
        iconName: 'warning',
        iconColor: '#fbbf24',
        label: 'WARNING',
    },
    URGENT: {
        bg: '#1a0505',
        accent: '#ef4444',
        border: '#dc262640',
        labelBg: '#dc262620',
        labelText: '#fca5a5',
        iconName: 'flash',
        iconColor: '#f87171',
        label: 'URGENT',
    },
};

const DOUBLE_TAP_DELAY = 350;

export default function BusinessMessageBanner({ senderName, body, alertType, adminId, onDismiss }: BusinessMessageBannerProps) {
    const router = useRouter();
    const translateY = useRef(new Animated.Value(-200)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const config = ALERT_CONFIG[alertType] ?? ALERT_CONFIG.INFO;
    const lastTapRef = useRef<number>(0);
    const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [markRead] = useMutation(MARK_BUSINESS_MESSAGES_READ_BUSINESS);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 70,
                friction: 11,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        autoTimerRef.current = setTimeout(() => dismiss(), 10000);
        return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dismiss = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -200,
                duration: 260,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    const handleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap — mark read then dismiss
            if (adminId) {
                markRead({ variables: { otherUserId: adminId } });
            }
            dismiss();
            return;
        }
        lastTapRef.current = now;
        // Single tap — open messages
        dismiss();
        router.push('/(tabs)/messages');
    };

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                transform: [{ translateY }],
                opacity,
            }}
        >
            <Pressable onPress={handleTap}>
                <View
                    style={{
                        marginHorizontal: 10,
                        marginTop: 10,
                        borderRadius: 18,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: config.border,
                        backgroundColor: config.bg,
                        shadowColor: config.accent,
                        shadowOpacity: 0.35,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 12,
                        flexDirection: 'row',
                    }}
                >
                    {/* Left accent bar */}
                    <View style={{ width: 4, backgroundColor: config.accent }} />

                    <View style={{ flex: 1, padding: 14, gap: 8 }}>
                        {/* Top row: icon + sender + label badge + dismiss */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 10,
                                    backgroundColor: config.labelBg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name={config.iconName as any} size={18} color={config.iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '700', letterSpacing: 0.1 }}>
                                    {senderName}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                    <View
                                        style={{
                                            paddingHorizontal: 6,
                                            paddingVertical: 1,
                                            borderRadius: 4,
                                            backgroundColor: config.labelBg,
                                        }}
                                    >
                                        <Text style={{ color: config.labelText, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                                            {config.label}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <Pressable onPress={dismiss} hitSlop={12} style={{ padding: 2 }}>
                                <Ionicons name="close" size={18} color="#4b5563" />
                            </Pressable>
                        </View>

                        {/* Message body */}
                        <Text
                            style={{ color: '#d1d5db', fontSize: 14, fontWeight: '400', lineHeight: 21 }}
                            numberOfLines={5}
                        >
                            {body}
                        </Text>

                        {/* Hint row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="finger-print" size={12} color="#4b5563" />
                                <Text style={{ color: '#4b5563', fontSize: 10, fontWeight: '500' }}>Tap to open</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="checkmark-done" size={12} color="#4b5563" />
                                <Text style={{ color: '#4b5563', fontSize: 10, fontWeight: '500' }}>Double-tap to mark read</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}
