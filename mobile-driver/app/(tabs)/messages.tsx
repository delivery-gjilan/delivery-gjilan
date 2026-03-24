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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
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

const ALERT_CONFIG: Record<AlertType, { bg: string; border: string; textColor: string; labelColor: string }> = {
    INFO: { bg: '#1e3a5f22', border: '#3b82f644', textColor: '#93c5fd', labelColor: '#60a5fa' },
    WARNING: { bg: '#451a0322', border: '#f59e0b44', textColor: '#fcd34d', labelColor: '#f59e0b' },
    URGENT: { bg: '#450a0a22', border: '#ef444444', textColor: '#fca5a5', labelColor: '#ef4444' },
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
    const d = new Date(iso);
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
    const user = useAuthStore((state) => state.user);
    const [messages, setMessages] = useState<DriverMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [adminId, setAdminId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const { loading } = useQuery<{ myDriverMessages: DriverMessage[] }>(MY_DRIVER_MESSAGES, {
        variables: { limit: 100 },
        onCompleted: (data) => {
            const msgs = data.myDriverMessages ?? [];
            setMessages(msgs);
            if (msgs.length > 0) {
                const adminMsg = msgs.find((m) => m.senderRole === 'ADMIN');
                if (adminMsg) setAdminId(adminMsg.adminId);
            }
        },
    });

    const [markRead] = useMutation(MARK_DRIVER_MESSAGES_READ_DRIVER);
    const [reply, { loading: replying }] = useMutation(REPLY_TO_DRIVER_MESSAGE, {
        onCompleted: (data) => {
            if (data?.replyToDriverMessage) {
                setMessages((prev) => [...prev, data.replyToDriverMessage]);
                scrollToBottom();
            }
        },
    });

    useSubscription(DRIVER_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.driverMessageReceived as DriverMessage | undefined;
            if (!msg) return;
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            if (msg.senderRole === 'ADMIN' && !adminId) {
                setAdminId(msg.adminId);
            }
            scrollToBottom();
        },
    });

    // Mark messages as read when screen mounts and when adminId is known
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
                            {msg.alertType}
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
                <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>Messages</Text>
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
