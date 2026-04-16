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
import { Truck, Building2, Send, AlertTriangle, Info, Zap, Plus, Search, X } from 'lucide-react';

import {
    MessageAlertType,
    DriverMessageThreadsQuery,
    DriverMessagesQuery,
    BusinessMessageThreadsQuery,
    BusinessMessagesQuery,
    DriversQuery,
    UsersQuery
} from '@/gql/graphql';

type Tab = 'drivers' | 'businesses';

// ─── Shared types ──────────────────────────────────────────────────────────────

type DriverMessage = NonNullable<DriverMessagesQuery['driverMessages']>[number];
type BusinessMessage = NonNullable<BusinessMessagesQuery['businessMessages']>[number];
type BaseMessage = DriverMessage | BusinessMessage;

type DriverThread = NonNullable<DriverMessageThreadsQuery['driverMessageThreads']>[number];
type BusinessThread = NonNullable<BusinessMessageThreadsQuery['businessMessageThreads']>[number];

type DriverItem = NonNullable<DriversQuery['drivers']>[number];
type UserItem = NonNullable<UsersQuery['users']>[number];
type AlertStyle = {
    badge: string;
    border: string;
    bg: string;
    icon: React.ReactNode;
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

const DRIVER_STYLES = {
    accent: 'indigo',
    [MessageAlertType.Info]: { badge: 'bg-blue-500/20 text-blue-300', border: 'border-blue-500/30', bg: 'bg-blue-500/10', icon: <Info size={12} className="inline mr-1" /> },
    [MessageAlertType.Warning]: { badge: 'bg-amber-500/20 text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: <AlertTriangle size={12} className="inline mr-1" /> },
    [MessageAlertType.Urgent]: { badge: 'bg-red-500/20 text-red-300', border: 'border-red-500/30', bg: 'bg-red-500/10', icon: <Zap size={12} className="inline mr-1" /> },
} as const;

const BIZ_STYLES = {
    accent: 'purple',
    [MessageAlertType.Info]: { badge: 'bg-purple-500/20 text-purple-300', border: 'border-purple-500/30', bg: 'bg-purple-500/10', icon: <Info size={12} className="inline mr-1" /> },
    [MessageAlertType.Warning]: { badge: 'bg-amber-500/20 text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: <AlertTriangle size={12} className="inline mr-1" /> },
    [MessageAlertType.Urgent]: { badge: 'bg-red-500/20 text-red-300', border: 'border-red-500/30', bg: 'bg-red-500/10', icon: <Zap size={12} className="inline mr-1" /> },
} as const;

function alertStyle(tab: Tab, type: MessageAlertType) {
    const styles = tab === 'drivers' ? DRIVER_STYLES : BIZ_STYLES;
    const candidate = styles[type as keyof typeof styles];
    if (
        candidate
        && typeof candidate === 'object'
        && 'badge' in candidate
        && 'border' in candidate
        && 'bg' in candidate
        && 'icon' in candidate
    ) {
        return candidate as AlertStyle;
    }

    return styles[MessageAlertType.Info] as AlertStyle;
}

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

function groupByDate<T extends BaseMessage>(messages: T[]) {
    const grouped: { date: string; messages: T[] }[] = [];
    for (const msg of messages) {
        const date = formatDate(msg.createdAt);
        if (!grouped.length || grouped[grouped.length - 1].date !== date) {
            grouped.push({ date, messages: [msg] });
        } else {
            grouped[grouped.length - 1].messages.push(msg);
        }
    }
    return grouped;
}

// ─── Driver panel ──────────────────────────────────────────────────────────────

function DriverPanel() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedName, setSelectedName] = useState('');
    const [input, setInput] = useState('');
    const [alertType, setAlertType] = useState<MessageAlertType>(MessageAlertType.Info);
    const [messages, setMessages] = useState<DriverMessage[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [search, setSearch] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } =
        useQuery(GET_DRIVER_MESSAGE_THREADS, { pollInterval: 30000 });

    const { data: driversData } = useQuery(DRIVERS_QUERY);

    const { data: qMessagesData, loading: messagesLoading } = useQuery(GET_DRIVER_MESSAGES, {
        variables: { driverId: selectedId || '', limit: 100 },
        skip: !selectedId,
    });

    useEffect(() => {
        const incoming = qMessagesData?.driverMessages ?? [];
        if (incoming.length > 0) {
            setMessages((prev) => {
                const ids = new Set(prev.map((m) => m.id));
                return [...prev, ...incoming.filter((m) => !ids.has(m.id))].sort(
                    (a, b) => new Date(a.createdAt.replace(' ', 'T')).getTime() - new Date(b.createdAt.replace(' ', 'T')).getTime()
                );
            });
        }
    }, [qMessagesData]);

    const [sendMessage, { loading: sending }] = useMutation(SEND_DRIVER_MESSAGE, {
        onCompleted: (d) => {
            if (d?.sendDriverMessage) {
                setMessages((prev) => prev.some((m) => m.id === d.sendDriverMessage?.id) ? prev : [...prev, d.sendDriverMessage as DriverMessage]);
                refetchThreads();
            }
        },
        onError: (err) => toast.error('Failed to send: ' + err.message),
    });

    const [markRead] = useMutation(MARK_DRIVER_MESSAGES_READ);

    useSubscription(ADMIN_MESSAGE_RECEIVED, {
        variables: { driverId: selectedId || '' },
        skip: !selectedId,
        onData: ({ data: sub }) => {
            const msg = sub.data?.adminMessageReceived as DriverMessage | undefined;
            if (!msg) return;
            setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
            refetchThreads();
            if (msg.senderRole === 'DRIVER') toast.info(`${selectedName}: ${msg.body}`);
        },
    });

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { setMessages([]); }, [selectedId]);
    useEffect(() => {
        if (!selectedId) return;
        markRead({ variables: { otherUserId: selectedId } });
    }, [selectedId, markRead]);

    const threads = threadsData?.driverMessageThreads ?? [];
    const allDrivers = driversData?.drivers ?? [];
    const filteredDrivers = allDrivers.filter((d) => {
        const name = [d.firstName, d.lastName].join(' ').toLowerCase();
        return name.includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase());
    });

    const handleSend = async () => {
        const body = input.trim();
        if (!body || !selectedId) return;
        setInput('');
        await sendMessage({ variables: { driverId: selectedId, body, alertType } });
    };

    return (
        <div className="relative flex h-full overflow-hidden">
            {/* Thread list */}
            <div className="w-72 flex-shrink-0 border-r border-white/10 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Truck size={15} className="text-indigo-400" />
                        Driver Conversations
                    </h2>
                    <button onClick={() => setShowPicker(true)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 transition-colors font-medium">
                        <Plus size={13} /> New
                    </button>
                </div>

                {threadsLoading && <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}
                {!threadsLoading && threads.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm px-4 text-center gap-3">
                        <Truck size={32} className="text-zinc-700" />
                        <p>No conversations yet.</p>
                        <button onClick={() => setShowPicker(true)} className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Start a new conversation</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {threads.map((t) => {
                        const isActive = t?.driverId === selectedId;
                        const as = t?.lastMessage ? alertStyle('drivers', t.lastMessage.alertType as MessageAlertType) : null;
                        return (
                            <button key={t?.driverId} onClick={() => { if (t?.driverId) { setSelectedId(t.driverId); setSelectedName(t.driverName); setMessages([]); } }}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${isActive ? 'bg-white/10' : ''}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-medium text-white truncate">{t?.driverName}</span>
                                        <span className="text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 flex-shrink-0">Driver</span>
                                    </div>
                                    {(t?.unreadCount ?? 0) > 0 && <span className="ml-2 flex-shrink-0 text-xs font-bold bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{t?.unreadCount}</span>}
                                </div>
                                {t?.lastMessage && (
                                    <div className="flex items-center gap-1.5">
                                        {as && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${as.badge}`}>{t.lastMessage.alertType}</span>}
                                        <p className="text-xs text-zinc-400 truncate">{t.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}{t.lastMessage.body}</p>
                                    </div>
                                )}
                                {t?.lastMessage && <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(t.lastMessage.createdAt)}</p>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Driver picker modal */}
            {showPicker && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowPicker(false); setSearch(''); }}>
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-80 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <span className="text-sm font-semibold text-white">Choose a driver</span>
                            <button onClick={() => { setShowPicker(false); setSearch(''); }} className="text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
                        </div>
                        <div className="px-3 py-2 border-b border-white/10">
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                <Search size={14} className="text-zinc-500 flex-shrink-0" />
                                <input autoFocus type="text" placeholder="Search drivers…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredDrivers.length === 0 && <p className="text-center text-zinc-500 text-sm py-6">No drivers found</p>}
                            {filteredDrivers.map((d) => {
                                const name = [d.firstName, d.lastName].filter(Boolean).join(' ').trim() || d.email;
                                return (
                                    <button key={d.id} onClick={() => { setSelectedId(d.id); setSelectedName(name); setShowPicker(false); setSearch(''); }}
                                        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-indigo-300">{name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{name}</p>
                                            <p className="text-xs text-zinc-500 truncate">{d.email}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Chat view */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedId ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Select a driver to view messages</div>
                ) : (
                    <>
                        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-300">{selectedName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{selectedName}</p>
                                <p className="text-[10px] text-zinc-500">Driver</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {messagesLoading && <div className="text-center text-zinc-500 text-sm">Loading messages…</div>}
                            {groupByDate(messages).map((group) => (
                                <div key={group.date}>
                                    <div className="flex items-center gap-2 my-3">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-[10px] text-zinc-500 font-medium">{group.date}</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        {group.messages.map((msg) => {
                                            const isAdmin = msg.senderRole === 'ADMIN';
                                            const s = DRIVER_STYLES[msg.alertType] ?? DRIVER_STYLES.INFO;
                                            return (
                                                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 border ${isAdmin ? `${s.bg} ${s.border}` : 'bg-white/5 border-white/10'}`}>
                                                        {isAdmin && <span className={`text-[10px] font-semibold block mb-1 ${s.badge.split(' ')[1]}`}>{s.icon}{msg.alertType}</span>}
                                                        <p className="text-sm text-white leading-relaxed">{msg.body}</p>
                                                        <div className="flex items-center justify-end gap-1.5 mt-1">
                                                            <span className="text-[10px] text-zinc-500">{formatTime(msg.createdAt)}</span>
                                                            {isAdmin && msg.readAt && <span className="text-[10px] text-indigo-400">✓ Read</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        <div className="px-5 py-4 border-t border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs text-zinc-500 font-medium">Alert type:</span>
                                {[MessageAlertType.Info, MessageAlertType.Warning, MessageAlertType.Urgent].map((type) => {
                                    const s = alertStyle('drivers', type);
                                    return (
                                        <button key={type} onClick={() => setAlertType(type)}
                                            className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${alertType === type ? `${s.bg} ${s.border} ${s.badge.split(' ')[1]}` : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'}`}>
                                            {s.icon} {type}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-3 items-end">
                                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    rows={2} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors" />
                                <button onClick={handleSend} disabled={!input.trim() || sending}
                                    className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors flex items-center gap-2 text-sm font-medium">
                                    <Send size={15} /> Send
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Business panel ────────────────────────────────────────────────────────────

function BusinessPanel() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedName, setSelectedName] = useState('');
    const [input, setInput] = useState('');
    const [alertType, setAlertType] = useState<MessageAlertType>(MessageAlertType.Info);
    const [messages, setMessages] = useState<BusinessMessage[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [search, setSearch] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } =
        useQuery(GET_BUSINESS_MESSAGE_THREADS, { pollInterval: 30000 });

    const { data: usersData } = useQuery(USERS_QUERY);

    const { data: qMessagesData, loading: messagesLoading } = useQuery(GET_BUSINESS_MESSAGES, {
        variables: { businessUserId: selectedId || '', limit: 100 },
        skip: !selectedId,
    });

    useEffect(() => {
        const incoming = qMessagesData?.businessMessages ?? [];
        if (incoming.length > 0) {
            setMessages((prev) => {
                const ids = new Set(prev.map((m) => m.id));
                return [...prev, ...incoming.filter((m) => !ids.has(m.id))].sort(
                    (a, b) => new Date(a.createdAt.replace(' ', 'T')).getTime() - new Date(b.createdAt.replace(' ', 'T')).getTime()
                );
            });
        }
    }, [qMessagesData]);

    const [sendMessage, { loading: sending }] = useMutation(SEND_BUSINESS_MESSAGE, {
        onCompleted: (d) => {
            if (d?.sendBusinessMessage) {
                setMessages((prev) => prev.some((m) => m.id === d.sendBusinessMessage?.id) ? prev : [...prev, d.sendBusinessMessage as BusinessMessage]);
                refetchThreads();
            }
        },
        onError: (err) => toast.error('Failed to send: ' + err.message),
    });

    const [markRead] = useMutation(MARK_BUSINESS_MESSAGES_READ);

    useSubscription(ADMIN_BUSINESS_MESSAGE_RECEIVED, {
        variables: { businessUserId: selectedId || '' },
        skip: !selectedId,
        onData: ({ data: sub }) => {
            const msg = sub.data?.adminBusinessMessageReceived as BusinessMessage | undefined;
            if (!msg) return;
            setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
            refetchThreads();
            if (msg.senderRole === 'BUSINESS') toast.info(`${selectedName}: ${msg.body}`);
        },
    });

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { setMessages([]); }, [selectedId]);
    useEffect(() => {
        if (!selectedId) return;
        markRead({ variables: { otherUserId: selectedId } });
    }, [selectedId, markRead]);

    const threads = threadsData?.businessMessageThreads ?? [];
    const allUsers = (usersData?.users ?? []).filter((u) => u.role === 'BUSINESS_OWNER' || u.role === 'BUSINESS_EMPLOYEE');
    const filteredUsers = allUsers.filter((u) => {
        const name = [u.firstName, u.lastName].join(' ').toLowerCase();
        return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.business?.name ?? '').toLowerCase().includes(search.toLowerCase());
    });

    const handleSend = async () => {
        const body = input.trim();
        if (!body || !selectedId) return;
        setInput('');
        await sendMessage({ variables: { businessUserId: selectedId, body, alertType } });
    };

    return (
        <div className="relative flex h-full overflow-hidden">
            {/* Thread list */}
            <div className="w-72 flex-shrink-0 border-r border-white/10 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Building2 size={15} className="text-purple-400" />
                        Business Conversations
                    </h2>
                    <button onClick={() => setShowPicker(true)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg px-2.5 py-1.5 transition-colors font-medium">
                        <Plus size={13} /> New
                    </button>
                </div>

                {threadsLoading && <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}
                {!threadsLoading && threads.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm px-4 text-center gap-3">
                        <Building2 size={32} className="text-zinc-700" />
                        <p>No conversations yet.</p>
                        <button onClick={() => setShowPicker(true)} className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2">Start a new conversation</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {threads.map((t) => {
                        const isActive = t?.businessUserId === selectedId;
                        const as = t?.lastMessage ? alertStyle('businesses', t.lastMessage.alertType as MessageAlertType) : null;
                        return (
                            <button key={t?.businessUserId} onClick={() => { if (t?.businessUserId) { setSelectedId(t.businessUserId); setSelectedName(t.businessUserName); setMessages([]); } }}
                                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${isActive ? 'bg-white/10' : ''}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-medium text-white truncate">{t?.businessUserName}</span>
                                        <span className="text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 flex-shrink-0">Business</span>
                                    </div>
                                    {(t?.unreadCount ?? 0) > 0 && <span className="ml-2 flex-shrink-0 text-xs font-bold bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{t?.unreadCount}</span>}
                                </div>
                                {t?.lastMessage && (
                                    <div className="flex items-center gap-1.5">
                                        {as && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${as.badge}`}>{t.lastMessage.alertType}</span>}
                                        <p className="text-xs text-zinc-400 truncate">{t.lastMessage.senderRole === 'ADMIN' ? 'You: ' : ''}{t.lastMessage.body}</p>
                                    </div>
                                )}
                                {t?.lastMessage && <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(t.lastMessage.createdAt)}</p>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Business user picker modal */}
            {showPicker && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowPicker(false); setSearch(''); }}>
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-purple-400" />
                                <span className="text-base font-semibold text-white">Choose a business user</span>
                            </div>
                            <button onClick={() => { setShowPicker(false); setSearch(''); }} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"><X size={18} /></button>
                        </div>
                        <div className="px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5">
                                <Search size={16} className="text-zinc-500 flex-shrink-0" />
                                <input autoFocus type="text" placeholder="Search by name, email, or business…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                            {filteredUsers.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <Building2 size={28} className="text-zinc-700" />
                                    <p className="text-center text-zinc-500 text-sm">No business users found</p>
                                </div>
                            )}
                            {filteredUsers.map((u) => {
                                const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
                                return (
                                    <button key={u.id} onClick={() => { setSelectedId(u.id); setSelectedName(name); setShowPicker(false); setSearch(''); }}
                                        className="w-full text-left flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-bold text-purple-300">{name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-white truncate">{name}</p>
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">{u.business?.name ? `${u.business.name} · ` : ''}{u.email}</p>
                                        </div>
                                        {u.business?.name && (
                                            <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-2.5 py-1 flex-shrink-0">{u.business.name}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Chat view */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedId ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Select a business user to view messages</div>
                ) : (
                    <>
                        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-purple-300">{selectedName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{selectedName}</p>
                                <p className="text-[10px] text-zinc-500">Business User</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {messagesLoading && <div className="text-center text-zinc-500 text-sm">Loading messages…</div>}
                            {groupByDate(messages).map((group) => (
                                <div key={group.date}>
                                    <div className="flex items-center gap-2 my-3">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-[10px] text-zinc-500 font-medium">{group.date}</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        {group.messages.map((msg) => {
                                            const isAdmin = msg.senderRole === 'ADMIN';
                                            const s = BIZ_STYLES[msg.alertType] ?? BIZ_STYLES.INFO;
                                            return (
                                                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 border ${isAdmin ? `${s.bg} ${s.border}` : 'bg-white/5 border-white/10'}`}>
                                                        {isAdmin && <span className={`text-[10px] font-semibold block mb-1 ${s.badge.split(' ')[1]}`}>{s.icon}{msg.alertType}</span>}
                                                        <p className="text-sm text-white leading-relaxed">{msg.body}</p>
                                                        <div className="flex items-center justify-end gap-1.5 mt-1">
                                                            <span className="text-[10px] text-zinc-500">{formatTime(msg.createdAt)}</span>
                                                            {isAdmin && msg.readAt && <span className="text-[10px] text-purple-400">✓ Read</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        <div className="px-5 py-4 border-t border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs text-zinc-500 font-medium">Alert type:</span>
                                {[MessageAlertType.Info, MessageAlertType.Warning, MessageAlertType.Urgent].map((type) => {
                                    const s = alertStyle('businesses', type);
                                    return (
                                        <button key={type} onClick={() => setAlertType(type)}
                                            className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${alertType === type ? `${s.bg} ${s.border} ${s.badge.split(' ')[1]}` : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'}`}>
                                            {s.icon} {type}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-3 items-end">
                                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    rows={2} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50 transition-colors" />
                                <button onClick={handleSend} disabled={!input.trim() || sending}
                                    className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors flex items-center gap-2 text-sm font-medium">
                                    <Send size={15} /> Send
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
    const [tab, setTab] = useState<Tab>('drivers');

    return (
        <div className="flex flex-col h-full gap-0">
            {/* Tab bar */}
            <div className="flex-shrink-0 flex border-b border-white/10 mb-0">
                <button
                    onClick={() => setTab('drivers')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'drivers' ? 'text-indigo-400 border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                >
                    <Truck size={15} />
                    Drivers
                </button>
                <button
                    onClick={() => setTab('businesses')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'businesses' ? 'text-purple-400 border-purple-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                >
                    <Building2 size={15} />
                    Businesses
                </button>
            </div>

            {/* Panel */}
            <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#111113]">
                {tab === 'drivers' ? <DriverPanel /> : <BusinessPanel />}
            </div>
        </div>
    );
}
