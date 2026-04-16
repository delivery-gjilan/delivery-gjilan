import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLEAR_STORAGE_KEY = 'driver_chat_cleared_at';
const EXTRA_MESSAGES_KEY = 'driver_chat_extra_messages';
const MAX_EXTRA_MESSAGES = 200;

/** Keep only the most-recent N messages to prevent unbounded AsyncStorage growth. */
function capMessages<T>(msgs: T[]): T[] {
    return msgs.length > MAX_EXTRA_MESSAGES ? msgs.slice(msgs.length - MAX_EXTRA_MESSAGES) : msgs;
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import {
    MY_DRIVER_MESSAGES,
    DRIVER_MESSAGE_RECEIVED_SUB,
    REPLY_TO_DRIVER_MESSAGE,
    MARK_DRIVER_MESSAGES_READ_DRIVER,
} from '@/graphql/operations/driverMessages';

type AlertType = 'INFO' | 'WARNING' | 'URGENT';

interface DriverMessage {
    id: string;
    adminId: string;
    driverId: string;
    senderRole: string;
    body: string;
    alertType: AlertType;
    readAt?: string | null;
    createdAt: string;
}

const ALERT_CONFIG: Record<AlertType, { bg: string; border: string; textColor: string; labelColor: string; labelKey: 'type_message' | 'type_warning' | 'type_urgent' }> = {
    INFO: { bg: '#1e3a5f22', border: '#3b82f644', textColor: '#93c5fd', labelColor: '#60a5fa', labelKey: 'type_message' },
    WARNING: { bg: '#451a0322', border: '#f59e0b44', textColor: '#fcd34d', labelColor: '#f59e0b', labelKey: 'type_warning' },
    URGENT: { bg: '#450a0a22', border: '#ef444444', textColor: '#fca5a5', labelColor: '#ef4444', labelKey: 'type_urgent' },
};

/** Parses both ISO-8601 and PostgreSQL's "2026-03-24 10:30:00+00" format safely on iOS */
function parseDate(value: string | null | undefined): Date {
    if (!value) return new Date(NaN);
    // Replace space separator that PostgreSQL uses — JSC on iOS rejects it
    const normalized = value.replace(' ', 'T');
    return new Date(normalized);
}

function formatTime(value: string) {
    const d = parseDate(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(value: string) {
    const d = parseDate(value);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return '__today__';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return '__yesterday__';
    return d.toLocaleDateString();
}

type ListItem =
    | { type: 'date'; label: string; key: string }
    | { type: 'message'; message: DriverMessage; key: string };

function buildListItems(messages: DriverMessage[]): ListItem[] {
    const items: ListItem[] = [];
    let lastDate = '';
    for (const msg of messages) {
        const label = formatDateLabel(msg.createdAt);
        if (label !== lastDate) {
            lastDate = label;
            items.push({ type: 'date', label, key: `date-${label}-${msg.id}` });
        }
        items.push({ type: 'message', message: msg, key: msg.id });
    }
    return items;
}

export default function MessagesScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const [extraMessages, setExtraMessages] = useState<DriverMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [clearedAt, setClearedAt] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Load persisted clear timestamp and persisted extra messages
    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(CLEAR_STORAGE_KEY),
            AsyncStorage.getItem(EXTRA_MESSAGES_KEY),
        ]).then(([clearVal, extrasVal]) => {
            if (clearVal) setClearedAt(parseInt(clearVal, 10));
            if (extrasVal) {
                try { setExtraMessages(JSON.parse(extrasVal)); } catch { /* ignore */ }
            }
        });
    }, []);

    const { loading, data: queryData, refetch } = useQuery<{ myDriverMessages: DriverMessage[] }>(MY_DRIVER_MESSAGES, {
        variables: { limit: 100 },
        fetchPolicy: 'cache-and-network',
        pollInterval: 30_000,
    });

    // Refetch whenever the screen comes into focus (handles missed subscription events)
    useFocusEffect(useCallback(() => {
        refetch();
    }, [refetch]));

    // Derive base messages directly from query data (survives remount/cache)
    const baseMessages = queryData?.myDriverMessages ?? [];

    // Merge base messages with any extras that arrived via subscription/mutation, filtered by clearedAt
    const messages = React.useMemo(() => {
        const byId = new Map(baseMessages.map((m) => [m.id, m]));
        for (const m of extraMessages) {
            if (!byId.has(m.id)) byId.set(m.id, m);
        }
        return Array.from(byId.values())
            .filter((m) => !clearedAt || parseDate(m.createdAt).getTime() > clearedAt)
            .sort((a, b) => parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime());
    }, [baseMessages, extraMessages, clearedAt]);

    // Prefer the latest admin message from the merged stream so send works even when
    // the first admin message arrived via subscription and is not yet present in query data.
    const adminId = React.useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.senderRole === 'ADMIN' && msg.adminId) return msg.adminId;
        }
        return null;
    }, [messages]);

    const [markRead] = useMutation(MARK_DRIVER_MESSAGES_READ_DRIVER);
    const [reply, { loading: replying }] = useMutation(REPLY_TO_DRIVER_MESSAGE, {
        onCompleted: (data) => {
            if (data?.replyToDriverMessage) {
                setExtraMessages((prev) => {
                    const next = capMessages([...prev, data.replyToDriverMessage]);
                    AsyncStorage.setItem(EXTRA_MESSAGES_KEY, JSON.stringify(next));
                    return next;
                });
                scrollToBottom();
            }
        },
    });

    useSubscription(DRIVER_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.driverMessageReceived as DriverMessage | undefined;
            if (!msg) return;
            setExtraMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                const next = capMessages([...prev, msg]);
                AsyncStorage.setItem(EXTRA_MESSAGES_KEY, JSON.stringify(next));
                return next;
            });
            scrollToBottom();
        },
    });

    // Mark messages as read when adminId becomes known
    useEffect(() => {
        if (adminId) {
            markRead({ variables: { otherUserId: adminId } });
        }
    }, [adminId, markRead]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, []);

    useEffect(() => {
        if (messages.length > 0) scrollToBottom();
    }, [messages.length, scrollToBottom]);

    const handleSend = async () => {
        const body = replyText.trim();
        if (!body || replying) return;
        setReplyText('');
        try {
            await reply({ variables: { adminId: adminId ?? '', body } });
        } catch (error) {
            setReplyText(body);
            Alert.alert(t.common.error, error instanceof Error ? error.message : 'Failed to send message');
        }
    };

    const handleClearChat = () => {
        Alert.alert(
            t.messages.clear_confirm_title,
            t.messages.clear_confirm_message,
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.messages.clear,
                    style: 'destructive',
                    onPress: async () => {
                        const now = Date.now();
                        await AsyncStorage.setItem(CLEAR_STORAGE_KEY, now.toString());
                        await AsyncStorage.removeItem(EXTRA_MESSAGES_KEY);
                        setClearedAt(now);
                        setExtraMessages([]);
                    },
                },
            ],
        );
    };

    // Resolve __today__ / __yesterday__ sentinel values from date label builder
    const resolveDateLabel = (raw: string): string => {
        if (raw === '__today__') return t.messages.today;
        if (raw === '__yesterday__') return t.messages.yesterday;
        return raw;
    };

    const listItems = buildListItems(messages);

    const renderItem = ({ item }: { item: ListItem }) => {
        if (item.type === 'date') {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    <Text style={{ color: theme.colors.subtext, fontSize: 11, marginHorizontal: 8, fontWeight: '600' }}>
                        {resolveDateLabel(item.label)}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                </View>
            );
        }

        const { message: msg } = item;
        const isDriver = msg.senderRole === 'DRIVER';
        const alertCfg = ALERT_CONFIG[msg.alertType] ?? ALERT_CONFIG.INFO;

        return (
            <View
                style={{
                    paddingHorizontal: 16,
                    marginBottom: 8,
                    alignItems: isDriver ? 'flex-end' : 'flex-start',
                }}
            >
                <View
                    style={{
                        maxWidth: '78%',
                        borderRadius: 18,
                        borderWidth: 1,
                        backgroundColor: isDriver
                            ? theme.colors.card
                            : alertCfg.bg,
                        borderColor: isDriver
                            ? theme.colors.border
                            : alertCfg.border,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                    }}
                >
                    {!isDriver && (
                        <Text style={{ color: alertCfg.labelColor, fontSize: 10, fontWeight: '700', marginBottom: 3 }}>
                            {t.messages[alertCfg.labelKey]}
                        </Text>
                    )}
                    <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20 }}>{msg.body}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, gap: 4 }}>
                        <Text style={{ color: theme.colors.subtext, fontSize: 10 }}>{formatTime(msg.createdAt)}</Text>
                        {!isDriver && msg.readAt && (
                            <Text style={{ color: '#6366f1', fontSize: 10 }}>✓ Read</Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View
                style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </Pressable>
                <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, flex: 1 }}>{t.tabs.messages}</Text>
                {messages.length > 0 && (
                    <Pressable
                        onPress={handleClearChat}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                    >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.subtext} />
                    </Pressable>
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {loading && messages.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={theme.colors.primary} />
                    </View>
                ) : messages.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                        <Ionicons name="chatbubble-outline" size={48} color={theme.colors.subtext} style={{ marginBottom: 12 }} />
                        <Text style={{ color: theme.colors.subtext, fontSize: 14, textAlign: 'center' }}>
                            {t.messages.no_messages_title}{'\n'}{t.messages.no_messages_sub}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={listItems}
                        keyExtractor={(item) => item.key}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingVertical: 12 }}
                        onLayout={scrollToBottom}
                    />
                )}

                {/* Reply input */}
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        gap: 10,
                    }}
                >
                    <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder={t.messages.placeholder}
                        placeholderTextColor={theme.colors.subtext}
                        multiline
                        autoCorrect={false}
                        spellCheck={false}
                        autoCapitalize="none"
                        style={{
                            flex: 1,
                            backgroundColor: theme.colors.card,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            paddingHorizontal: 14,
                            paddingTop: 10,
                            paddingBottom: 10,
                            color: theme.colors.text,
                            fontSize: 14,
                            maxHeight: 100,
                        }}
                    />
                    <Pressable
                        onPress={handleSend}
                        disabled={!replyText.trim() || replying}
                        style={({ pressed }) => ({
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            backgroundColor: !replyText.trim()
                                ? theme.colors.border
                                : theme.colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed && !replyText.trim() ? 0.5 : (pressed ? 0.8 : 1),
                        })}
                    >
                        {replying ? (
                            <ActivityIndicator size="small" color={!replyText.trim() ? theme.colors.subtext : '#fff'} />
                        ) : (
                            <Ionicons name="send" size={18} color={!replyText.trim() ? theme.colors.subtext : '#fff'} />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
