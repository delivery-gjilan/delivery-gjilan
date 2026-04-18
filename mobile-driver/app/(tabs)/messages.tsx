import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApolloClient } from '@apollo/client';
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

function mergeMessagesById(messages: DriverMessage[]): DriverMessage[] {
    const byId = new Map(messages.map((message) => [message.id, message]));
    return Array.from(byId.values())
        .sort((a, b) => parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime());
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

type AlertConfig = { bg: string; border: string; textColor: string; labelColor: string; labelKey: 'type_message' | 'type_warning' | 'type_urgent' };

function getAlertConfig(isDark: boolean): Record<AlertType, AlertConfig> {
    if (isDark) {
        return {
            INFO: { bg: '#1e3a5f22', border: '#3b82f644', textColor: '#93c5fd', labelColor: '#60a5fa', labelKey: 'type_message' },
            WARNING: { bg: '#451a0322', border: '#f59e0b44', textColor: '#fcd34d', labelColor: '#f59e0b', labelKey: 'type_warning' },
            URGENT: { bg: '#450a0a22', border: '#ef444444', textColor: '#fca5a5', labelColor: '#ef4444', labelKey: 'type_urgent' },
        };
    }

    return {
        INFO: { bg: '#e0f2fe', border: '#7dd3fc', textColor: '#0c4a6e', labelColor: '#0369a1', labelKey: 'type_message' },
        WARNING: { bg: '#fffbeb', border: '#fcd34d', textColor: '#92400e', labelColor: '#b45309', labelKey: 'type_warning' },
        URGENT: { bg: '#fef2f2', border: '#fca5a5', textColor: '#991b1b', labelColor: '#b91c1c', labelKey: 'type_urgent' },
    };
}

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
    const apolloClient = useApolloClient();
    const theme = useTheme();
    const isDark = theme.colors.background === '#000000';
    const ALERT_CONFIG = React.useMemo(() => getAlertConfig(isDark), [isDark]);
    const { t } = useTranslations();
    const router = useRouter();
    const [extraMessages, setExtraMessages] = useState<DriverMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [clearedAt, setClearedAt] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const persistExtraMessages = useCallback((messagesToPersist: DriverMessage[]) => {
        void AsyncStorage.setItem(EXTRA_MESSAGES_KEY, JSON.stringify(messagesToPersist));
    }, []);

    const syncMessagesToCache = useCallback((incomingMessages: DriverMessage[]) => {
        apolloClient.cache.updateQuery<{ myDriverMessages: DriverMessage[] }>(
            { query: MY_DRIVER_MESSAGES, variables: { limit: 100 } },
            (existing) => {
                const merged = mergeMessagesById([
                    ...(existing?.myDriverMessages ?? []),
                    ...incomingMessages,
                ]);

                return {
                    myDriverMessages: merged.slice(-100),
                };
            },
        );
    }, [apolloClient]);

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

    const allMessages = React.useMemo(() => {
        return mergeMessagesById([...baseMessages, ...extraMessages]);
    }, [baseMessages, extraMessages]);

    useEffect(() => {
        if (baseMessages.length === 0 || extraMessages.length === 0) return;

        const baseIds = new Set(baseMessages.map((message) => message.id));
        setExtraMessages((prev) => {
            const next = prev.filter((message) => !baseIds.has(message.id));
            if (next.length !== prev.length) {
                persistExtraMessages(next);
            }
            return next;
        });
    }, [baseMessages, extraMessages.length, persistExtraMessages]);

    // Merge base messages with any extras that arrived via subscription/mutation, filtered by clearedAt
    const messages = React.useMemo(() => {
        return allMessages.filter((m) => !clearedAt || parseDate(m.createdAt).getTime() > clearedAt);
    }, [allMessages, clearedAt]);

    const hasHiddenMessages = React.useMemo(() => {
        if (!clearedAt) return false;
        return allMessages.some((m) => parseDate(m.createdAt).getTime() <= clearedAt);
    }, [allMessages, clearedAt]);

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
                syncMessagesToCache([data.replyToDriverMessage]);
                setExtraMessages((prev) => {
                    const next = capMessages(mergeMessagesById([...prev, data.replyToDriverMessage]));
                    persistExtraMessages(next);
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
            syncMessagesToCache([msg]);
            setExtraMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                const next = capMessages(mergeMessagesById([...prev, msg]));
                persistExtraMessages(next);
                return next;
            });
            void refetch();
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
            await refetch();
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

    const handleRestoreHistory = useCallback(async () => {
        await AsyncStorage.removeItem(CLEAR_STORAGE_KEY);
        setClearedAt(null);
        refetch();
    }, [refetch]);

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
                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                    <View style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                    }}>
                        <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: '700' }}>
                        {resolveDateLabel(item.label)}
                        </Text>
                    </View>
                </View>
            );
        }

        const { message: msg } = item;
        const isDriver = msg.senderRole === 'DRIVER';
        const alertCfg = ALERT_CONFIG[msg.alertType] ?? ALERT_CONFIG.INFO;
        const bubbleBg = isDriver ? theme.colors.primary : alertCfg.bg;
        const bubbleBorder = isDriver ? 'transparent' : alertCfg.border;
        const bubbleText = isDriver ? '#ffffff' : theme.colors.text;
        const metaText = isDriver ? 'rgba(255,255,255,0.75)' : theme.colors.subtext;

        return (
            <View
                style={{
                    paddingHorizontal: 16,
                    marginBottom: 10,
                    alignItems: isDriver ? 'flex-end' : 'flex-start',
                }}
            >
                <View style={{
                    width: '100%',
                    flexDirection: isDriver ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 8,
                }}>
                    {!isDriver && (
                        <View style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: alertCfg.labelColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 2,
                        }}>
                            <Ionicons name="megaphone" size={13} color="#fff" />
                        </View>
                    )}

                    <View
                        style={{
                            maxWidth: '82%',
                            borderRadius: 20,
                            borderBottomRightRadius: isDriver ? 8 : 20,
                            borderBottomLeftRadius: isDriver ? 20 : 8,
                            borderWidth: isDriver ? 0 : 1,
                            backgroundColor: bubbleBg,
                            borderColor: bubbleBorder,
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                            shadowColor: '#000',
                            shadowOpacity: isDark ? 0.18 : 0.08,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 2,
                        }}
                    >
                        {!isDriver && (
                            <Text style={{ color: alertCfg.labelColor, fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 }}>
                                {t.messages[alertCfg.labelKey]}
                            </Text>
                        )}

                        <Text style={{ color: bubbleText, fontSize: 14, lineHeight: 20 }}>{msg.body}</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, gap: 5 }}>
                            <Text style={{ color: metaText, fontSize: 10 }}>{formatTime(msg.createdAt)}</Text>
                            {!isDriver && msg.readAt && (
                                <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '700' }}>✓</Text>
                            )}
                        </View>
                    </View>

                    {isDriver && (
                        <View style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 2,
                        }}>
                            <Ionicons name="person" size={13} color={theme.colors.subtext} />
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View
                style={{
                    paddingHorizontal: 18,
                    paddingVertical: 12,
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

                <View style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: theme.colors.text }}>{t.tabs.messages}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 1 }}>
                        {t.messages.no_messages_sub}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {hasHiddenMessages && (
                        <Pressable
                            onPress={handleRestoreHistory}
                            hitSlop={8}
                            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                        >
                            <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
                        </Pressable>
                    )}

                    {(messages.length > 0 || hasHiddenMessages) && (
                        <Pressable
                            onPress={handleClearChat}
                            hitSlop={8}
                            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.colors.subtext} />
                        </Pressable>
                    )}
                </View>
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
                        <View style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 14,
                        }}>
                            <Ionicons name="chatbubble-ellipses-outline" size={32} color={theme.colors.subtext} />
                        </View>
                        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>
                            {hasHiddenMessages ? t.messages.history_hidden_title : t.messages.no_messages_title}
                        </Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 13, textAlign: 'center' }}>
                            {hasHiddenMessages ? t.messages.history_hidden_sub : t.messages.no_messages_sub}
                        </Text>
                        {hasHiddenMessages && (
                            <Pressable
                                onPress={handleRestoreHistory}
                                style={({ pressed }) => ({
                                    marginTop: 16,
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    backgroundColor: theme.colors.primary,
                                    opacity: pressed ? 0.85 : 1,
                                })}
                            >
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                                    {t.messages.show_history}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={listItems}
                        keyExtractor={(item) => item.key}
                        renderItem={renderItem}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                        onLayout={scrollToBottom}
                    />
                )}

                {/* Reply input */}
                <View
                    style={{
                        paddingHorizontal: 14,
                        paddingTop: 8,
                        paddingBottom: 12,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                    }}
                >
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        gap: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.card,
                        borderRadius: 24,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                    }}>
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
                                color: theme.colors.text,
                                fontSize: 14,
                                maxHeight: 100,
                                paddingHorizontal: 6,
                                paddingVertical: 6,
                            }}
                        />
                        <Pressable
                            onPress={handleSend}
                            disabled={!replyText.trim() || replying}
                            style={({ pressed }) => ({
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: !replyText.trim() ? theme.colors.border : theme.colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: pressed ? 0.8 : 1,
                            })}
                        >
                            {replying ? (
                                <ActivityIndicator size="small" color={!replyText.trim() ? theme.colors.subtext : '#fff'} />
                            ) : (
                                <Ionicons name="paper-plane" size={16} color={!replyText.trim() ? theme.colors.subtext : '#fff'} />
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
