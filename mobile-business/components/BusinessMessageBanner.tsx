import React, { useEffect } from 'react';
import { Pressable, Text, View, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { MARK_BUSINESS_MESSAGES_READ_BUSINESS } from '@/graphql/messages';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
    iconName: keyof typeof Ionicons.glyphMap;
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

export default function BusinessMessageBanner({ senderName, body, alertType, adminId, onDismiss }: BusinessMessageBannerProps) {
    const router = useRouter();
    const scale = useSharedValue(0.82);
    const opacity = useSharedValue(0);
    const backdropOpacity = useSharedValue(0);
    const config = ALERT_CONFIG[alertType] ?? ALERT_CONFIG.INFO;
    const [markRead] = useMutation(MARK_BUSINESS_MESSAGES_READ_BUSINESS);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    useEffect(() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 80 });
        opacity.value = withTiming(1, { duration: 220 });
        backdropOpacity.value = withTiming(1, { duration: 200 });
    }, []);

    const dismiss = () => {
        scale.value = withTiming(0.88, { duration: 220 });
        opacity.value = withTiming(0, { duration: 200 });
        backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
            if (finished) runOnJS(onDismiss)();
        });
    };

    const handleTap = () => {
        // Tap card — mark read + open messages
        if (adminId) {
            markRead({ variables: { otherUserId: adminId } });
        }
        dismiss();
        router.push('/(tabs)/messages');
    };

    return (
        <Pressable
            onPress={dismiss}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {/* Backdrop */}
            <Animated.View
                style={[{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                }, backdropStyle]}
            />

            {/* Card */}
            <Animated.View
                style={[{
                    width: SCREEN_WIDTH * 0.88,
                    borderRadius: 24,
                    overflow: 'hidden',
                    borderWidth: 1.5,
                    borderColor: config.border,
                    backgroundColor: config.bg,
                    shadowColor: config.accent,
                    shadowOpacity: 0.45,
                    shadowRadius: 32,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 20,
                }, cardStyle]}
            >
                {/* Top accent bar */}
                <View style={{ height: 4, backgroundColor: config.accent }} />

                <Pressable onPress={handleTap}>
                    <View style={{ padding: 24, gap: 16 }}>
                        {/* Header: alert badge + dismiss */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 8,
                                    backgroundColor: config.labelBg,
                                    borderWidth: 1,
                                    borderColor: config.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Ionicons name={config.iconName} size={14} color={config.iconColor} />
                                <Text style={{ color: config.labelText, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                                    {config.label}
                                </Text>
                            </View>

                            <Pressable onPress={dismiss} hitSlop={14} style={{ padding: 4 }}>
                                <View
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        backgroundColor: 'rgba(255,255,255,0.07)',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="close" size={16} color="#6b7280" />
                                </View>
                            </Pressable>
                        </View>

                        {/* Message body — big */}
                        <Text
                            style={{ color: '#f3f4f6', fontSize: 22, fontWeight: '600', lineHeight: 32 }}
                            numberOfLines={8}
                        >
                            {body}
                        </Text>

                        {/* Action hints */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: 4,
                                gap: 8,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="chatbubble-outline" size={14} color={config.iconColor} />
                                <Text style={{ color: config.labelText, fontSize: 12, fontWeight: '600' }}>Tap to open chat</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="close-circle-outline" size={14} color="#6b7280" />
                                <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '500' }}>Tap outside to close</Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </Pressable>
    );
}
