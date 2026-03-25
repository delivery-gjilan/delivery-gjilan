import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
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

const ALERT_CONFIG: Record<AlertType, { bg: string; border: string; textColor: string; labelColor: string; labelText: string }> = {
    INFO: { bg: '#1e3a5f22', border: '#3b82f644', textColor: '#93c5fd', labelColor: '#60a5fa', labelText: 'Message' },
    WARNING: { bg: '#451a0322', border: '#f59e0b44', textColor: '#fcd34d', labelColor: '#f59e0b', labelText: 'Warning' },
    URGENT: { bg: '#450a0a22', border: '#ef444444', textColor: '#fca5a5', labelColor: '#ef4444', labelText: 'Urgent' },
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
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
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
    const router = useRouter();
    const [extraMessages, setExtraMessages] = useState<DriverMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [clearedAt, setClearedAt] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Load persisted clear timestamp
    useEffect(() => {
        AsyncStorage.getItem(CLEAR_STORAGE_KEY).then((val) => {
            if (val) setClearedAt(parseInt(val, 10));
        });
    }, []);

    const { loading, data: queryData } = useQuery<{ myDriverMessages: DriverMessage[] }>(MY_DRIVER_MESSAGES, {
        variables: { limit: 100 },
        fetchPolicy: 'cache-and-network',
    });

    // Derive base messages and adminId directly from query data (survives remount/cache)
    const baseMessages = queryData?.myDriverMessages ?? [];
    const adminId = baseMessages.find((m) => m.senderRole === 'ADMIN')?.adminId ?? null;

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

    const [markRead] = useMutation(MARK_DRIVER_MESSAGES_READ_DRIVER);
    const [reply, { loading: replying }] = useMutation(REPLY_TO_DRIVER_MESSAGE, {
        onCompleted: (data) => {
            if (data?.replyToDriverMessage) {
                setExtraMessages((prev) => [...prev, data.replyToDriverMessage]);
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
                return [...prev, msg];
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
        if (!body || !adminId || replying) return;
        setReplyText('');
        await reply({ variables: { adminId, body } });
    };

    const handleClearChat = () => {
        Alert.alert(
            'Clear Chat',
            'This will hide all current messages. New messages will still appear.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        const now = Date.now();
                        await AsyncStorage.setItem(CLEAR_STORAGE_KEY, now.toString());
                        setClearedAt(now);
                    },
                },
            ],
        );
    };

    const listItems = buildListItems(messages);

    const renderItem = ({ item }: { item: ListItem }) => {
        if (item.type === 'date') {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    <Text style={{ color: theme.colors.subtext, fontSize: 11, marginHorizontal: 8, fontWeight: '600' }}>
                        {item.label}
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
                            {alertCfg.labelText}
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, flex: 1 }}>Messages</Text>
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
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={theme.colors.primary} />
                    </View>
                ) : messages.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                        <Ionicons name="chatbubble-outline" size={48} color={theme.colors.subtext} style={{ marginBottom: 12 }} />
                        <Text style={{ color: theme.colors.subtext, fontSize: 14, textAlign: 'center' }}>
                            No messages yet. Your dispatcher will reach out here.
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
                        placeholder="Reply…"
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
                        disabled={!replyText.trim() || replying || !adminId}
                        style={({ pressed }) => ({
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            backgroundColor: !replyText.trim() || !adminId
                                ? theme.colors.border
                                : theme.colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.8 : 1,
                        })}
                    >
                        {replying ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
