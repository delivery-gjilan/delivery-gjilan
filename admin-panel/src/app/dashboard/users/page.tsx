"use client";

import { useState, FormEvent, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { USERS_QUERY, USER_BEHAVIOR_QUERY } from "@/graphql/operations/users/queries";
import { UserRole } from "@/gql/graphql";
import {
    CREATE_USER_MUTATION,
    UPDATE_USER_MUTATION,
    DELETE_USER_MUTATION,
    UPDATE_USER_NOTE_MUTATION,
    BAN_USER_MUTATION,
} from "@/graphql/operations/users/mutations";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import {
    Pencil, Trash2, AlertCircle, ShieldBan, ShieldCheck, BadgeCheck,
    Search, X, Plus, User, Phone, Mail, MapPin, MessageSquare,
    ChevronRight, Clock, Package, CircleDollarSign, ChevronLeft, BarChart3, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

interface UserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isDemoAccount?: boolean;
    isBanned?: boolean;
    isTrustedCustomer?: boolean;
    role: string;
    phoneNumber?: string | null;
    address?: string | null;
    adminNote?: string | null;
    flagColor?: string | null;
    business?: { id: string; name: string } | null;
    totalOrders?: number;
    signupStep?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    createdAt?: string;
}

interface UsersResponse {
    users: UserItem[];
}

interface CreateUserResponse {
    createUser: {
        token: string;
        user: UserItem;
        message: string;
    };
}

interface OrderBusinessItem {
    business: {
        id: string;
        name: string;
        businessType?: string;
        phoneNumber?: string | null;
    };
    items: Array<{
        productId: string;
        name: string;
        imageUrl?: string | null;
        quantity: number;
        price: number;
    }>;
}

interface OrderItem {
    id: string;
    orderPrice: number;
    deliveryPrice: number;
    orderDate: string;
    updatedAt: string;
    status: string;
    totalPrice: number;
    dropOffLocation: { address: string };
    businesses: OrderBusinessItem[];
    user?: { id: string };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

interface OrdersResponse {
    orders: {
        orders: OrderItem[];
        totalCount: number;
        hasMore: boolean;
    };
}

interface UserBehaviorItem {
    userId: string;
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    firstOrderAt?: string | null;
    lastOrderAt?: string | null;
    lastDeliveredAt?: string | null;
}

interface UserBehaviorResponse {
    userBehavior: UserBehaviorItem | null;
}

/* ---------------------------------------------------------
   Flag colour system
--------------------------------------------------------- */

type FlagColor = "none" | "green" | "yellow" | "orange" | "red";

const FLAG_COLORS: {
    value: FlagColor;
    label: string;
    description: string;
    dot: string;
    bg: string;
    border: string;
    text: string;
    ring: string;
}[] = [
    { value: "none",   label: "No flag",  description: "Remove flag",                dot: "bg-zinc-600",    bg: "",                  border: "border-zinc-700",       text: "text-zinc-400",    ring: "ring-zinc-600"    },
    { value: "green",  label: "Trusted",  description: "Verified, skip approval",    dot: "bg-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", ring: "ring-emerald-500" },
    { value: "yellow", label: "Watch",    description: "Minor concern",              dot: "bg-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   ring: "ring-amber-400"   },
    { value: "orange", label: "Warning",  description: "Repeated issues",            dot: "bg-orange-500",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-400",  ring: "ring-orange-500"  },
    { value: "red",    label: "Critical", description: "Serious ï¿½ consider banning", dot: "bg-red-500",     bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     ring: "ring-red-500"     },
];

const FLAG_MAP = Object.fromEntries(FLAG_COLORS.map((f) => [f.value, f])) as Record<FlagColor, (typeof FLAG_COLORS)[number]>;
const getFlag = (c?: string | null) => FLAG_MAP[(c as FlagColor) || "none"] ?? FLAG_MAP.none;

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function initials(first: string, last: string) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatDate(v?: string | null) {
    if (!v) return "ï¿½";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "ï¿½" : d.toLocaleString();
}

function formatCurrency(v?: number | null) {
    if (v == null) return "ï¿½";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v);
}

function formatDuration(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return "0m";
    const total = Math.floor(ms / 60000);
    const d = Math.floor(total / 1440);
    const h = Math.floor((total % 1440) / 60);
    const m = total % 60;
    const p: string[] = [];
    if (d) p.push(`${d}d`);
    if (h) p.push(`${h}h`);
    if (m || !p.length) p.push(`${m}m`);
    return p.join(" ");
}

function orderDuration(o: OrderItem) {
    const s = new Date(o.orderDate).getTime();
    if (Number.isNaN(s)) return "ï¿½";
    const e = o.status === "DELIVERED" ? new Date(o.updatedAt).getTime() : Date.now();
    if (Number.isNaN(e)) return "ï¿½";
    return formatDuration(Math.max(0, e - s));
}

function statusColor(s: string) {
    switch (s) {
        case "DELIVERED":        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
        case "CANCELLED":        return "bg-red-500/10 text-red-400 border-red-500/30";
        case "OUT_FOR_DELIVERY": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
        case "READY":            return "bg-amber-500/10 text-amber-400 border-amber-500/30";
        default:                 return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
    }
}

/* ---------------------------------------------------------
   Component
--------------------------------------------------------- */

export default function UsersPage() {
    const { admin } = useAuth();
    const isSuperAdmin = admin?.role === "SUPER_ADMIN";

    /* --- data --- */
    const { data, loading, error, refetch } = useQuery(USERS_QUERY);

    const [createUser, { loading: creating }] = useMutation<CreateUserResponse>(CREATE_USER_MUTATION, { onCompleted: () => refetch() });
    const [updateUser, { loading: updating }] = useMutation(UPDATE_USER_MUTATION, { onCompleted: () => refetch() });
    const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER_MUTATION, { onCompleted: () => refetch() });
    const [updateUserNote] = useMutation(UPDATE_USER_NOTE_MUTATION, { onCompleted: () => refetch() });
    const [banUser, { loading: banning }] = useMutation(BAN_USER_MUTATION, { onCompleted: () => refetch() });

    /* --- panel state --- */
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [panelTab, setPanelTab] = useState<"overview" | "orders">("overview");
    const [mainView, setMainView] = useState<"list" | "statistics">("list");

    /* --- statistics filters --- */
    const [statDateRange, setStatDateRange] = useState<"7d" | "30d" | "90d" | "all">("7d");
    const [statUserFilter, setStatUserFilter] = useState<"all" | "new-only" | "with-orders" | "without-orders">("all");

    /* --- flag/note editing --- */
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteInput, setNoteInput] = useState("");
    const [selectedFlag, setSelectedFlag] = useState<FlagColor>("none");

    /* --- modals --- */
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
    const [userToBan, setUserToBan] = useState<UserItem | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

    /* --- search, debounce & pagination --- */
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;
    const [formData, setFormData] = useState({
        email: "", password: "", firstName: "", lastName: "", role: "CUSTOMER", businessId: "", isDemoAccount: false,
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    /* --- derived: selected user from live data --- */
    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;
        return data?.users?.find((u) => u.id === selectedUserId) || null;
    }, [data?.users, selectedUserId]);

    /* --- lazy queries for panel --- */
    const { data: ordersData, loading: ordersLoading, error: ordersError } = useQuery<OrdersResponse>(GET_ORDERS, {
        skip: !selectedUser || panelTab !== "orders",
    });

    const { data: behaviorData, loading: behaviorLoading, error: behaviorError } = useQuery<UserBehaviorResponse>(
        USER_BEHAVIOR_QUERY,
        {
            variables: { userId: selectedUser?.id || "" },
            skip: !selectedUser || panelTab !== "orders" || !isSuperAdmin,
        },
    );

    /* --- debounce effect --- */
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
            setCurrentPage(1);
        }, 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchTerm]);

    /* --- derived: filtered users & orders --- */
    const filteredUsers = useMemo(() => {
        const customers = data?.users?.filter((u) => u.role === "CUSTOMER") || [];
        if (!debouncedSearch) return customers;
        return customers.filter((u) => {
            const name = `${u.firstName} ${u.lastName}`.toLowerCase();
            return name.includes(debouncedSearch) || u.email.toLowerCase().includes(debouncedSearch) || (u.phoneNumber || "").toLowerCase().includes(debouncedSearch);
        });
    }, [data?.users, debouncedSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const pagedUsers = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, currentPage]);

    const userOrders = useMemo(() => {
        if (!selectedUser) return [];
        return (ordersData?.orders?.orders || [])
            .filter((o) => o.user?.id === selectedUser.id)
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [ordersData?.orders, selectedUser]);

    /* --- statistics calculations --- */
    const getDateRangeStart = useCallback(() => {
        const now = new Date();
        switch (statDateRange) {
            case "7d":
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case "30d":
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case "90d":
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case "all":
                return new Date(0);
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    }, [statDateRange]);

    const statisticsData = useMemo(() => {
        const customers = data?.users?.filter((u) => u.role === "CUSTOMER") || [];
        const rangeStart = getDateRangeStart();
        
        const newUsers = customers.filter(u => {
            if (!u.createdAt) return false;
            const signupDate = new Date(u.createdAt);
            return signupDate >= rangeStart;
        });

        const usersWithOrders = newUsers.filter(u => (u.totalOrders || 0) > 0);
        const usersWithoutOrders = newUsers.filter(u => (u.totalOrders || 0) === 0);
        const completedSignups = newUsers.filter(u => u.signupStep === "COMPLETED");
        const pendingSignups = newUsers.filter(u => u.signupStep !== "COMPLETED");

        // Group new users by day for chart
        const usersByDay: Record<string, number> = {};
        newUsers.forEach(u => {
            if (u.createdAt) {
                const date = new Date(u.createdAt).toLocaleDateString();
                usersByDay[date] = (usersByDay[date] || 0) + 1;
            }
        });

        const chartData = Object.entries(usersByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, count]) => ({ date, count }));

        // Apply user status filter
        let filteredNewUsers = newUsers;
        if (statUserFilter === "new-only") {
            filteredNewUsers = newUsers;
        } else if (statUserFilter === "with-orders") {
            filteredNewUsers = usersWithOrders;
        } else if (statUserFilter === "without-orders") {
            filteredNewUsers = usersWithoutOrders;
        }

        return {
            totalNewUsers: newUsers.length,
            usersWithOrders: usersWithOrders.length,
            usersWithoutOrders: usersWithoutOrders.length,
            completedSignups: completedSignups.length,
            pendingSignups: pendingSignups.length,
            chartData,
            filteredNewUsers: filteredNewUsers.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            }),
        };
    }, [data?.users, statDateRange, statUserFilter, getDateRangeStart]);

    /* --- handlers --- */

    const selectUser = useCallback((u: UserItem) => {
        setSelectedUserId(u.id);
        setPanelTab("overview");
        setIsEditingNote(false);
    }, []);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const closePanel = useCallback(() => {
        setSelectedUserId(null);
        setIsEditingNote(false);
    }, []);

    const startEditNote = useCallback(() => {
        if (!selectedUser) return;
        setNoteInput(selectedUser.adminNote || "");
        setSelectedFlag((selectedUser.flagColor as FlagColor) || "none");
        setIsEditingNote(true);
    }, [selectedUser]);

    const cancelEditNote = useCallback(() => setIsEditingNote(false), []);

    const saveNote = useCallback(async () => {
        if (!selectedUser) return;
        const note = noteInput.trim() || null;
        const color = note ? selectedFlag : null;
        try {
            await updateUserNote({ variables: { userId: selectedUser.id, note, flagColor: color } });
            setIsEditingNote(false);
            toast.success("Note updated");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save note");
        }
    }, [selectedUser, noteInput, selectedFlag, updateUserNote]);

    const openCreateModal = useCallback(() => {
        setEditingUser(null);
        setFormData({ email: "", password: "", firstName: "", lastName: "", role: "CUSTOMER", businessId: "", isDemoAccount: false });
        setFormError("");
        setFormSuccess("");
        setShowCreateModal(true);
    }, []);

    const openEditModal = useCallback((u: UserItem) => {
        setEditingUser(u);
        setFormData({
            email: u.email, password: "", firstName: u.firstName, lastName: u.lastName,
            role: u.role, businessId: u.business?.id || "", isDemoAccount: Boolean(u.isDemoAccount),
        });
        setFormError("");
        setFormSuccess("");
        setShowCreateModal(true);
    }, []);

    const closeCreateModal = useCallback(() => {
        setShowCreateModal(false);
        setEditingUser(null);
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");
        try {
            if (editingUser) {
                await updateUser({
                    variables: {
                        id: editingUser.id, firstName: formData.firstName, lastName: formData.lastName,
                        role: formData.role as UserRole, businessId: formData.businessId || null, isDemoAccount: formData.isDemoAccount,
                    },
                });
                setFormSuccess("Updated");
                setTimeout(closeCreateModal, 800);
            } else {
                const { data: created } = await createUser({
                    variables: {
                        email: formData.email, password: formData.password, firstName: formData.firstName,
                        lastName: formData.lastName, role: formData.role, businessId: formData.businessId || null,
                        isDemoAccount: formData.isDemoAccount,
                    },
                });
                if (created?.createUser) {
                    setFormSuccess(created.createUser.message || "Created");
                    closeCreateModal();
                }
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed");
        }
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser({ variables: { id: userToDelete.id } });
            toast.success("User deleted");
            setShowDeleteModal(false);
            setUserToDelete(null);
            if (selectedUserId === userToDelete.id) closePanel();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const confirmBan = async () => {
        if (!userToBan) return;
        const ban = !userToBan.isBanned;
        try {
            await banUser({ variables: { userId: userToBan.id, banned: ban } });
            toast.success(ban ? "User banned" : "User unbanned");
            setShowBanModal(false);
            setUserToBan(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="text-white">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Customers</h1>
                    <p className="text-zinc-500 text-sm mt-0.5">Manage customer accounts, flags, notes &amp; history.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search name, email, phoneï¿½"
                            className="w-64 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {isSuperAdmin && (
                        <Button onClick={openCreateModal}>
                            <Plus size={15} />
                            New Customer
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm mb-4">{error.message}</div>
            )}

            {/* View tabs */}
            <div className="flex gap-3 mb-5 border-b border-zinc-800/40">
                <button
                    onClick={() => setMainView("list")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                        mainView === "list"
                            ? "text-violet-400 border-b-2 border-violet-400 -mb-0.5"
                            : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <User size={14} />
                        User List
                    </div>
                </button>
                <button
                    onClick={() => setMainView("statistics")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                        mainView === "statistics"
                            ? "text-violet-400 border-b-2 border-violet-400 -mb-0.5"
                            : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart3 size={14} />
                        Signup Statistics
                    </div>
                </button>
            </div>

            {/* Main layout: list + detail panel OR statistics */}
            {mainView === "list" ? (
            <div className="flex gap-0 min-h-[calc(100vh-240px)]">

                {/* ---- User list ---- */}
                <div className={`transition-all duration-200 ${selectedUser ? "w-[380px] flex-shrink-0" : "w-full"}`}>
                    <div className={`bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden ${selectedUser ? "rounded-r-none border-r-0" : ""}`}>
                        {loading ? (
                            <div className="p-8 text-center text-zinc-500">Loading…</div>
                        ) : !filteredUsers.length ? (
                            <div className="p-8 text-center text-zinc-500">No customers found.</div>
                        ) : (
                            <div className="divide-y divide-zinc-800/60 max-h-[calc(100vh-268px)] overflow-y-auto">
                                {pagedUsers.map((u) => {
                                    const flag = getFlag(u.flagColor);
                                    const isActive = selectedUser?.id === u.id;
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => selectUser(u)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                isActive
                                                    ? "bg-violet-500/10 border-l-2 border-l-violet-500"
                                                    : u.isBanned
                                                        ? "bg-red-500/5 hover:bg-zinc-800/60 border-l-2 border-l-transparent"
                                                        : "hover:bg-zinc-800/60 border-l-2 border-l-transparent"
                                            }`}
                                        >
                                            {/* Avatar */}
                                            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                u.flagColor && u.flagColor !== "none"
                                                    ? `${flag.bg} ${flag.text} ring-2 ${flag.ring}`
                                                    : "bg-zinc-800 text-zinc-300"
                                            }`}>
                                                {initials(u.firstName, u.lastName)}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-zinc-100 truncate">
                                                        {u.firstName} {u.lastName}
                                                    </span>
                                                    {u.isBanned && <ShieldBan size={13} className="text-red-400 flex-shrink-0" />}
                                                    {u.isTrustedCustomer && !u.isBanned && <BadgeCheck size={13} className="text-emerald-400 flex-shrink-0" />}
                                                    {u.isDemoAccount && (
                                                        <span className="text-[10px] font-medium bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded">DEMO</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-500 truncate">{u.email}</div>
                                            </div>

                                            {/* Flag dot */}
                                            {u.flagColor && u.flagColor !== "none" && (
                                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${flag.dot}`} title={flag.label} />
                                            )}

                                            {!selectedUser && <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/60">
                            <span className="text-xs text-zinc-500">
                                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-xs text-zinc-400 px-2">{currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ---- Detail panel ---- */}
                {selectedUser && (
                    <div className="flex-1 bg-zinc-900/40 border border-zinc-800 border-l-zinc-800 rounded-xl rounded-l-none overflow-hidden flex flex-col min-w-0">
                        {/* Panel header */}
                        <div className="flex items-start justify-between p-5 pb-4 border-b border-zinc-800/60">
                            <div className="flex items-center gap-4">
                                {(() => {
                                    const flag = getFlag(selectedUser.flagColor);
                                    return (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${
                                            selectedUser.flagColor && selectedUser.flagColor !== "none"
                                                ? `${flag.bg} ${flag.text} ring-2 ${flag.ring}`
                                                : "bg-zinc-800 text-zinc-200"
                                        }`}>
                                            {initials(selectedUser.firstName, selectedUser.lastName)}
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-100">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1"><Mail size={12} />{selectedUser.email}</span>
                                        {selectedUser.phoneNumber && (
                                            <span className="flex items-center gap-1"><Phone size={12} />{selectedUser.phoneNumber}</span>
                                        )}
                                    </div>
                                    {selectedUser.address && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                                            <MapPin size={12} />{selectedUser.address}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={closePanel} className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800/60">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Status + actions bar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/30">
                            <div className="flex items-center gap-2">
                                {selectedUser.isBanned && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                                        <ShieldBan size={12} /> Banned
                                    </span>
                                )}
                                {selectedUser.isTrustedCustomer && !selectedUser.isBanned && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                                        <BadgeCheck size={12} /> Trusted
                                    </span>
                                )}
                                {selectedUser.isDemoAccount && (
                                    <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">Demo</span>
                                )}
                                {!selectedUser.isBanned && !selectedUser.isTrustedCustomer && !selectedUser.isDemoAccount && (
                                    <span className="text-xs text-zinc-500">Active customer</span>
                                )}
                            </div>
                            {isSuperAdmin && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => openEditModal(selectedUser)}>
                                        <Pencil size={13} /> Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setUserToBan(selectedUser); setShowBanModal(true); }}
                                        className={selectedUser.isBanned ? "text-emerald-400 hover:text-emerald-300" : "text-red-400 hover:text-red-300"}
                                    >
                                        {selectedUser.isBanned ? <><ShieldCheck size={13} /> Unban</> : <><ShieldBan size={13} /> Ban</>}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setUserToDelete(selectedUser); setShowDeleteModal(true); }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={13} />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Tab bar */}
                        <div className="flex border-b border-zinc-800/40">
                            {(["overview", "orders"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setPanelTab(tab)}
                                    className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                                        panelTab === tab
                                            ? "text-violet-400 border-b-2 border-violet-400"
                                            : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    {tab === "overview" ? "Overview" : "Orders & Stats"}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {panelTab === "overview" && (
                                <>
                                    {/* Flag & Notes card */}
                                    <div className={`rounded-lg border p-4 ${
                                        selectedUser.flagColor && selectedUser.flagColor !== "none"
                                            ? `${getFlag(selectedUser.flagColor).bg} ${getFlag(selectedUser.flagColor).border}`
                                            : "border-zinc-800 bg-zinc-900/60"
                                    }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                                <MessageSquare size={14} /> Flag &amp; Notes
                                            </h3>
                                            {!isEditingNote && (
                                                <Button size="sm" variant="ghost" onClick={startEditNote}>
                                                    <Pencil size={12} /> {selectedUser.adminNote ? "Edit" : "Add"}
                                                </Button>
                                            )}
                                        </div>

                                        {isEditingNote ? (
                                            <div className="space-y-3">
                                                {/* Color picker */}
                                                <div>
                                                    <label className="text-xs text-zinc-400 mb-2 block">Flag Level</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {FLAG_COLORS.map((fc) => (
                                                            <button
                                                                key={fc.value}
                                                                onClick={() => setSelectedFlag(fc.value)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                                                    selectedFlag === fc.value
                                                                        ? `${fc.border} ${fc.bg} ring-1 ${fc.ring}`
                                                                        : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/40"
                                                                }`}
                                                                title={fc.description}
                                                            >
                                                                <div className={`w-3 h-3 rounded-full ${fc.dot}`} />
                                                                <span className={`text-xs font-medium ${selectedFlag === fc.value ? fc.text : "text-zinc-400"}`}>
                                                                    {fc.label}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Note textarea */}
                                                <div>
                                                    <label className="text-xs text-zinc-400 mb-2 block">Note</label>
                                                    <textarea
                                                        value={noteInput}
                                                        onChange={(e) => setNoteInput(e.target.value)}
                                                        placeholder="Add a note about this customerï¿½"
                                                        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 min-h-[100px] resize-y"
                                                        rows={4}
                                                    />
                                                    {!noteInput.trim() && selectedFlag !== "none" && (
                                                        <p className="text-xs text-zinc-500 mt-1">A flag without a note will be removed on save.</p>
                                                    )}
                                                </div>

                                                {/* Save / Cancel */}
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={cancelEditNote}>Cancel</Button>
                                                    <Button size="sm" onClick={saveNote}>
                                                        {noteInput.trim() ? "Save Flag & Note" : "Remove Flag"}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : selectedUser.adminNote ? (
                                            <div className="flex items-start gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${getFlag(selectedUser.flagColor).dot}`} />
                                                <div>
                                                    <span className={`text-xs font-semibold ${getFlag(selectedUser.flagColor).text}`}>
                                                        {getFlag(selectedUser.flagColor).label}
                                                    </span>
                                                    <p className="text-sm text-zinc-300 mt-1">{selectedUser.adminNote}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-500">No flag or note set for this customer.</p>
                                        )}
                                    </div>

                                    {/* Customer info card */}
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                                        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                                            <User size={14} /> Customer Info
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-zinc-500">Email</span>
                                                <div className="text-zinc-200 mt-0.5">{selectedUser.email}</div>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500">Phone</span>
                                                <div className="text-zinc-200 mt-0.5">{selectedUser.phoneNumber || "ï¿½"}</div>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500">Address</span>
                                                <div className="text-zinc-200 mt-0.5">{selectedUser.address || "ï¿½"}</div>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500">User ID</span>
                                                <div className="text-zinc-200 mt-0.5 font-mono text-xs">{selectedUser.id}</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {panelTab === "orders" && (
                                <>
                                    {/* Behavior summary */}
                                    {isSuperAdmin && (
                                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                                            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                                                <CircleDollarSign size={14} /> Behavior Summary
                                            </h3>
                                            {behaviorError && <p className="text-sm text-red-300">{behaviorError.message}</p>}
                                            {behaviorLoading ? (
                                                <p className="text-sm text-zinc-500">Loadingï¿½</p>
                                            ) : behaviorData?.userBehavior ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { label: "Total Orders", value: behaviorData.userBehavior.totalOrders },
                                                        { label: "Delivered", value: behaviorData.userBehavior.deliveredOrders },
                                                        { label: "Cancelled", value: behaviorData.userBehavior.cancelledOrders },
                                                        { label: "Total Spend", value: formatCurrency(behaviorData.userBehavior.totalSpend) },
                                                        { label: "Avg Order", value: formatCurrency(behaviorData.userBehavior.avgOrderValue) },
                                                        { label: "Last Delivered", value: formatDate(behaviorData.userBehavior.lastDeliveredAt) },
                                                    ].map((s) => (
                                                        <div key={s.label} className="bg-zinc-800/50 rounded-lg p-3">
                                                            <div className="text-xs text-zinc-500">{s.label}</div>
                                                            <div className="text-sm text-zinc-100 font-semibold mt-0.5">{s.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-zinc-500">No behavior data yet.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Orders list */}
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                                <Package size={14} /> Orders ({userOrders.length})
                                            </h3>
                                        </div>
                                        {ordersError && <p className="p-4 text-sm text-red-300">{ordersError.message}</p>}
                                        {ordersLoading ? (
                                            <p className="p-4 text-sm text-zinc-500">Loading ordersï¿½</p>
                                        ) : userOrders.length ? (
                                            <div className="divide-y divide-zinc-800/40 max-h-[400px] overflow-y-auto">
                                                {userOrders.map((order) => (
                                                    <button
                                                        key={order.id}
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors text-left"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${statusColor(order.status)}`}>
                                                                    {order.status}
                                                                </span>
                                                                <span className="text-sm text-zinc-100 font-medium">{formatCurrency(order.totalPrice)}</span>
                                                            </div>
                                                            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                                                                <span className="flex items-center gap-1"><Clock size={11} />{formatDate(order.orderDate)}</span>
                                                                <span>{order.businesses.map((b) => b.business.name).join(", ")}</span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="p-4 text-sm text-zinc-500">No orders found.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            ) : (
            /* --- Statistics View --- */
            <div className="space-y-5">
                {/* Filters */}
                <div className="flex gap-4 items-center flex-wrap">
                    <div>
                        <label className="text-xs text-zinc-500 mb-2 block">Date Range</label>
                        <select
                            value={statDateRange}
                            onChange={(e) => setStatDateRange(e.target.value as "7d" | "30d" | "90d" | "all")}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-2 block">User Status</label>
                        <select
                            value={statUserFilter}
                            onChange={(e) => setStatUserFilter(e.target.value as "all" | "new-only" | "with-orders" | "without-orders")}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                        >
                            <option value="all">All New Users</option>
                            <option value="new-only">New Users Only</option>
                            <option value="with-orders">With Orders</option>
                            <option value="without-orders">Without Orders</option>
                        </select>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                        <div className="text-xs text-zinc-500 mb-2">Total New Users</div>
                        <div className="text-2xl font-bold text-violet-400">{statisticsData.totalNewUsers}</div>
                        <div className="text-xs text-zinc-600 mt-1">{statDateRange === "7d" ? "Last 7 days" : statDateRange === "30d" ? "Last 30 days" : statDateRange === "90d" ? "Last 90 days" : "All time"}</div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                        <div className="text-xs text-zinc-500 mb-2">With Orders</div>
                        <div className="text-2xl font-bold text-emerald-400">{statisticsData.usersWithOrders}</div>
                        <div className="text-xs text-zinc-600 mt-1">{statisticsData.totalNewUsers > 0 ? Math.round((statisticsData.usersWithOrders / statisticsData.totalNewUsers) * 100) : 0}%</div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                        <div className="text-xs text-zinc-500 mb-2">Without Orders</div>
                        <div className="text-2xl font-bold text-amber-400">{statisticsData.usersWithoutOrders}</div>
                        <div className="text-xs text-zinc-600 mt-1">{statisticsData.totalNewUsers > 0 ? Math.round((statisticsData.usersWithoutOrders / statisticsData.totalNewUsers) * 100) : 0}%</div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                        <div className="text-xs text-zinc-500 mb-2">Completed Signup</div>
                        <div className="text-2xl font-bold text-blue-400">{statisticsData.completedSignups}</div>
                        <div className="text-xs text-zinc-600 mt-1">{statisticsData.totalNewUsers > 0 ? Math.round((statisticsData.completedSignups / statisticsData.totalNewUsers) * 100) : 0}%</div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                        <div className="text-xs text-zinc-500 mb-2">Pending Signup</div>
                        <div className="text-2xl font-bold text-orange-400">{statisticsData.pendingSignups}</div>
                        <div className="text-xs text-zinc-600 mt-1">{statisticsData.totalNewUsers > 0 ? Math.round((statisticsData.pendingSignups / statisticsData.totalNewUsers) * 100) : 0}%</div>
                    </div>
                </div>

                {/* Chart */}
                {statisticsData.chartData.length > 0 && (
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
                        <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                            <TrendingUp size={14} /> Signup Trend
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={statisticsData.chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: "12px" }} />
                                <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
                                    labelStyle={{ color: "#fafafa" }}
                                />
                                <Line type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa", r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Users list */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800/60">
                        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <User size={14} /> New Users ({statisticsData.filteredNewUsers.length})
                        </h3>
                    </div>
                    {statisticsData.filteredNewUsers.length > 0 ? (
                        <div className="divide-y divide-zinc-800/40 max-h-[400px] overflow-y-auto">
                            {statisticsData.filteredNewUsers.map((u) => (
                                <div key={u.id} className="p-4 hover:bg-zinc-800/40 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-zinc-100">
                                                    {u.firstName} {u.lastName}
                                                </span>
                                                {u.signupStep === "COMPLETED" && (
                                                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">VERIFIED</span>
                                                )}
                                                {u.signupStep !== "COMPLETED" && (
                                                    <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded">PENDING</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-0.5">{u.email}</div>
                                            <div className="text-xs text-zinc-600 mt-1">
                                                Signed up: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-zinc-100">{u.totalOrders || 0} orders</div>
                                            <div className="text-xs text-zinc-500 mt-0.5">
                                                {(u.totalOrders || 0) > 0 ? "Active" : "No orders yet"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-zinc-500">No users found with the selected filters.</div>
                    )}
                </div>
            </div>
            )}

            {/* ============ MODALS ============ */}

            {/* Create / Edit Modal */}
            {showCreateModal && isSuperAdmin && (
                <Modal isOpen={showCreateModal} onClose={closeCreateModal} title={editingUser ? "Edit Customer" : "New Customer"}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="hidden" name="role" value="CUSTOMER" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name *</label>
                                <Input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name *</label>
                                <Input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email *</label>
                            <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="user@example.com" required disabled={!!editingUser} />
                            {editingUser && <p className="text-xs text-zinc-500 mt-1">Email cannot be changed</p>}
                        </div>
                        {!editingUser && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password *</label>
                                <Input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Password" required minLength={6} />
                                <p className="text-xs text-zinc-500 mt-1">Minimum 6 characters</p>
                            </div>
                        )}
                        <div className="rounded-lg border border-sky-900/50 bg-sky-950/20 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isDemoAccount}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, isDemoAccount: e.target.checked }))}
                                    className="mt-1 h-4 w-4 accent-sky-500"
                                />
                                <div>
                                    <div className="text-sm font-medium text-sky-200">Demo / App Review account</div>
                                    <p className="mt-1 text-xs text-sky-100/70">Orders auto-progress through delivery lifecycle.</p>
                                </div>
                            </label>
                        </div>
                        {formError && <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm">{formError}</div>}
                        {formSuccess && <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3 text-emerald-300 text-sm">{formSuccess}</div>}
                        <div className="flex gap-3 justify-end pt-2">
                            <Button type="button" onClick={closeCreateModal} variant="outline">Cancel</Button>
                            <Button type="submit" disabled={creating || updating}>
                                {(creating || updating) ? "Savingï¿½" : editingUser ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {showDeleteModal && userToDelete && (
                <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setUserToDelete(null); }} title="Delete Customer">
                    <div className="space-y-4">
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-zinc-300">
                                    Delete <strong>{userToDelete.firstName} {userToDelete.lastName}</strong> ({userToDelete.email})?
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">This cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button type="button" onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} variant="outline">Cancel</Button>
                            <Button type="button" onClick={confirmDelete} disabled={deleting} variant="danger">
                                {deleting ? "Deletingï¿½" : "Delete"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Ban Modal */}
            {showBanModal && userToBan && (
                <Modal isOpen={showBanModal} onClose={() => { setShowBanModal(false); setUserToBan(null); }} title={userToBan.isBanned ? "Unban Customer" : "Ban Customer"}>
                    <div className="space-y-4">
                        <div className={`${userToBan.isBanned ? "bg-emerald-900/20 border-emerald-800" : "bg-red-900/20 border-red-800"} border rounded-lg p-4 flex items-start gap-3`}>
                            {userToBan.isBanned
                                ? <ShieldCheck size={22} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                : <ShieldBan size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
                            }
                            <div>
                                <p className="text-sm text-zinc-300">
                                    {userToBan.isBanned ? "Unban" : "Ban"} <strong>{userToBan.firstName} {userToBan.lastName}</strong>?
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {userToBan.isBanned ? "They will be able to place orders again." : "They will not be able to place new orders."}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button type="button" onClick={() => { setShowBanModal(false); setUserToBan(null); }} variant="outline">Cancel</Button>
                            <Button
                                type="button"
                                onClick={confirmBan}
                                disabled={banning}
                                variant={userToBan.isBanned ? "success" : "danger"}
                            >
                                {banning ? (userToBan.isBanned ? "Unbanningâ€¦" : "Banningâ€¦") : (userToBan.isBanned ? "Unban" : "Ban")}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Details" size="lg">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div>
                                <div className="text-xs text-zinc-500">Order ID</div>
                                <div className="font-mono text-sm text-zinc-100">{selectedOrder.id}</div>
                                <div className="text-xs text-zinc-500 mt-1">{formatDate(selectedOrder.orderDate)}</div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs border ${statusColor(selectedOrder.status)}`}>
                                {selectedOrder.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-zinc-500">Order Price</span><span className="text-zinc-200">{formatCurrency(selectedOrder.orderPrice)}</span></div>
                                <div className="flex justify-between"><span className="text-zinc-500">Delivery</span><span className="text-zinc-200">{formatCurrency(selectedOrder.deliveryPrice)}</span></div>
                                <div className="flex justify-between border-t border-zinc-800 pt-2 font-semibold"><span className="text-zinc-300">Total</span><span className="text-zinc-100">{formatCurrency(selectedOrder.totalPrice)}</span></div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
                                <div><span className="text-zinc-500">Dropoff</span><div className="text-zinc-200 mt-0.5">{selectedOrder.dropOffLocation?.address || "â€”"}</div></div>
                                <div><span className="text-zinc-500">Duration</span><div className="text-zinc-200 mt-0.5">{orderDuration(selectedOrder)}</div></div>
                                {selectedOrder.driver && (
                                    <div><span className="text-zinc-500">Driver</span><div className="text-zinc-200 mt-0.5">{selectedOrder.driver.firstName} {selectedOrder.driver.lastName}</div></div>
                                )}
                            </div>
                        </div>

                        {selectedOrder.businesses.map((b, i) => (
                            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-zinc-800 text-sm font-medium text-zinc-200">{b.business.name}</div>
                                <div className="divide-y divide-zinc-800/40">
                                    {b.items.map((item, j) => (
                                        <div key={j} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                            <div className="text-zinc-300">{item.name} <span className="text-zinc-500">Ã—{item.quantity}</span></div>
                                            <div className="text-zinc-200">{formatCurrency(item.price * item.quantity)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
