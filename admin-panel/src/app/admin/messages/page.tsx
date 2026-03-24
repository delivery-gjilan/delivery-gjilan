'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import {
    GET_DRIVER_MESSAGE_THREADS,
    GET_DRIVER_MESSAGES,
} from '@/graphql/operations/driverMessages/queries';
import {
    SEND_DRIVER_MESSAGE,
    MARK_DRIVER_MESSAGES_READ,
} from '@/graphql/operations/driverMessages/mutations';
import { ADMIN_MESSAGE_RECEIVED } from '@/graphql/operations/driverMessages/subscriptions';
import { DRIVERS_QUERY } from '@/graphql/operations/users/queries';
import { toast } from 'sonner';
import { MessageSquare, Send, AlertTriangle, Info, Zap, Plus, Search, X } from 'lucide-react';

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

interface DriverMessageThread {
    driverId: string;
    driverName: string;
    unreadCount: number;
    lastMessage?: DriverMessage | null;
}

const ALERT_STYLES: Record<AlertType, { badge: string; border: string; bg: string; icon: React.ReactNode }> = {
    INFO: {
        badge: 'bg-blue-500/20 text-blue-300',
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
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
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
}

interface DriverItem {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export default function MessagesPage() {
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [selectedDriverName, setSelectedDriverName] = useState<string>('');
    const [messageInput, setMessageInput] = useState('');
    const [alertType, setAlertType] = useState<AlertType>('INFO');
    const [messages, setMessages] = useState<DriverMessage[]>([]);
    const [showDriverPicker, setShowDriverPicker] = useState(false);
    const [driverSearch, setDriverSearch] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } =
        useQuery<{ driverMessageThreads: DriverMessageThread[] }>(GET_DRIVER_MESSAGE_THREADS, {
            pollInterval: 30000,
        });

    const { data: driversData } = useQuery<{ drivers: DriverItem[] }>(DRIVERS_QUERY);

    const { loading: messagesLoading, refetch: refetchMessages } =
        useQuery<{ driverMessages: DriverMessage[] }>(
            GET_DRIVER_MESSAGES,
            {
                variables: { driverId: selectedDriverId, limit: 100 },
                skip: !selectedDriverId,
                onCompleted: (data) => {
                    setMessages(data.driverMessages ?? []);
                },
            }
        );

    const [sendMessage, { loading: sending }] = useMutation(SEND_DRIVER_MESSAGE, {
        onCompleted: (data) => {
            if (data?.sendDriverMessage) {
                setMessages((prev) => [...prev, data.sendDriverMessage]);
                refetchThreads();
            }
        },
        onError: (err) => toast.error('Failed to send: ' + err.message),
    });

    const [markRead] = useMutation(MARK_DRIVER_MESSAGES_READ);

    useSubscription(ADMIN_MESSAGE_RECEIVED, {
        variables: { driverId: selectedDriverId },
        skip: !selectedDriverId,
        onData: ({ data: subData }) => {
            const msg = subData.data?.adminMessageReceived as DriverMessage | undefined;
            if (!msg) return;
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            refetchThreads();
            if (msg.senderRole === 'DRIVER') {
                toast.info(`${selectedDriverName}: ${msg.body}`);
            }
        },
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark as read when opening thread
    useEffect(() => {
        if (!selectedDriverId) return;
        markRead({ variables: { otherUserId: selectedDriverId } });
    }, [selectedDriverId, markRead]);

    const handleSelectThread = (thread: DriverMessageThread) => {
        setSelectedDriverId(thread.driverId);
        setSelectedDriverName(thread.driverName);
        setMessages([]);
        refetchMessages();
    };

    const handleStartNewConversation = (driver: DriverItem) => {
        const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() || driver.email;
        setSelectedDriverId(driver.id);
        setSelectedDriverName(name);
        setMessages([]);
        setShowDriverPicker(false);
        setDriverSearch('');
        refetchMessages();
    };

    const handleSend = async () => {
        const body = messageInput.trim();
        if (!body || !selectedDriverId) return;
        setMessageInput('');
        await sendMessage({
            variables: { driverId: selectedDriverId, body, alertType },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const threads = threadsData?.driverMessageThreads ?? [];
    const allDrivers = driversData?.drivers ?? [];
    const filteredDrivers = allDrivers.filter((d) => {
        const name = [d.firstName, d.lastName].join(' ').toLowerCase();
        return name.includes(driverSearch.toLowerCase()) || d.email.toLowerCase().includes(driverSearch.toLowerCase());
    });

    // Group messages by date
    type MessageGroup = { date: string; messages: DriverMessage[] };
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
                        <MessageSquare size={16} className="text-indigo-400" />
                        Driver Messages
                    </h2>
                    <button
                        onClick={() => setShowDriverPicker(true)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 transition-colors font-medium"
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
                        <MessageSquare size={32} className="text-zinc-700" />
                        <p>No conversations yet.</p>
                        <button
                            onClick={() => setShowDriverPicker(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                        >
                            Start a new conversation
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {threads.map((thread) => {
                        const isActive = thread.driverId === selectedDriverId;
                        const alertStyle = thread.lastMessage
                            ? ALERT_STYLES[thread.lastMessage.alertType] ?? ALERT_STYLES.INFO
                            : null;
                        return (
                            <button
                                key={thread.driverId}
                                onClick={() => handleSelectThread(thread)}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${isActive ? 'bg-white/10' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-white truncate">
                                        {thread.driverName}
                                    </span>
                                    {thread.unreadCount > 0 && (
                                        <span className="ml-2 flex-shrink-0 text-xs font-bold bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
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

            {/* Driver picker modal */}
            {showDriverPicker && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowDriverPicker(false); setDriverSearch(''); }}>
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-80 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <span className="text-sm font-semibold text-white">Choose a driver</span>
                            <button onClick={() => { setShowDriverPicker(false); setDriverSearch(''); }} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-3 py-2 border-b border-white/10">
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                <Search size={14} className="text-zinc-500 flex-shrink-0" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search drivers…"
                                    value={driverSearch}
                                    onChange={(e) => setDriverSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredDrivers.length === 0 && (
                                <p className="text-center text-zinc-500 text-sm py-6">No drivers found</p>
                            )}
                            {filteredDrivers.map((driver) => {
                                const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() || driver.email;
                                return (
                                    <button
                                        key={driver.id}
                                        onClick={() => handleStartNewConversation(driver)}
                                        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-indigo-300">
                                                {name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{name}</p>
                                            <p className="text-xs text-zinc-500 truncate">{driver.email}</p>
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
                {!selectedDriverId ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        Select a driver to view messages
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-300">
                                    {selectedDriverName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{selectedDriverName}</p>
                                <p className="text-[10px] text-zinc-500">Conversation</p>
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
                                                                <span className="text-[10px] text-indigo-400">✓ Read</span>
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
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!messageInput.trim() || sending}
                                    className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors flex items-center gap-2 text-sm font-medium"
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
