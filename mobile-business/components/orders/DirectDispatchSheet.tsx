import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Modal,
    TouchableOpacity,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { DIRECT_DISPATCH_AVAILABILITY, CREATE_DIRECT_DISPATCH_ORDER } from '@/graphql/orders';
import * as Haptics from 'expo-haptics';
import { Order, STATUS_COLORS } from './types';

type ActiveTab = 'active' | 'new';

interface Props {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
    activeOrders: Order[];
    dispatchEnabled: boolean;
    t: Record<string, any>;
}

const PREP_PRESETS_MINS = [0, 5, 10, 15, 20, 30, 45, 60] as const;
const CASH_PRESETS_EUR = [5, 10, 15, 20, 50] as const;

export function DirectDispatchSheet({ visible, onClose, onCreated, activeOrders, dispatchEnabled, t }: Props) {
    const insets = useSafeAreaInsets();
    const s = t.directDispatch ?? {};

    const hasActiveOrders = activeOrders.length > 0;
    const showTabs = hasActiveOrders;
    // Default to 'active' tab when there are active orders, otherwise 'new'
    const [activeTab, setActiveTab] = useState<ActiveTab>(hasActiveOrders ? 'active' : 'new');

    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [prepMinutesCustom, setPrepMinutesCustom] = useState('15');
    const [cashCustom, setCashCustom] = useState('');
    const [driverNotes, setDriverNotes] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const prepInputRef = useRef<TextInput>(null);
    const cashInputRef = useRef<TextInput>(null);

    const { data: availData, loading: availLoading, refetch: refetchAvail } = useQuery(
        DIRECT_DISPATCH_AVAILABILITY,
        {
            skip: !visible || !dispatchEnabled,
            fetchPolicy: 'network-only',
            notifyOnNetworkStatusChange: true,
            pollInterval: visible && dispatchEnabled ? 10000 : 0,
        },
    );

    const [createOrder, { loading: creating }] = useMutation(CREATE_DIRECT_DISPATCH_ORDER);

    const availability = availData?.directDispatchAvailability;
    const isAvailable = availability?.available ?? false;
    const freeDrivers = availability?.freeDriverCount ?? 0;

    useEffect(() => {
        if (visible) {
            // Reset to 'active' tab if there are active orders, otherwise 'new'
            setActiveTab(activeOrders.length > 0 ? 'active' : 'new');
            setRecipientPhone('');
            setRecipientName('');
            setPrepMinutesCustom('15');
            setCashCustom('');
            setDriverNotes('');
            setSubmitError(null);
            if (dispatchEnabled) refetchAvail();
            // Focus prep minutes input
            setTimeout(() => prepInputRef.current?.focus(), 100);
        }
    }, [visible, refetchAvail, dispatchEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

    // When active orders arrive after opening, switch to active tab if we're on new tab and feature disabled
    useEffect(() => {
        if (visible && !dispatchEnabled && activeOrders.length > 0) {
            setActiveTab('active');
        }
    }, [visible, dispatchEnabled, activeOrders.length]);

    const dismiss = useCallback(() => {
        Keyboard.dismiss();
        onClose();
    }, [onClose]);

    const parsedPrepMinutes = Number(prepMinutesCustom);
    const parsedCash = cashCustom.trim() ? parseFloat(cashCustom) : null;

    const canSubmit =
        isAvailable &&
        recipientPhone.trim().length >= 3 &&
        Number.isInteger(parsedPrepMinutes) &&
        parsedPrepMinutes >= 0 &&
        parsedPrepMinutes <= 180 &&
        !creating;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        Keyboard.dismiss();
        setSubmitError(null);
        try {
            await createOrder({
                variables: {
                    input: {
                        preparationMinutes: parsedPrepMinutes,
                        recipientPhone: recipientPhone.trim(),
                        recipientName: recipientName.trim() || null,
                        driverNotes: driverNotes.trim() || null,
                        cashToCollect: parsedCash,
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

    // ── Active orders tab content ────────────────────────────────────────
    const renderActiveOrders = () => (
        <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 4 }}
        >
            {activeOrders.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#374151" />
                    <Text style={{ color: '#64748b', fontSize: 14, marginTop: 12 }}>
                        {s.no_active_orders ?? 'No active direct call orders'}
                    </Text>
                </View>
            ) : (
                activeOrders.map((order) => {
                    const statusColor = STATUS_COLORS[order.status] ?? '#94a3b8';
                    const driverName = order.driver
                        ? `${order.driver.firstName} ${order.driver.lastName}`
                        : null;
                    return (
                        <View key={order.id} style={styles.activeOrderCard}>
                            {/* Header row */}
                            <View style={styles.activeOrderHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}44` }]}>
                                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                        {order.status.replace('_', ' ')}
                                    </Text>
                                </View>
                                <Text style={styles.activeOrderId}>#{order.displayId}</Text>
                            </View>

                            {/* Recipient row */}
                            <View style={styles.activeOrderRow}>
                                <Ionicons name="call-outline" size={14} color="#818cf8" style={styles.activeOrderIcon} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.activeOrderPhone}>{order.recipientPhone ?? '—'}</Text>
                                    {order.recipientName ? (
                                        <Text style={styles.activeOrderSubtext}>{order.recipientName}</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Driver row */}
                            <View style={styles.activeOrderRow}>
                                <Ionicons name="bicycle-outline" size={14} color={driverName ? '#34d399' : '#64748b'} style={styles.activeOrderIcon} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.activeOrderSubtext, { color: driverName ? '#e2e8f0' : '#64748b', fontWeight: driverName ? '700' : '400' }]}>
                                        {driverName ?? (s.awaiting_driver ?? 'Awaiting driver...')}
                                    </Text>
                                    {order.driver?.phoneNumber ? (
                                        <Text style={[styles.activeOrderSubtext, { color: '#94a3b8', fontSize: 12 }]}>
                                            {order.driver.phoneNumber}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Address row */}
                            {order.dropOffLocation?.address ? (
                                <View style={styles.activeOrderRow}>
                                    <Ionicons name="location-outline" size={14} color="#94a3b8" style={styles.activeOrderIcon} />
                                    <Text style={styles.activeOrderSubtext} numberOfLines={2}>
                                        {order.dropOffLocation.address}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Notes row */}
                            {order.driverNotes ? (
                                <View style={styles.activeOrderRow}>
                                    <Ionicons name="document-text-outline" size={14} color="#94a3b8" style={styles.activeOrderIcon} />
                                    <Text style={styles.activeOrderSubtext} numberOfLines={2}>
                                        {order.driverNotes}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Delivery fee */}
                            {order.deliveryPrice != null ? (
                                <View style={styles.activeOrderFeeRow}>
                                    <Text style={styles.activeOrderFeeLabel}>
                                        {s.delivery_fee ?? 'Delivery fee'}
                                    </Text>
                                    <Text style={styles.activeOrderFeeValue}>
                                        {order.deliveryPrice.toFixed(2)}€
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    );
                })
            )}
        </ScrollView>
    );

    // ── New request form ────────────────────────────────────────────────
    const renderNewRequestForm = () => (
        <>
            <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 140 },
                ]}
            >
                {/* Availability pill */}
                <View style={[styles.availPill, isAvailable ? styles.availPillOk : styles.availPillNo]}>
                    {availLoading ? (
                        <ActivityIndicator size="small" color="#818CF8" />
                    ) : (
                        <>
                            <View style={[styles.availDot, { backgroundColor: isAvailable ? '#34D399' : '#F87171' }]} />
                            <Text style={[styles.availText, { color: isAvailable ? '#34D399' : '#F87171' }]}>
                                {isAvailable
                                    ? (s.drivers_available ?? '{{count}} drivers available').replace('{{count}}', String(freeDrivers))
                                    : availability?.reason ?? (s.no_drivers ?? 'No drivers available')}
                            </Text>
                        </>
                    )}
                </View>

                {/* ── Section: Customer ── */}
                <Text style={styles.sectionLabel}>{s.section_customer ?? 'Customer'}</Text>

                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.input}
                        value={recipientPhone}
                        onChangeText={setRecipientPhone}
                        placeholder={s.phone_placeholder ?? 'Phone number *'}
                        placeholderTextColor="#4B5563"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        returnKeyType="next"
                    />
                    <View style={styles.inputDivider} />
                    <TextInput
                        style={styles.input}
                        value={recipientName}
                        onChangeText={setRecipientName}
                        placeholder={s.name_placeholder ?? 'Name (optional)'}
                        placeholderTextColor="#4B5563"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />
                </View>

                {/* ── Section: Prep Time ── */}
                <Text style={styles.sectionLabel}>{s.section_timing ?? 'Prep time (minutes)'}</Text>

                <TextInput
                    ref={prepInputRef}
                    style={styles.input}
                    value={prepMinutesCustom}
                    onChangeText={setPrepMinutesCustom}
                    placeholder={s.preparation_minutes_placeholder ?? 'e.g. 15 *'}
                    placeholderTextColor="#4B5563"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                />

                <Text style={styles.quickSelectLabel}>{s.quick_select ?? 'Quick select'}</Text>
                <View style={styles.chipRow}>
                    {PREP_PRESETS_MINS.map((mins) => {
                        const isActive = prepMinutesCustom === String(mins);
                        const label = mins === 0 ? (s.now_label ?? 'Now') : `${mins}m`;
                        return (
                            <Pressable
                                key={mins}
                                onPress={() => setPrepMinutesCustom(String(mins))}
                                style={[
                                    styles.chip,
                                    isActive && styles.chipActive,
                                    mins === 0 && isActive && styles.chipNowActive,
                                ]}
                            >
                                {mins === 0 && (
                                    <Ionicons
                                        name="flash"
                                        size={12}
                                        color={isActive ? '#34d399' : '#4B5563'}
                                        style={{ marginRight: 3 }}
                                    />
                                )}
                                <Text style={[styles.chipText, isActive && styles.chipTextActive, mins === 0 && isActive && styles.chipTextNow]}>
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ── Section: Cash ── */}
                <Text style={styles.sectionLabel}>{s.section_cash ?? 'Cash to collect'}</Text>

                <TextInput
                    ref={cashInputRef}
                    style={styles.input}
                    value={cashCustom}
                    onChangeText={setCashCustom}
                    placeholder={s.cash_to_collect_placeholder ?? 'Amount (e.g. 12.50)'}
                    placeholderTextColor="#4B5563"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                />

                <Text style={styles.quickSelectLabel}>{s.quick_select ?? 'Quick select'}</Text>
                <View style={styles.chipRow}>
                    <Pressable
                        onPress={() => setCashCustom('')}
                        style={[styles.chip, cashCustom === '' && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, cashCustom === '' && styles.chipTextActive]}>
                            {s.cash_none ?? 'None'}
                        </Text>
                    </Pressable>
                    {CASH_PRESETS_EUR.map((amt) => {
                        const isActive = cashCustom === String(amt);
                        return (
                            <Pressable
                                key={amt}
                                onPress={() => setCashCustom(String(amt))}
                                style={[styles.chip, isActive && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                    €{amt}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ── Section: Notes ── */}
                <Text style={styles.sectionLabel}>{s.section_notes ?? 'Driver notes'}</Text>

                <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={driverNotes}
                    onChangeText={setDriverNotes}
                    placeholder={s.notes_placeholder ?? 'Optional instructions (address, landmark…)'}
                    placeholderTextColor="#4B5563"
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                    blurOnSubmit
                />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                {submitError ? (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={14} color="#F87171" />
                        <Text style={styles.errorText}>{submitError}</Text>
                    </View>
                ) : null}

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
                                {parsedPrepMinutes === 0 ? ` · ${s.now_label ?? 'Now'}` : ` · ${parsedPrepMinutes}m`}
                            </Text>
                        </>
                    )}
                </Pressable>
            </View>
        </>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={dismiss}
        >
            <View style={styles.screen}>
                <View
                    style={[
                        styles.content,
                        { paddingTop: insets.top + 12 },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="call" size={16} color="#818CF8" />
                            </View>
                            <View style={styles.headerTextWrap}>
                                <Text style={styles.headerTitle}>{s.title ?? 'Request Delivery'}</Text>
                                {!showTabs ? (
                                    <Text style={styles.headerSubtitle}>
                                        {s.prep_hint ?? 'Set preparation minutes so drivers can be notified before the order is ready.'}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={8}>
                            <Ionicons name="close" size={16} color="#64748b" />
                        </Pressable>
                    </View>

                    {/* Tabs — only when there are active orders */}
                    {showTabs ? (
                        <View style={styles.tabRow}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'active' && styles.tabActive]}
                                onPress={() => setActiveTab('active')}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="list-outline"
                                    size={14}
                                    color={activeTab === 'active' ? '#818cf8' : '#64748b'}
                                />
                                <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                                    {s.active_orders_tab ?? 'Active Orders'}
                                </Text>
                                {activeOrders.length > 0 ? (
                                    <View style={styles.tabBadge}>
                                        <Text style={styles.tabBadgeText}>{activeOrders.length}</Text>
                                    </View>
                                ) : null}
                            </TouchableOpacity>

                            {dispatchEnabled ? (
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'new' && styles.tabActive]}
                                    onPress={() => setActiveTab('new')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="add-circle-outline"
                                        size={14}
                                        color={activeTab === 'new' ? '#818cf8' : '#64748b'}
                                    />
                                    <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
                                        {s.new_request_tab ?? 'New Request'}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.disabledBanner}>
                                    <Ionicons name="pause-circle-outline" size={13} color="#f59e0b" />
                                    <Text style={styles.disabledBannerText}>
                                        {s.feature_paused ?? 'New requests paused'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Tab content */}
                    {showTabs
                        ? activeTab === 'active'
                            ? renderActiveOrders()
                            : renderNewRequestForm()
                        : renderNewRequestForm()}
                </View>
            </View>
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
    // ── Availability pill ──
    availPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    availPillOk: {
        backgroundColor: '#34D39914',
        borderWidth: 1,
        borderColor: '#34D39930',
    },
    availPillNo: {
        backgroundColor: '#F8717114',
        borderWidth: 1,
        borderColor: '#F8717130',
    },
    availDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    availText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // ── Section labels ──
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginTop: 4,
    },
    quickSelectLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#4B5563',
        marginTop: 8,
        marginBottom: 6,
    },
    // ── Grouped input (phone + name) ──
    inputGroup: {
        backgroundColor: '#1F2937',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#374151',
        marginBottom: 20,
        overflow: 'hidden',
    },
    inputDivider: {
        height: 1,
        backgroundColor: '#374151',
        marginHorizontal: 14,
    },
    input: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 15,
        color: '#E5E7EB',
    },
    inputMultiline: {
        backgroundColor: '#1F2937',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#374151',
        minHeight: 72,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    // ── Chips ──
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    chipActive: {
        backgroundColor: '#312e81',
        borderColor: '#818CF8',
    },
    chipNowActive: {
        backgroundColor: '#052e16',
        borderColor: '#34d399',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#A1A1AA',
    },
    chipTextActive: {
        color: '#E0E7FF',
    },
    chipTextNow: {
        color: '#34d399',
    },
    // ── Footer ──
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
    // ── Tabs ──
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#18181b',
        paddingBottom: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    tabActive: {
        backgroundColor: '#818cf818',
        borderColor: '#818cf840',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    tabTextActive: {
        color: '#818cf8',
    },
    tabBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#818cf8',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
    },
    disabledBanner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#f59e0b14',
        borderWidth: 1,
        borderColor: '#f59e0b30',
    },
    disabledBannerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f59e0b',
    },
    // ── Active order cards ──
    activeOrderCard: {
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1f2937',
        gap: 8,
    },
    activeOrderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeOrderId: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94a3b8',
    },
    activeOrderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    activeOrderIcon: {
        marginTop: 1,
    },
    activeOrderPhone: {
        fontSize: 15,
        fontWeight: '700',
        color: '#e2e8f0',
    },
    activeOrderSubtext: {
        fontSize: 13,
        color: '#94a3b8',
        flex: 1,
    },
    activeOrderFeeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#1f2937',
    },
    activeOrderFeeLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    activeOrderFeeValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#e2e8f0',
    },
});
