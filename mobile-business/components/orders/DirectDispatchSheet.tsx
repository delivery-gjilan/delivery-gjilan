import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    TextInput,
    StyleSheet,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { DIRECT_DISPATCH_AVAILABILITY, CREATE_DIRECT_DISPATCH_ORDER } from '@/graphql/orders';
import * as Haptics from 'expo-haptics';

interface Props {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
    t: Record<string, any>;
}

export function DirectDispatchSheet({ visible, onClose, onCreated, t }: Props) {
    const insets = useSafeAreaInsets();
    const s = t.directDispatch ?? {};

    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [address, setAddress] = useState('');
    const [agreedAmount, setAgreedAmount] = useState('');
    const [driverNotes, setDriverNotes] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);

    const slideAnim = React.useRef(new Animated.Value(600)).current;
    const backdropAnim = React.useRef(new Animated.Value(0)).current;

    const { data: availData, loading: availLoading, refetch: refetchAvail } = useQuery(
        DIRECT_DISPATCH_AVAILABILITY,
        {
            skip: !visible,
            fetchPolicy: 'network-only',
            notifyOnNetworkStatusChange: true,
            pollInterval: visible ? 10000 : 0,
        },
    );

    const [createOrder, { loading: creating }] = useMutation(CREATE_DIRECT_DISPATCH_ORDER);

    const availability = availData?.directDispatchAvailability;
    const isAvailable = availability?.available ?? false;
    const freeDrivers = availability?.freeDriverCount ?? 0;

    useEffect(() => {
        if (visible) {
            setRecipientPhone('');
            setRecipientName('');
            setAddress('');
            setAgreedAmount('');
            setDriverNotes('');
            setSubmitError(null);
            refetchAvail();
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 24,
                    stiffness: 280,
                    mass: 0.9,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, refetchAvail, slideAnim, backdropAnim]);

    const dismiss = useCallback(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 600,
                useNativeDriver: true,
                damping: 20,
                stiffness: 300,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(onClose);
    }, [onClose]);

    const canSubmit =
        isAvailable &&
        recipientPhone.trim().length >= 3 &&
        Number(agreedAmount) > 0 &&
        address.trim().length >= 3 &&
        !creating;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitError(null);
        try {
            await createOrder({
                variables: {
                    input: {
                        dropOffLocation: {
                            latitude: 42.46,
                            longitude: 21.47,
                            address: address.trim(),
                        },
                        agreedAmount: Number(agreedAmount),
                        recipientPhone: recipientPhone.trim(),
                        recipientName: recipientName.trim() || null,
                        driverNotes: driverNotes.trim() || null,
                    },
                },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onCreated();
            dismiss();
        } catch (err: any) {
            const msg = err?.graphQLErrors?.[0]?.message ?? err?.message ?? 'Failed to request delivery';
            setSubmitError(msg);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
                <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
            </Animated.View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                pointerEvents="box-none"
            >
                <Animated.View
                    style={[
                        styles.sheet,
                        { paddingBottom: insets.bottom + 12, transform: [{ translateY: slideAnim }] },
                    ]}
                    pointerEvents="auto"
                >
                    {/* Handle */}
                    <View style={styles.handleWrap}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="call" size={16} color="#818CF8" />
                            </View>
                            <Text style={styles.headerTitle}>{s.title ?? 'Request Delivery'}</Text>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={8}>
                            <Ionicons name="close" size={16} color="#64748b" />
                        </Pressable>
                    </View>

                    <ScrollView
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Availability status */}
                        <View style={[styles.statusBanner, isAvailable ? styles.statusOk : styles.statusUnavail]}>
                            {availLoading ? (
                                <ActivityIndicator size="small" color="#818CF8" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                                        size={16}
                                        color={isAvailable ? '#34D399' : '#F87171'}
                                    />
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: isAvailable ? '#34D399' : '#F87171' },
                                        ]}
                                    >
                                        {isAvailable
                                            ? (s.drivers_available ?? '{{count}} drivers available').replace(
                                                  '{{count}}',
                                                  String(freeDrivers),
                                              )
                                            : availability?.reason ?? (s.no_drivers ?? 'No drivers available')}
                                    </Text>
                                </>
                            )}
                        </View>

                        {/* Form fields */}
                        <View style={styles.form}>
                            <View style={styles.field}>
                                <Text style={styles.label}>{s.phone ?? 'Recipient Phone'} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={recipientPhone}
                                    onChangeText={setRecipientPhone}
                                    placeholder={s.phone_placeholder ?? '+383 44 123 456'}
                                    placeholderTextColor="#4B5563"
                                    keyboardType="phone-pad"
                                    autoComplete="tel"
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>{s.name ?? 'Recipient Name'}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={recipientName}
                                    onChangeText={setRecipientName}
                                    placeholder={s.name_placeholder ?? 'Optional'}
                                    placeholderTextColor="#4B5563"
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>{s.agreed_amount ?? 'Agreed Amount (€)'} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={agreedAmount}
                                    onChangeText={setAgreedAmount}
                                    placeholder={s.agreed_amount_placeholder ?? 'e.g. 3.50'}
                                    placeholderTextColor="#4B5563"
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>{s.address ?? 'Delivery Address'} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder={s.address_placeholder ?? 'e.g. Rr. Adem Jashari, Nr. 12'}
                                    placeholderTextColor="#4B5563"
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>{s.notes ?? 'Driver Notes'}</Text>
                                <TextInput
                                    style={[styles.input, styles.inputMultiline]}
                                    value={driverNotes}
                                    onChangeText={setDriverNotes}
                                    placeholder={s.notes_placeholder ?? 'Optional instructions for the driver'}
                                    placeholderTextColor="#4B5563"
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>
                        </View>

                        {/* Error message */}
                        {submitError ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={14} color="#F87171" />
                                <Text style={styles.errorText}>{submitError}</Text>
                            </View>
                        ) : null}

                        {/* Submit button */}
                        <Pressable
                            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                        >
                            {creating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={16} color="#fff" />
                                    <Text style={styles.submitText}>
                                        {s.request_driver ?? 'Request Driver'}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#111113',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        maxHeight: '85%',
    },
    handleWrap: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#374151',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#818CF822',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#E5E7EB',
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    statusOk: {
        backgroundColor: '#34D39912',
    },
    statusUnavail: {
        backgroundColor: '#F8717112',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    form: {
        gap: 14,
        marginBottom: 16,
    },
    field: {
        gap: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#1F2937',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#E5E7EB',
        borderWidth: 1,
        borderColor: '#374151',
    },
    inputMultiline: {
        minHeight: 56,
        textAlignVertical: 'top',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F8717112',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#F87171',
        flex: 1,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#818CF8',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 8,
    },
    submitBtnDisabled: {
        opacity: 0.4,
    },
    submitText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
