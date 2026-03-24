'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import {
    GET_BUSINESS_MESSAGE_THREADS,
    GET_BUSINESS_MESSAGES,
} from '@/graphql/operations/businessMessages/queries';
import {
    SEND_BUSINESS_MESSAGE,
    MARK_BUSINESS_MESSAGES_READ,
} from '@/graphql/operations/businessMessages/mutations';
import { ADMIN_BUSINESS_MESSAGE_RECEIVED } from '@/graphql/operations/businessMessages/subscriptions';
import { USERS_QUERY } from '@/graphql/operations/users/queries';
import { toast } from 'sonner';
import { MessageSquare, Send, AlertTriangle, Info, Zap, Plus, Search, X, Building2 } from 'lucide-react';

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

interface BusinessMessageThread {
    businessUserId: string;
    businessUserName: string;
    unreadCount: number;
    lastMessage?: BusinessMessage | null;
}

interface UserItem {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    business?: { id: string; name: string } | null;
}

const ALERT_STYLES: Record<AlertType, { badge: string; border: string; bg: string; icon: React.ReactNode }> = {
    INFO: {
        badge: 'bg-purple-500/20 text-purple-300',
        border: 'border-purple-500/30',
        bg: 'bg-purple-500/10',
        icon: <Info size={12} className="inline mr-1" />,
    },
    WARNING: {
        badge: 'bg-amber-500/20 text-amber-300',
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        icon: <AlertTriangle size={12} className="inline mr-1" />,
    },
    URGENT: {
        badge: 'bg-red-500/20 text-red-300',
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        icon: <Zap size={12} className="inline mr-1" />,
    },
};

