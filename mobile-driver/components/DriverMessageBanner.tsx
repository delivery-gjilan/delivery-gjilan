import React, { useEffect } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { MARK_DRIVER_MESSAGES_READ_DRIVER } from '@/graphql/operations/driverMessages';
import { useTheme } from '@/hooks/useTheme';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';

export type AlertType = 'INFO' | 'WARNING' | 'URGENT';

interface DriverMessageBannerProps {
    senderName: string;
    body: string;
    alertType: AlertType;
    adminId: string | null;
    onDismiss: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

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

export default function DriverMessageBanner({ senderName, body, alertType, adminId, onDismiss }: DriverMessageBannerProps) {
    const theme = useTheme();
    const isDark = theme.colors.background === '#000000';
    const router = useRouter();
    const scale = useSharedValue(0.82);
    const opacity = useSharedValue(0);
    const backdropOpacity = useSharedValue(0);
    const config = ALERT_CONFIG[alertType] ?? ALERT_CONFIG.INFO;
    const surfaceBg = isDark ? config.bg : '#ffffff';
    const closeBg = isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6';
    const closeColor = isDark ? '#6b7280' : '#6b7280';
    const bodyText = isDark ? '#f3f4f6' : '#111827';
    const hintMuted = isDark ? '#6b7280' : '#6b7280';
    const backdrop = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)';
    const [markRead] = useMutation(MARK_DRIVER_MESSAGES_READ_DRIVER);

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

    useEffect(() => {
        const id = setTimeout(() => dismiss(), 10000);
        return () => clearTimeout(id);
    }, []);

    const handleTap = () => {
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
            <Animated.View
                style={[{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: backdrop,
                }, backdropStyle]}
            />

            <Animated.View
                style={[{
                    width: SCREEN_WIDTH * 0.88,
                    borderRadius: 24,
                    overflow: 'hidden',
                    borderWidth: 1.5,
                    borderColor: config.border,
                    backgroundColor: surfaceBg,
                    shadowColor: config.accent,
                    shadowOpacity: 0.45,
                    shadowRadius: 32,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 20,
                }, cardStyle]}
            >
                <View style={{ height: 4, backgroundColor: config.accent }} />

                <Pressable onPress={handleTap}>
                    <View style={{ padding: 24, gap: 16 }}>
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
                                <Ionicons name={config.iconName as any} size={14} color={config.iconColor} />
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
                                        backgroundColor: closeBg,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="close" size={16} color={closeColor} />
                                </View>
                            </Pressable>
                        </View>

                        <Text
                            style={{ color: bodyText, fontSize: 22, fontWeight: '600', lineHeight: 32 }}
                            numberOfLines={8}
                        >
                            {body}
                        </Text>

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
                                <Text style={{ color: hintMuted, fontSize: 12, fontWeight: '500' }}>Tap outside to close</Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </Pressable>
    );
}
