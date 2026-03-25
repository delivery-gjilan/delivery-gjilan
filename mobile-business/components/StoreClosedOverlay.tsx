import { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    AppState,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import {
    GET_BUSINESS_OPERATIONS,
    UPDATE_BUSINESS_OPERATIONS,
} from '@/graphql/business';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import * as Haptics from 'expo-haptics';

const REMINDER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export default function StoreClosedOverlay() {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const businessId = user?.businessId ?? '';

    const { data } = useQuery(GET_BUSINESS_OPERATIONS, {
        variables: { id: businessId },
        skip: !businessId,
        fetchPolicy: 'cache-and-network',
        pollInterval: 15_000,
    });

    const businessOps = (data as any)?.business;
    const isClosed = Boolean(businessOps?.isTemporarilyClosed);
    const closureReason = businessOps?.temporaryClosureReason ?? '';

    const [updating, setUpdating] = useState(false);
    const [reminderVisible, setReminderVisible] = useState(false);

    // Breathing animation for the Open Again button
    const breathScale = useSharedValue(1);
    const breathGlow = useSharedValue(0.3);

    useEffect(() => {
        if (!isClosed) {
            breathScale.value = 1;
            breathGlow.value = 0.3;
            return;
        }
        breathScale.value = withRepeat(
            withSequence(
                withTiming(1.055, { duration: 900, easing: Easing.inOut(Easing.sin) }),
                withTiming(1.0,   { duration: 900, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            false,
        );
        breathGlow.value = withRepeat(
            withSequence(
                withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            false,
        );
    }, [isClosed]);

    const breathAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breathScale.value }],
        shadowOpacity: breathGlow.value,
    }));

    const [updateBusinessOps] = useMutation(UPDATE_BUSINESS_OPERATIONS);

    // Sound ref for beep
    const soundRef = useRef<Audio.Sound | null>(null);
    const reminderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closedSinceRef = useRef<number | null>(null);

    // Load beep sound
    useEffect(() => {
        Audio.Sound.createAsync(require('@/assets/beep.wav'))
            .then(({ sound }) => {
                soundRef.current = sound;
            })
            .catch(() => {});
        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    // Play beep pattern (3 beeps)
    const playBeep = useCallback(() => {
        const beep = () => soundRef.current?.replayAsync().catch(() => {});
        beep();
        setTimeout(beep, 800);
        setTimeout(beep, 1600);
    }, []);

    // Start / stop the 30-min reminder timer when closed state changes
    useEffect(() => {
        if (isClosed) {
            closedSinceRef.current = Date.now();
            startReminderTimer(REMINDER_INTERVAL_MS);
        } else {
            clearReminderTimer();
            closedSinceRef.current = null;
            setReminderVisible(false);
        }
        return () => clearReminderTimer();
    }, [isClosed]);

    // Also handle app returning from background — recalculate remaining time
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active' && isClosed && closedSinceRef.current) {
                const elapsed = Date.now() - closedSinceRef.current;
                if (elapsed >= REMINDER_INTERVAL_MS) {
                    fireReminder();
                } else {
                    startReminderTimer(REMINDER_INTERVAL_MS - elapsed);
                }
            }
        });
        return () => subscription.remove();
    }, [isClosed]);

    const startReminderTimer = (delay: number) => {
        clearReminderTimer();
        reminderTimerRef.current = setTimeout(() => {
            fireReminder();
        }, delay);
    };

    const clearReminderTimer = () => {
        if (reminderTimerRef.current) {
            clearTimeout(reminderTimerRef.current);
            reminderTimerRef.current = null;
        }
    };

    const fireReminder = () => {
        setReminderVisible(true);
        playBeep();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleOpenStore = async () => {
        if (!businessId || updating) return;
        setUpdating(true);
        try {
            await updateBusinessOps({
                variables: {
                    id: businessId,
                    input: {
                        isTemporarilyClosed: false,
                        temporaryClosureReason: null,
                    },
                },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setReminderVisible(false);
        } catch {
            // ignore — user can retry
        } finally {
            setUpdating(false);
        }
    };

    const handleDismissReminder = () => {
        setReminderVisible(false);
        // Reset timer for another 30 minutes
        closedSinceRef.current = Date.now();
        startReminderTimer(REMINDER_INTERVAL_MS);
    };

    // Format elapsed time since closure
    const getElapsedLabel = () => {
        if (!closedSinceRef.current) return '';
        const mins = Math.floor((Date.now() - closedSinceRef.current) / 60_000);
        if (mins < 1) return t('store_closed_overlay.just_now', 'Just now');
        if (mins < 60) return t('store_closed_overlay.minutes_ago', '{{mins}} min ago', { mins });
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        if (remainMins === 0)
            return t('store_closed_overlay.hours_ago', '{{hrs}}h ago', { hrs });
        return t('store_closed_overlay.hours_mins_ago', '{{hrs}}h {{mins}}m ago', { hrs, mins: remainMins });
    };

    if (!isClosed) return null;

    return (
        <>
            {/* Full-screen closed overlay */}
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.92)',
                    zIndex: 9999,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 32,
                }}
                pointerEvents="box-none"
            >
                {/* Icon */}
                <View
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: '#ef444425',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                    }}
                >
                    <Ionicons name="storefront-outline" size={48} color="#ef4444" />
                </View>

                {/* Title */}
                <Text
                    style={{
                        color: '#fff',
                        fontSize: 26,
                        fontWeight: '800',
                        textAlign: 'center',
                        letterSpacing: -0.5,
                    }}
                >
                    {t('store_closed_overlay.title', 'Store is Closed')}
                </Text>

                {/* Reason */}
                {closureReason ? (
                    <View
                        style={{
                            marginTop: 12,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            maxWidth: 340,
                        }}
                    >
                        <Text
                            style={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 12,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                marginBottom: 4,
                            }}
                        >
                            {t('store_closed_overlay.reason', 'Reason')}
                        </Text>
                        <Text
                            style={{
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: 15,
                                textAlign: 'center',
                                lineHeight: 21,
                            }}
                        >
                            {closureReason}
                        </Text>
                    </View>
                ) : null}

                {/* Subtitle */}
                <Text
                    style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 14,
                        textAlign: 'center',
                        marginTop: 16,
                        lineHeight: 20,
                    }}
                >
                    {t('store_closed_overlay.subtitle', 'Customers cannot place orders while the store is closed.')}
                </Text>

                {/* Open Again Button */}
                <Animated.View style={[breathAnimStyle, { marginTop: 36 }]}>
                <TouchableOpacity
                    onPress={handleOpenStore}
                    disabled={updating}
                    activeOpacity={0.8}
                    style={{
                        backgroundColor: '#10b981',
                        borderRadius: 16,
                        paddingHorizontal: 40,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 220,
                        justifyContent: 'center',
                        shadowColor: '#10b981',
                        shadowOffset: { width: 0, height: 4 },
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    {updating ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="storefront" size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
                                {t('store_closed_overlay.open_again', 'Open Store Again')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
                </Animated.View>
            </View>

            {/* 30-min Reminder Modal */}
            <Modal
                visible={reminderVisible}
                transparent
                animationType="fade"
                onRequestClose={handleDismissReminder}
            >
                <Pressable
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                    }}
                    onPress={handleDismissReminder}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#1c1c1e',
                            borderRadius: 24,
                            width: '88%',
                            maxWidth: 400,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                        }}
                    >
                        {/* Header */}
                        <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 8, paddingHorizontal: 24 }}>
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: '#f59e0b20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <Ionicons name="alarm-outline" size={32} color="#f59e0b" />
                            </View>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
                                {t('store_closed_overlay.reminder_title', 'Still closed?')}
                            </Text>
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.55)',
                                    fontSize: 14,
                                    textAlign: 'center',
                                    marginTop: 8,
                                    lineHeight: 20,
                                }}
                            >
                                {t(
                                    'store_closed_overlay.reminder_subtitle',
                                    'Your store has been closed for a while. Do you want to open it again?',
                                )}
                            </Text>
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.35)',
                                    fontSize: 12,
                                    marginTop: 8,
                                }}
                            >
                                {getElapsedLabel()}
                            </Text>
                        </View>

                        {/* Actions */}
                        <View style={{ padding: 20, gap: 10 }}>
                            <TouchableOpacity
                                onPress={handleOpenStore}
                                disabled={updating}
                                activeOpacity={0.8}
                                style={{
                                    backgroundColor: '#10b981',
                                    borderRadius: 14,
                                    paddingVertical: 14,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                {updating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="storefront" size={18} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                                            {t('store_closed_overlay.open_again', 'Open Store Again')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleDismissReminder}
                                activeOpacity={0.7}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    borderRadius: 14,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' }}>
                                    {t('store_closed_overlay.keep_closed', 'Keep Closed')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
