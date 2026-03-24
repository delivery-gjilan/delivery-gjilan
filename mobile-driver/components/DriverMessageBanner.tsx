import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export type AlertType = 'INFO' | 'WARNING' | 'URGENT';

interface DriverMessageBannerProps {
    senderName: string;
    body: string;
    alertType: AlertType;
    onDismiss: () => void;
}

const ALERT_CONFIG: Record<AlertType, { bg: string; border: string; textColor: string; iconName: string; iconColor: string; label: string }> = {
    INFO: {
        bg: '#1e3a5f',
        border: '#3b82f6',
        textColor: '#93c5fd',
        iconName: 'information-circle',
        iconColor: '#60a5fa',
        label: 'INFO',
    },
    WARNING: {
        bg: '#451a03',
        border: '#f59e0b',
        textColor: '#fcd34d',
        iconName: 'warning',
        iconColor: '#f59e0b',
        label: 'WARNING',
    },
    URGENT: {
        bg: '#450a0a',
        border: '#ef4444',
        textColor: '#fca5a5',
        iconName: 'flash',
        iconColor: '#ef4444',
        label: 'URGENT',
    },
};

export default function DriverMessageBanner({ senderName, body, alertType, onDismiss }: DriverMessageBannerProps) {
    const router = useRouter();
    const translateY = useRef(new Animated.Value(-120)).current;
    const config = ALERT_CONFIG[alertType] ?? ALERT_CONFIG.INFO;

    useEffect(() => {
        // Slide in
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();

        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            dismiss();
        }, 5000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dismiss = () => {
        Animated.timing(translateY, {
            toValue: -120,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onDismiss());
    };

    const handleTap = () => {
        dismiss();
        router.push('/(tabs)/messages');
    };

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Pressable onPress={handleTap}>
                <View
                    style={{
                        marginHorizontal: 12,
                        marginTop: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: config.border,
                        backgroundColor: config.bg,
                        shadowColor: config.border,
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 8,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 }}>
                        <Ionicons name={config.iconName as any} size={22} color={config.iconColor} style={{ marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Text style={{ color: config.textColor, fontSize: 12, fontWeight: '700' }}>
                                    {config.label}
                                </Text>
                                <Text style={{ color: config.textColor, fontSize: 12, fontWeight: '600', opacity: 0.8 }}>
                                    · {senderName}
                                </Text>
                            </View>
                            <Text
                                style={{ color: '#e5e7eb', fontSize: 14, fontWeight: '500', lineHeight: 18 }}
                                numberOfLines={2}
                            >
                                {body}
                            </Text>
                            <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Tap to open messages</Text>
                        </View>
                        <Pressable onPress={dismiss} hitSlop={8}>
                            <Ionicons name="close" size={18} color="#6b7280" />
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}
