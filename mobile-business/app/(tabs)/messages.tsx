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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    MY_BUSINESS_MESSAGES,
    BUSINESS_MESSAGE_RECEIVED_SUB,
    REPLY_TO_BUSINESS_MESSAGE,
    MARK_BUSINESS_MESSAGES_READ_BUSINESS,
} from '@/graphql/messages';
import { useTranslation } from '@/hooks/useTranslation';

const CLEAR_STORAGE_KEY = 'business_chat_cleared_at';
const EXTRA_MESSAGES_KEY = 'business_chat_extra_messages';

type AlertType = 'INFO' | 'WARNING' | 'URGENT';

interface BusinessMessage {
    id: string;
    adminId: string;
    businessUserId: string;
    senderRole: string;
    body: string;
    alertType: AlertType;
    readAt?: string | null;
    createdAt: string;
}

const COLORS = {
    bg: '#09090b',
    card: '#1e293b',
    border: '#334155',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    primary: '#7c3aed',
};

const ALERT_CONFIG: Record<AlertType, { bg: string; border: string; textColor: string; labelColor: string; labelText: string }> = {
    INFO: { bg: '#1e0a4a22', border: '#7c3aed44', textColor: '#c4b5fd', labelColor: '#a78bfa', labelText: 'Message' },
    WARNING: { bg: '#451a0322', border: '#f59e0b44', textColor: '#fcd34d', labelColor: '#f59e0b', labelText: 'Warning' },
    URGENT: { bg: '#450a0a22', border: '#ef444444', textColor: '#fca5a5', labelColor: '#ef4444', labelText: 'Urgent' },
};

/** Parses both ISO-8601 and PostgreSQL's "2026-03-24 10:30:00+00" format safely on iOS */
function parseDate(value: string | null | undefined): Date {
    if (!value) return new Date(NaN);
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
    | { type: 'message'; message: BusinessMessage; key: string };

function buildListItems(messages: BusinessMessage[]): ListItem[] {
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
    const { t } = useTranslation();
    const [extraMessages, setExtraMessages] = useState<BusinessMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [clearedAt, setClearedAt] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Load persisted clear timestamp and extra messages
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

    const { loading, data: queryData, refetch } = useQuery<{ myBusinessMessages: BusinessMessage[] }>(MY_BUSINESS_MESSAGES, {
        variables: { limit: 100 },
        fetchPolicy: 'cache-and-network',
        pollInterval: 30_000,
    });

    // Refetch whenever the screen comes into focus (handles missed subscription events)
    useFocusEffect(useCallback(() => {
        refetch();
    }, [refetch]));

    // Derive base messages directly from query data (survives remount/cache)
    const baseMessages = queryData?.myBusinessMessages ?? [];

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

    // Resolve admin target from the merged stream so send works even when
    // the first admin message arrives via subscription before query refresh.
    const adminId = React.useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.senderRole === 'ADMIN' && msg.adminId) return msg.adminId;
        }
        return null;
    }, [messages]);

    const [markRead] = useMutation(MARK_BUSINESS_MESSAGES_READ_BUSINESS);
    const [reply, { loading: replying }] = useMutation(REPLY_TO_BUSINESS_MESSAGE, {
        onCompleted: (data) => {
            if (data?.replyToBusinessMessage) {
                setExtraMessages((prev) => {
                    const next = [...prev, data.replyToBusinessMessage];
                    AsyncStorage.setItem(EXTRA_MESSAGES_KEY, JSON.stringify(next));
                    return next;
                });
                scrollToBottom();
            }
        },
    });

    useSubscription(BUSINESS_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.businessMessageReceived as BusinessMessage | undefined;
            if (!msg) return;
            setExtraMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                const next = [...prev, msg];
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
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed to send message');
        }
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
                        await AsyncStorage.removeItem(EXTRA_MESSAGES_KEY);
                        setClearedAt(now);
                        setExtraMessages([]);
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
                    <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
                    <Text style={{ color: COLORS.subtext, fontSize: 11, marginHorizontal: 8, fontWeight: '600' }}>
                        {item.label}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
                </View>
            );
        }

        const { message: msg } = item;
        const isBusiness = msg.senderRole === 'BUSINESS';
        const alertCfg = ALERT_CONFIG[msg.alertType] ?? ALERT_CONFIG.INFO;

        return (
            <View
                style={{
                    paddingHorizontal: 16,
                    marginBottom: 8,
                    alignItems: isBusiness ? 'flex-end' : 'flex-start',
                }}
            >
                <View
                    style={{
                        maxWidth: '78%',
                        borderRadius: 18,
                        borderWidth: 1,
                        backgroundColor: isBusiness ? COLORS.card : alertCfg.bg,
                        borderColor: isBusiness ? COLORS.border : alertCfg.border,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                    }}
                >
                    {!isBusiness && (
                        <Text style={{ color: alertCfg.labelColor, fontSize: 10, fontWeight: '700', marginBottom: 3 }}>
                            {alertCfg.labelText}
                        </Text>
                    )}
                    <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20 }}>{msg.body}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, gap: 4 }}>
                        <Text style={{ color: COLORS.subtext, fontSize: 10 }}>{formatTime(msg.createdAt)}</Text>
                        {!isBusiness && msg.readAt && (
                            <Text style={{ color: COLORS.primary, fontSize: 10 }}>✓ Read</Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            {/* Header */}
            <View
                style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <Ionicons name="chatbubbles-outline" size={22} color={COLORS.primary} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 }}>
                    {t('tabs.messages', 'Messages')}
                </Text>
                {messages.length > 0 && (
                    <Pressable
                        onPress={handleClearChat}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                    >
                        <Ionicons name="trash-outline" size={20} color={COLORS.subtext} />
                    </Pressable>
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {loading && messages.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={COLORS.primary} />
                    </View>
                ) : messages.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                        <Ionicons name="chatbubble-outline" size={48} color={COLORS.subtext} style={{ marginBottom: 12 }} />
                        <Text style={{ color: COLORS.subtext, fontSize: 14, textAlign: 'center' }}>
                            {t('messages.empty', 'No messages yet. Your admin will reach out here.')}
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
                        borderTopColor: COLORS.border,
                        backgroundColor: COLORS.bg,
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        gap: 10,
                    }}
                >
                    <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder={t('messages.reply_placeholder', 'Reply…')}
                        placeholderTextColor={COLORS.subtext}
                        multiline
                        autoCorrect={false}
                        spellCheck={false}
                        autoCapitalize="none"
                        style={{
                            flex: 1,
                            backgroundColor: COLORS.card,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            paddingHorizontal: 14,
                            paddingTop: 10,
                            paddingBottom: 10,
                            color: COLORS.text,
                            fontSize: 14,
                            maxHeight: 100,
                        }}
                    />
                    <Pressable
                        onPress={handleSend}
                        disabled={!replyText.trim() || replying}
                        style={({ pressed }) => ({
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: COLORS.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: (!replyText.trim() || replying) ? 0.4 : pressed ? 0.8 : 1,
                        })}
                    >
                        <Ionicons name="send" size={18} color="#fff" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
