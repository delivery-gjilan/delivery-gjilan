import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Modal,
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

const PREP_PRESETS = [10, 15, 20, 30] as const;

export function DirectDispatchSheet({ visible, onClose, onCreated, t }: Props) {
    const insets = useSafeAreaInsets();
    const s = t.directDispatch ?? {};

    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [address, setAddress] = useState('');
    const [preparationMinutes, setPreparationMinutes] = useState('15');
    const [driverNotes, setDriverNotes] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);

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
            setPreparationMinutes('15');
            setDriverNotes('');
            setSubmitError(null);
            refetchAvail();
        }
    }, [visible, refetchAvail]);

    const dismiss = useCallback(() => {
        onClose();
    }, [onClose]);

    const parsedPreparationMinutes = Number(preparationMinutes);

    const canSubmit =
        isAvailable &&
        recipientPhone.trim().length >= 3 &&
        address.trim().length >= 3 &&
        Number.isInteger(parsedPreparationMinutes) &&
        parsedPreparationMinutes >= 1 &&
        parsedPreparationMinutes <= 180 &&
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
                        preparationMinutes: parsedPreparationMinutes,
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
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={dismiss}
        >
            <KeyboardAvoidingView
                style={styles.screen}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View
                    style={[
                        styles.content,
                        { paddingTop: insets.top + 12 },
                    ]}
                >
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="call" size={16} color="#818CF8" />
                            </View>
                            <View style={styles.headerTextWrap}>
                                <Text style={styles.headerTitle}>{s.title ?? 'Request Delivery'}</Text>
                                <Text style={styles.headerSubtitle}>
                                    {s.prep_hint ?? 'Set preparation minutes so drivers can be notified before the order is ready.'}
                                </Text>
                            </View>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={8}>
                            <Ionicons name="close" size={16} color="#64748b" />
                        </Pressable>
                    </View>

                    <ScrollView
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: insets.bottom + 160 },
                        ]}
                    >
                        <View style={styles.heroCard}>
                            <View style={styles.heroIconWrap}>
                                <Ionicons name="flash-outline" size={16} color="#C4B5FD" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.heroTitle}>{s.prep_title ?? 'Dispatch timing'}</Text>
                                <Text style={styles.heroText}>
                                    {s.prep_description ?? 'Use this request for call-in orders. Dispatch starts from admin assignment flow while drivers are notified around the selected prep window.'}
                                </Text>
                            </View>
                        </View>

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
                                <Text style={styles.label}>{s.preparation_minutes ?? 'Preparation Time (min)'} *</Text>
                                <View style={styles.presetRow}>
                                    {PREP_PRESETS.map((preset) => {
                                        const isActive = preparationMinutes === String(preset);
                                        return (
                                            <Pressable
                                                key={preset}
                                                onPress={() => setPreparationMinutes(String(preset))}
                                                style={[styles.presetChip, isActive && styles.presetChipActive]}
                                            >
                                                <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                                                    {preset}m
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={preparationMinutes}
                                    onChangeText={setPreparationMinutes}
                                    placeholder={s.preparation_minutes_placeholder ?? 'e.g. 15'}
                                    placeholderTextColor="#4B5563"
                                    keyboardType="number-pad"
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

                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}> 
                        {submitError ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={14} color="#F87171" />
                                <Text style={styles.errorText}>{submitError}</Text>
                            </View>
                        ) : null}

                        <View style={styles.footerSummary}>
                            <Text style={styles.footerSummaryLabel}>
                                {s.footer_summary ?? 'Dispatch trigger'}
                            </Text>
                            <Text style={styles.footerSummaryValue}>
                                {parsedPreparationMinutes >= 1 && parsedPreparationMinutes <= 180
                                    ? `${parsedPreparationMinutes} min prep window`
                                    : (s.footer_summary_fallback ?? 'Choose a valid prep time')}
                            </Text>
                        </View>

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
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    content: {
        flex: 1,
        backgroundColor: '#09090b',
        paddingHorizontal: 16,
    },
    scrollContent: {
        paddingBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#18181b',
        marginBottom: 16,
    },
    headerTextWrap: {
        flex: 1,
        gap: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
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
    headerSubtitle: {
        fontSize: 12,
        lineHeight: 18,
        color: '#94A3B8',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#1F2937',
        marginBottom: 12,
    },
    heroIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B5CF620',
    },
    heroTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E5E7EB',
        marginBottom: 3,
    },
    heroText: {
        fontSize: 12,
        lineHeight: 18,
        color: '#9CA3AF',
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
    presetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    presetChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    presetChipActive: {
        backgroundColor: '#312e81',
        borderColor: '#818CF8',
    },
    presetChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A1A1AA',
    },
    presetChipTextActive: {
        color: '#E0E7FF',
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
        marginBottom: 10,
    },
    errorText: {
        fontSize: 12,
        color: '#F87171',
        flex: 1,
    },
    footer: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 0,
        paddingTop: 12,
        backgroundColor: '#09090b',
        borderTopWidth: 1,
        borderTopColor: '#18181b',
    },
    footerSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
    },
    footerSummaryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    footerSummaryValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E5E7EB',
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