function formatTime(iso: string) {
    const d = new Date(iso.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
    const d = new Date(iso.replace(' ', 'T'));
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
}

export default function BusinessMessagesPage() {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUserName, setSelectedUserName] = useState<string>('');
    const [messageInput, setMessageInput] = useState('');
    const [alertType, setAlertType] = useState<AlertType>('INFO');
    const [messages, setMessages] = useState<BusinessMessage[]>([]);
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } =
        useQuery<{ businessMessageThreads: BusinessMessageThread[] }>(GET_BUSINESS_MESSAGE_THREADS, {
            pollInterval: 30000,
        });

    const { data: usersData } = useQuery<{ users: UserItem[] }>(USERS_QUERY);

    const { loading: messagesLoading, refetch: refetchMessages } =
        useQuery<{ businessMessages: BusinessMessage[] }>(
            GET_BUSINESS_MESSAGES,
            {
                variables: { businessUserId: selectedUserId, limit: 100 },
                skip: !selectedUserId,
                onCompleted: (data) => {
                    setMessages(data.businessMessages ?? []);
                },
            }
        );

    const [sendMessage, { loading: sending }] = useMutation(SEND_BUSINESS_MESSAGE, {
        onCompleted: (data) => {
            if (data?.sendBusinessMessage) {
                setMessages((prev) => [...prev, data.sendBusinessMessage]);
                refetchThreads();
            }
        },
        onError: (err) => toast.error('Failed to send: ' + err.message),
    });

    const [markRead] = useMutation(MARK_BUSINESS_MESSAGES_READ);

    useSubscription(ADMIN_BUSINESS_MESSAGE_RECEIVED, {
        variables: { businessUserId: selectedUserId },
        skip: !selectedUserId,
        onData: ({ data: subData }) => {
            const msg = subData.data?.adminBusinessMessageReceived as BusinessMessage | undefined;
            if (!msg) return;
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            refetchThreads();
            if (msg.senderRole === 'BUSINESS') {
                toast.info(`${selectedUserName}: ${msg.body}`);
            }
        },
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark as read when opening thread
    useEffect(() => {
        if (!selectedUserId) return;
        markRead({ variables: { otherUserId: selectedUserId } });
    }, [selectedUserId, markRead]);

    const handleSelectThread = (thread: BusinessMessageThread) => {
        setSelectedUserId(thread.businessUserId);
        setSelectedUserName(thread.businessUserName);
        setMessages([]);
        refetchMessages();
    };

    const handleStartNewConversation = (user: UserItem) => {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
        setSelectedUserId(user.id);
        setSelectedUserName(name);
        setMessages([]);
        setShowUserPicker(false);
        setUserSearch('');
        refetchMessages();
    };

    const handleSend = async () => {
        const body = messageInput.trim();
        if (!body || !selectedUserId) return;
        setMessageInput('');
        await sendMessage({
            variables: { businessUserId: selectedUserId, body, alertType },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const threads = threadsData?.businessMessageThreads ?? [];
    const allUsers = (usersData?.users ?? []).filter(
        (u) => u.role === 'BUSINESS_OWNER' || u.role === 'BUSINESS_EMPLOYEE',
    );
    const filteredUsers = allUsers.filter((u) => {
        const name = [u.firstName, u.lastName].join(' ').toLowerCase();
        return (
            name.includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.business?.name ?? '').toLowerCase().includes(userSearch.toLowerCase())
        );
    });

    // Group messages by date
    type MessageGroup = { date: string; messages: BusinessMessage[] };
    const grouped: MessageGroup[] = [];
    for (const msg of messages) {
        const date = formatDate(msg.createdAt);
        if (!grouped.length || grouped[grouped.length - 1].date !== date) {
            grouped.push({ date, messages: [msg] });
        } else {
            grouped[grouped.length - 1].messages.push(msg);
        }
    }

    return (
        <div className="relative flex h-full rounded-xl overflow-hidden border border-white/10 bg-[#111113]">
            {/* Left panel — thread list */}
            <div className="w-72 flex-shrink-0 border-r border-white/10 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Building2 size={16} className="text-purple-400" />
                        Business Messages
                    </h2>
                    <button
                        onClick={() => setShowUserPicker(true)}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg px-2.5 py-1.5 transition-colors font-medium"
                    >
                        <Plus size={13} />
                        New
                    </button>
                </div>

                {threadsLoading && (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        Loading…
                    </div>
                )}

                {!threadsLoading && threads.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm px-4 text-center gap-3">
                        <Building2 size={32} className="text-zinc-700" />
                        <p>No conversations yet.</p>
                        <button
                            onClick={() => setShowUserPicker(true)}
                            className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
                        >
                            Start a new conversation
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {threads.map((thread) => {
                        const isActive = thread.businessUserId === selectedUserId;
                        const alertStyle = thread.lastMessage
                            ? ALERT_STYLES[thread.lastMessage.alertType] ?? ALERT_STYLES.INFO
                            : null;
                        return (
                            <button
                                key={thread.businessUserId}
                                onClick={() => handleSelectThread(thread)}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${isActive ? 'bg-white/10' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-white truncate">
                                        {thread.businessUserName}
                                    </span>
                                    {thread.unreadCount > 0 && (
                                        <span className="ml-2 flex-shrink-0 text-xs font-bold bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                            {thread.unreadCount}
                                        </span>
                                    )}
                                </div>
                                {thread.lastMessage && (
                                    <div className="flex items-center gap-1.5">
                                        {alertStyle && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${alertStyle.badge}`}>
                                                {thread.lastMessage.alertType}
                                            </span>
                                        )}
                                        <p className="text-xs text-zinc-400 truncate">
                                            {thread.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}
                                            {thread.lastMessage.body}
                                        </p>
                                    </div>
                                )}
                                {thread.lastMessage && (
                                    <p className="text-[10px] text-zinc-600 mt-0.5">
                                        {formatTime(thread.lastMessage.createdAt)}
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Business user picker modal */}
            {showUserPicker && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => { setShowUserPicker(false); setUserSearch(''); }}
                >
                    <div
                        className="bg-[#18181b] border border-white/10 rounded-2xl w-80 shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <span className="text-sm font-semibold text-white">Choose a business user</span>
                            <button
                                onClick={() => { setShowUserPicker(false); setUserSearch(''); }}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-3 py-2 border-b border-white/10">
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                <Search size={14} className="text-zinc-500 flex-shrink-0" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search by name, email, or business…"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredUsers.length === 0 && (
                                <p className="text-center text-zinc-500 text-sm py-6">No business users found</p>
                            )}
                            {filteredUsers.map((user) => {
                                const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => handleStartNewConversation(user)}
                                        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-purple-300">
                                                {name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{name}</p>
                                            <p className="text-xs text-zinc-500 truncate">
                                                {user.business?.name ? `${user.business.name} · ` : ''}{user.email}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Right panel — chat view */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedUserId ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        Select a business user to view messages
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-purple-300">
                                    {selectedUserName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{selectedUserName}</p>
                                <p className="text-[10px] text-zinc-500">Business User</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {messagesLoading && (
                                <div className="text-center text-zinc-500 text-sm">Loading messages…</div>
                            )}

                            {grouped.map((group) => (
                                <div key={group.date}>
                                    {/* Date separator */}
                                    <div className="flex items-center gap-2 my-3">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-[10px] text-zinc-500 font-medium">{group.date}</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>

                                    <div className="space-y-2">
                                        {group.messages.map((msg) => {
                                            const isAdmin = msg.senderRole === 'ADMIN';
                                            const style = ALERT_STYLES[msg.alertType] ?? ALERT_STYLES.INFO;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[72%] rounded-2xl px-4 py-2.5 border ${
                                                            isAdmin
                                                                ? `${style.bg} ${style.border}`
                                                                : 'bg-white/5 border-white/10'
                                                        }`}
                                                    >
                                                        {isAdmin && (
                                                            <span className={`text-[10px] font-semibold block mb-1 ${style.badge.split(' ')[1]}`}>
                                                                {style.icon}
                                                                {msg.alertType}
                                                            </span>
                                                        )}
                                                        <p className="text-sm text-white leading-relaxed">{msg.body}</p>
                                                        <div className="flex items-center justify-end gap-1.5 mt-1">
                                                            <span className="text-[10px] text-zinc-500">
                                                                {formatTime(msg.createdAt)}
                                                            </span>
                                                            {isAdmin && msg.readAt && (
                                                                <span className="text-[10px] text-purple-400">✓ Read</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Compose */}
                        <div className="px-5 py-4 border-t border-white/10">
                            {/* Alert type selector */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs text-zinc-500 font-medium">Alert type:</span>
                                {(['INFO', 'WARNING', 'URGENT'] as AlertType[]).map((type) => {
                                    const s = ALERT_STYLES[type];
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setAlertType(type)}
                                            className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                                                alertType === type
                                                    ? `${s.bg} ${s.border} ${s.badge.split(' ')[1]}`
                                                    : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'
                                            }`}
                                        >
                                            {s.icon} {type}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex gap-3 items-end">
                                <textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    rows={2}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!messageInput.trim() || sending}
                                    className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <Send size={15} />
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
