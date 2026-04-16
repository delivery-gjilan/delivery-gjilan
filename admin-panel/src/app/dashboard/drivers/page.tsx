"use client";

import { useState, FormEvent, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import {
    DELETE_USER_MUTATION,
    ADMIN_UPDATE_DRIVER_SETTINGS_MUTATION,
    UPDATE_USER_MUTATION,
} from "@/graphql/operations/users/mutations";
import BulkCommissionModal from "@/components/drivers/BulkCommissionModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { DriverVehicleType, UserRole } from "@/gql/graphql";
import { useAuth } from "@/lib/auth-context";
import { useAdminPtt } from "@/lib/hooks/useAdminPtt";
import {
    Trash2, Plus, Signal, Settings2, Mic, MicOff, Loader2,
    Search, X, AlertCircle, CheckCircle2, BatteryCharging, BatteryLow,
    BatteryMedium, Phone, Mail, Percent, Layers, Wifi, WifiOff,
    Radio, Users, ChevronLeft, ChevronRight, MapPin, Clock,
    ShieldCheck, Activity,
} from "lucide-react";
import { gql } from "@apollo/client";
import { toast } from "sonner";

const DRIVER_REGISTER_MUTATION = gql`
    mutation DriverRegister(
        $email: String!
        $password: String!
        $firstName: String!
        $lastName: String!
        $phoneNumber: String
    ) {
        driverRegister(
            input: {
                email: $email
                password: $password
                firstName: $firstName
                lastName: $lastName
                phoneNumber: $phoneNumber
            }
        ) {
            message
            driver {
                id
            }
        }
    }
`;

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

interface DriverItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isDemoAccount?: boolean;
    role: string;
    phoneNumber?: string;
    imageUrl?: string;
    commissionPercentage?: number | null;
    maxActiveOrders?: number | null;
    hasOwnVehicle?: boolean | null;
    vehicleType?: DriverVehicleType | null;
    ownVehicleBonusAmount?: number | null;
    driverLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    } | null;
    driverLocationUpdatedAt?: string | null;
    driverConnection?: {
        onlinePreference: boolean;
        connectionStatus: "CONNECTED" | "STALE" | "LOST" | "DISCONNECTED";
        lastHeartbeatAt?: string;
        lastLocationUpdate?: string;
        disconnectedAt?: string;
        batteryLevel?: number | null;
        batteryOptIn?: boolean;
        batteryUpdatedAt?: string;
        isCharging?: boolean | null;
        activeOrderId?: string | null;
        navigationPhase?: string | null;
        remainingEtaSeconds?: number | null;
    };
}

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function initials(first: string, last: string) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatDate(v?: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function connectionColor(status: string) {
    switch (status) {
        case "CONNECTED":    return { dot: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Connected" };
        case "STALE":        return { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Stale" };
        case "LOST":         return { dot: "bg-red-500",     text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     label: "Lost" };
        default:             return { dot: "bg-zinc-600",    text: "text-zinc-500",    bg: "bg-zinc-800/40",    border: "border-zinc-700",       label: "Offline" };
    }
}

/* ---------------------------------------------------------
   Sub-components
--------------------------------------------------------- */

function BatteryIndicator({ connection }: { connection?: DriverItem["driverConnection"] }) {
    if (!connection?.batteryOptIn || connection.batteryLevel == null) {
        return <span className="text-xs text-zinc-600">—</span>;
    }
    const level = connection.batteryLevel;
    const isCharging = connection.isCharging;
    let Icon = BatteryMedium;
    let color = "text-emerald-400";
    if (isCharging) { Icon = BatteryCharging; color = "text-blue-400"; }
    else if (level < 20) { Icon = BatteryLow; color = "text-red-400"; }
    return (
        <div className={`flex items-center gap-1 text-xs font-medium ${color}`}>
            <Icon size={14} />
            <span className="tabular-nums">{level}%</span>
        </div>
    );
}

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */

const PAGE_SIZE = 20;

export default function DriversPage() {
    const { admin } = useAuth();
    const isSuperAdmin = admin?.role === "SUPER_ADMIN";

    /* --- data --- */
    const { data, loading, error, refetch } = useQuery<{ drivers: DriverItem[] }>(DRIVERS_QUERY);
    const [drivers, setDrivers] = useState<DriverItem[]>([]);

    useEffect(() => {
        if (data?.drivers) setDrivers(data.drivers);
    }, [data?.drivers]);

    useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, {
        onData: ({ data: sub }) => {
            const incoming = sub.data?.driversUpdated as DriverItem[] | undefined;
            if (!incoming?.length) return;
            setDrivers((prev) => {
                const byId = new Map(prev.map((d) => [d.id, d]));
                incoming.forEach((d) => byId.set(d.id, { ...byId.get(d.id), ...d }));
                return Array.from(byId.values());
            });
        },
    });

    /* --- mutations --- */
    const [createDriver] = useMutation(DRIVER_REGISTER_MUTATION);
    const [deleteDriver] = useMutation(DELETE_USER_MUTATION, { onCompleted: () => refetch() });
    const [updateDriverSettings] = useMutation(ADMIN_UPDATE_DRIVER_SETTINGS_MUTATION, {
        onCompleted: () => { refetch(); setShowSettingsModal(false); setSettingsTarget(null); },
    });
    const [updateUser] = useMutation(UPDATE_USER_MUTATION);

    /* --- panel state --- */
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

    /* --- PTT --- */
    const [pttDriverIds, setPttDriverIds] = useState<string[]>([]);
    const { isTalking, isMuted, pttError, startTalking, stopTalking, toggleMute } = useAdminPtt();

    /* --- modals --- */
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkCommissionModal, setShowBulkCommissionModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        isDemoAccount: false,
        hasOwnVehicle: false,
        vehicleType: "" as "" | DriverVehicleType,
        ownVehicleBonusAmount: "0",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DriverItem | null>(null);

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsTarget, setSettingsTarget] = useState<DriverItem | null>(null);
    const [settingsForm, setSettingsForm] = useState({
        commissionPercentage: "",
        maxActiveOrders: "",
        isDemoAccount: false,
        hasOwnVehicle: false,
        vehicleType: "" as "" | DriverVehicleType,
        ownVehicleBonusAmount: "0",
    });
    const [settingsError, setSettingsError] = useState("");

    /* --- search, debounce & pagination --- */
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    /* --- debounce effect --- */
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
            setCurrentPage(1);
        }, 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchTerm]);

    /* --- derived --- */
    const selectedDriver = useMemo(
        () => (selectedDriverId ? drivers.find((d) => d.id === selectedDriverId) ?? null : null),
        [drivers, selectedDriverId],
    );

    const filteredDrivers = useMemo(() => {
        if (!debouncedSearch) return drivers;
        const q = debouncedSearch;
        return drivers.filter((d) =>
            `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
            d.email.toLowerCase().includes(q) ||
            (d.phoneNumber ?? "").toLowerCase().includes(q),
        );
    }, [drivers, debouncedSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE));
    const pagedDrivers = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredDrivers.slice(start, start + PAGE_SIZE);
    }, [filteredDrivers, currentPage]);

    const connectedCount = drivers.filter((d) => d.driverConnection?.connectionStatus === "CONNECTED").length;
    const onlineCount    = drivers.filter((d) => d.driverConnection?.onlinePreference).length;

    /* --- PTT helpers --- */
    const pttConnectedIds = useMemo(
        () => pttDriverIds.filter((id) => drivers.find((d) => d.id === id)?.driverConnection?.connectionStatus === "CONNECTED"),
        [pttDriverIds, drivers],
    );
    const pttOfflineCount = pttDriverIds.length - pttConnectedIds.length;

    /* --- handlers --- */
    const selectDriver = useCallback((d: DriverItem) => setSelectedDriverId(d.id), []);
    const closePanel   = useCallback(() => setSelectedDriverId(null), []);
    const goToPage     = useCallback((p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);

    const openSettingsModal = useCallback((driver: DriverItem) => {
        setSettingsTarget(driver);
        setSettingsForm({
            commissionPercentage: driver.commissionPercentage != null ? String(driver.commissionPercentage) : "0",
            maxActiveOrders:      driver.maxActiveOrders != null      ? String(driver.maxActiveOrders)      : "2",
            isDemoAccount: Boolean(driver.isDemoAccount),
            hasOwnVehicle: Boolean(driver.hasOwnVehicle),
            vehicleType: driver.vehicleType ?? "",
            ownVehicleBonusAmount: driver.ownVehicleBonusAmount != null ? String(driver.ownVehicleBonusAmount) : "0",
        });
        setSettingsError("");
        setShowSettingsModal(true);
    }, []);

    const handleSettingsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!settingsTarget) return;
        setSettingsError("");
        const commission = parseFloat(settingsForm.commissionPercentage);
        const maxOrders  = parseInt(settingsForm.maxActiveOrders, 10);
        const ownVehicleBonusAmount = parseFloat(settingsForm.ownVehicleBonusAmount);
        if (isNaN(commission) || commission < 0 || commission > 100) { setSettingsError("Commission must be 0–100"); return; }
        if (isNaN(maxOrders)  || maxOrders  < 1 || maxOrders  > 99)  { setSettingsError("Max orders must be 1–99");  return; }
        if (isNaN(ownVehicleBonusAmount) || ownVehicleBonusAmount < 0 || ownVehicleBonusAmount > 999) { setSettingsError("Own vehicle bonus must be 0–999");  return; }
        try {
            await updateDriverSettings({ variables: { driverId: settingsTarget.id, commissionPercentage: commission, maxActiveOrders: maxOrders, hasOwnVehicle: settingsForm.hasOwnVehicle, vehicleType: settingsForm.vehicleType || null, ownVehicleBonusAmount } });
            await updateUser({ variables: { id: settingsTarget.id, firstName: settingsTarget.firstName, lastName: settingsTarget.lastName, role: UserRole.Driver, businessId: null, isDemoAccount: settingsForm.isDemoAccount } });
            toast.success("Settings updated");
        } catch (err) {
            setSettingsError(err instanceof Error ? err.message : "Failed");
        }
    };

    const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) {
            setFormError("All fields are required"); return;
        }
        try {
            const { data: created } = await createDriver({
                variables: { email: createForm.email, password: createForm.password, firstName: createForm.firstName, lastName: createForm.lastName, phoneNumber: createForm.phoneNumber.trim() || null },
            }) as any;
            const createdId = created?.driverRegister?.driver?.id as string | undefined;
            if (!createdId) throw new Error("Driver creation failed");
            const ownVehicleBonusAmount = parseFloat(createForm.ownVehicleBonusAmount);
            if (isNaN(ownVehicleBonusAmount) || ownVehicleBonusAmount < 0 || ownVehicleBonusAmount > 999) {
                throw new Error("Own vehicle bonus must be 0–999");
            }
            await updateDriverSettings({
                variables: {
                    driverId: createdId,
                    hasOwnVehicle: createForm.hasOwnVehicle,
                    vehicleType: createForm.vehicleType || null,
                    ownVehicleBonusAmount,
                },
            });
            if (createForm.isDemoAccount) {
                await updateUser({ variables: { id: createdId, firstName: createForm.firstName, lastName: createForm.lastName, role: UserRole.Driver, businessId: null, isDemoAccount: true } });
            }
            await refetch();
            toast.success(created?.driverRegister?.message || "Driver created");
            setShowCreateModal(false);
            setCreateForm({ email: "", password: "", firstName: "", lastName: "", phoneNumber: "", isDemoAccount: false, hasOwnVehicle: false, vehicleType: "", ownVehicleBonusAmount: "0" });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to create driver");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDriver({ variables: { id: deleteTarget.id } });
            toast.success("Driver deleted");
            setShowDeleteModal(false);
            setDeleteTarget(null);
            if (selectedDriverId === deleteTarget.id) closePanel();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
        }
    };

    /* =========================================================
       RENDER
    ========================================================= */

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-zinc-500">
                <Loader2 className="animate-spin mr-2" size={20} />
                Loading drivers…
            </div>
        );
    }

    return (
        <div className="text-white">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Drivers</h1>
                    <p className="text-zinc-500 text-sm mt-0.5">Manage driver accounts, commissions, and capacity.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search name, email, phone…"
                            className="w-64 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setShowBulkCommissionModal(true)}>
                                <Percent size={15} />
                                Set Commission
                            </Button>
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus size={15} />
                                New Driver
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm mb-4">{error.message}</div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                    { label: "Total",        value: drivers.length,                  icon: Users,   color: "text-violet-400",  bg: "bg-violet-500/10" },
                    { label: "Connected",    value: connectedCount,                  icon: Wifi,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Online",       value: onlineCount,                     icon: Radio,   color: "text-blue-400",    bg: "bg-blue-500/10" },
                    { label: "Disconnected", value: drivers.length - connectedCount, icon: WifiOff, color: "text-zinc-500",    bg: "bg-zinc-800/50" },
                ].map((s) => (
                    <div key={s.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                            <s.icon size={16} className={s.color} />
                        </div>
                        <div>
                            <div className="text-xl font-semibold text-white tabular-nums">{s.value}</div>
                            <div className="text-xs text-zinc-500">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* PTT bar */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-3 mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Mic size={15} className="text-violet-400" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-200">Push-to-Talk</div>
                        <div className="text-xs text-zinc-500">
                            {pttDriverIds.length} selected &middot; {pttConnectedIds.length} connected
                            {pttOfflineCount > 0 && ` · ${pttOfflineCount} offline`}
                        </div>
                    </div>
                    {pttError && <p className="text-red-400 text-xs ml-2">{pttError}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => toggleMute(pttConnectedIds)} disabled={!isTalking}>
                        {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                        {isMuted ? "Unmute" : "Mute"}
                    </Button>
                    <Button
                        variant={isTalking ? "danger" : "success"}
                        size="sm"
                        onMouseDown={() => startTalking(pttConnectedIds)}
                        onMouseUp={stopTalking}
                        onMouseLeave={stopTalking}
                        onTouchStart={() => startTalking(pttConnectedIds)}
                        onTouchEnd={stopTalking}
                    >
                        <Mic size={13} />
                        {isTalking ? "Release to Stop" : "Hold to Talk"}
                    </Button>
                </div>
            </div>

            {/* Main layout: list + detail panel */}
            <div className="flex gap-0 min-h-[calc(100vh-260px)]">

                {/* ---- Driver list ---- */}
                <div className={`transition-all duration-200 ${selectedDriver ? "w-[380px] flex-shrink-0" : "w-full"}`}>
                    <div className={`bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden ${selectedDriver ? "rounded-r-none border-r-0" : ""}`}>
                        {!filteredDrivers.length ? (
                            <div className="p-8 text-center text-zinc-500">No drivers found.</div>
                        ) : (
                            <div className="divide-y divide-zinc-800/60 max-h-[calc(100vh-320px)] overflow-y-auto">
                                {pagedDrivers.map((d) => {
                                    const conn = d.driverConnection;
                                    const status = conn?.connectionStatus ?? "DISCONNECTED";
                                    const cc = connectionColor(status);
                                    const isOnline = conn?.onlinePreference ?? false;
                                    const isActive = selectedDriver?.id === d.id;
                                    const isPttSelected = pttDriverIds.includes(d.id);

                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => selectDriver(d)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                isActive
                                                    ? "bg-violet-500/10 border-l-2 border-l-violet-500"
                                                    : "hover:bg-zinc-800/60 border-l-2 border-l-transparent"
                                            }`}
                                        >
                                            {/* PTT checkbox */}
                                            <div
                                                role="checkbox"
                                                aria-checked={isPttSelected}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPttDriverIds((prev) =>
                                                        prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id],
                                                    );
                                                }}
                                                className="flex-shrink-0 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isPttSelected}
                                                    onChange={() => {}}
                                                    className="h-3.5 w-3.5 accent-violet-500 rounded cursor-pointer"
                                                />
                                            </div>

                                            {/* Avatar with connection dot */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xs font-semibold text-violet-300">
                                                    {initials(d.firstName, d.lastName)}
                                                </div>
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${cc.dot}`} />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-zinc-100 truncate">{d.firstName} {d.lastName}</span>
                                                    {d.isDemoAccount && (
                                                        <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-sky-300">DEMO</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-xs ${cc.text}`}>{cc.label}</span>
                                                    {isOnline && (
                                                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />Online
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Battery */}
                                            {conn?.batteryOptIn && conn.batteryLevel != null && (
                                                <BatteryIndicator connection={conn} />
                                            )}

                                            {!selectedDriver && <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/60">
                                <span className="text-xs text-zinc-500">
                                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredDrivers.length)} of {filteredDrivers.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400">
                                        <ChevronLeft size={15} />
                                    </button>
                                    <span className="text-xs text-zinc-400 px-2">{currentPage} / {totalPages}</span>
                                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400">
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ---- Detail panel ---- */}
                {selectedDriver && (
                    <div className="flex-1 bg-zinc-900/40 border border-zinc-800 border-l-zinc-800 rounded-xl rounded-l-none overflow-hidden flex flex-col min-w-0">
                        {/* Panel header */}
                        <div className="flex items-start justify-between p-5 pb-4 border-b border-zinc-800/60">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-base font-bold text-violet-300">
                                        {initials(selectedDriver.firstName, selectedDriver.lastName)}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${connectionColor(selectedDriver.driverConnection?.connectionStatus ?? "DISCONNECTED").dot}`} />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-100">
                                        {selectedDriver.firstName} {selectedDriver.lastName}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1"><Mail size={12} />{selectedDriver.email}</span>
                                        {selectedDriver.phoneNumber && (
                                            <span className="flex items-center gap-1"><Phone size={12} />{selectedDriver.phoneNumber}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={closePanel} className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800/60">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Status + actions bar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/30">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const status = selectedDriver.driverConnection?.connectionStatus ?? "DISCONNECTED";
                                    const cc = connectionColor(status);
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border ${cc.border} ${cc.bg} px-2.5 py-0.5 text-xs font-semibold ${cc.text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${cc.dot} ${status === "CONNECTED" ? "animate-pulse" : ""}`} />
                                            {cc.label}
                                        </span>
                                    );
                                })()}
                                {selectedDriver.driverConnection?.onlinePreference && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                                        <Radio size={11} /> Online
                                    </span>
                                )}
                                {selectedDriver.isDemoAccount && (
                                    <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-300">Demo</span>
                                )}
                                {!selectedDriver.driverConnection?.onlinePreference && !selectedDriver.isDemoAccount && (
                                    <span className="text-xs text-zinc-500">Standard driver</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openSettingsModal(selectedDriver)}>
                                    <Settings2 size={13} /> Settings
                                </Button>
                                {isSuperAdmin && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setDeleteTarget(selectedDriver); setShowDeleteModal(true); }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={13} />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Detail content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Commission & capacity */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                                    <ShieldCheck size={14} /> Settings
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-zinc-500">Commission</span>
                                        <div className="text-zinc-100 font-semibold mt-0.5 flex items-center gap-1">
                                            <Percent size={12} className="text-zinc-500" />
                                            {selectedDriver.commissionPercentage ?? 0}%
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">Max Active Orders</span>
                                        <div className="text-zinc-100 font-semibold mt-0.5 flex items-center gap-1">
                                            <Layers size={12} className="text-zinc-500" />
                                            {selectedDriver.maxActiveOrders ?? 2}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Connection info */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                                    <Activity size={14} /> Connection
                                </h3>
                                {selectedDriver.driverConnection ? (() => {
                                    const conn = selectedDriver.driverConnection!;
                                    return (
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-zinc-500">Last Heartbeat</span>
                                                <div className="text-zinc-200 mt-0.5 text-xs">{formatDate(conn.lastHeartbeatAt)}</div>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500">Last Location</span>
                                                <div className="text-zinc-200 mt-0.5 text-xs">{formatDate(conn.lastLocationUpdate)}</div>
                                            </div>
                                            {conn.batteryOptIn && conn.batteryLevel != null && (
                                                <div>
                                                    <span className="text-zinc-500">Battery</span>
                                                    <div className="mt-0.5"><BatteryIndicator connection={conn} /></div>
                                                </div>
                                            )}
                                            {conn.activeOrderId && (
                                                <div>
                                                    <span className="text-zinc-500">Active Order</span>
                                                    <div className="text-zinc-200 mt-0.5 font-mono text-xs">{conn.activeOrderId}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : (
                                    <p className="text-sm text-zinc-500">No connection data.</p>
                                )}
                            </div>

                            {/* Location */}
                            {selectedDriver.driverLocation && (
                                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                                        <MapPin size={14} /> Last Location
                                    </h3>
                                    <div className="text-sm text-zinc-300">{selectedDriver.driverLocation.address || "—"}</div>
                                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                        <Clock size={11} />
                                        {formatDate(selectedDriver.driverLocationUpdatedAt)}
                                    </div>
                                </div>
                            )}

                            {/* Driver ID */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                                <div className="text-xs text-zinc-500">Driver ID</div>
                                <div className="text-zinc-200 mt-0.5 font-mono text-xs">{selectedDriver.id}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ============ MODALS ============ */}

            {/* Settings Modal */}
            {showSettingsModal && settingsTarget && (
                <Modal isOpen={showSettingsModal} onClose={() => { setShowSettingsModal(false); setSettingsTarget(null); }} title="Driver Settings">
                    <form onSubmit={handleSettingsSubmit} className="space-y-5">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-sm font-medium text-violet-300 shrink-0">
                                {initials(settingsTarget.firstName, settingsTarget.lastName)}
                            </div>
                            <div>
                                <div className="font-medium text-zinc-100">{settingsTarget.firstName} {settingsTarget.lastName}</div>
                                <div className="text-xs text-zinc-500">{settingsTarget.email}</div>
                            </div>
                        </div>
                        {settingsError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <AlertCircle size={14} className="shrink-0" />{settingsError}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5"><Percent size={13} className="text-zinc-500" />Commission Percentage</label>
                                <p className="text-xs text-zinc-500 mb-2">Platform deducts this % from each delivery fee.</p>
                                <Input type="number" min="0" max="100" step="0.5" value={settingsForm.commissionPercentage} onChange={(e) => setSettingsForm(f => ({ ...f, commissionPercentage: e.target.value }))} placeholder="e.g. 10" />
                            </div>
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5"><Layers size={13} className="text-zinc-500" />Max Active Orders</label>
                                <p className="text-xs text-zinc-500 mb-2">Maximum simultaneous orders this driver can accept.</p>
                                <Input type="number" min="1" max="99" step="1" value={settingsForm.maxActiveOrders} onChange={(e) => setSettingsForm(f => ({ ...f, maxActiveOrders: e.target.value }))} placeholder="e.g. 2" />
                            </div>
                        </div>
                        <label className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                            <input type="checkbox" checked={settingsForm.hasOwnVehicle} onChange={(e) => setSettingsForm(f => ({ ...f, hasOwnVehicle: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-emerald-500 rounded" />
                            <div>
                                <div className="text-sm font-medium text-emerald-200">Has Personal Vehicle</div>
                                <p className="text-xs text-emerald-300/60 mt-0.5">Driver uses their own vehicle for deliveries. Eligible for vehicle bonus.</p>
                            </div>
                        </label>
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5"><Activity size={13} className="text-zinc-500" />Vehicle Type</label>
                            <p className="text-xs text-zinc-500 mb-2">Gas vehicles are prioritized for longer-distance deliveries.</p>
                            <select value={settingsForm.vehicleType} onChange={(e) => setSettingsForm(f => ({ ...f, vehicleType: e.target.value as "" | DriverVehicleType }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500">
                                <option value="">Not specified</option>
                                <option value={DriverVehicleType.Gas}>Gas</option>
                                <option value={DriverVehicleType.Electric}>Electric</option>
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5"><Percent size={13} className="text-zinc-500" />Own Vehicle Bonus (EUR)</label>
                            <p className="text-xs text-zinc-500 mb-2">Fixed per-delivery bonus paid when this driver uses their own vehicle.</p>
                            <Input type="number" min="0" max="999" step="0.01" value={settingsForm.ownVehicleBonusAmount} onChange={(e) => setSettingsForm(f => ({ ...f, ownVehicleBonusAmount: e.target.value }))} placeholder="e.g. 1.50" />
                        </div>
                        <label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 cursor-pointer hover:bg-sky-500/10 transition-colors">
                            <input type="checkbox" checked={settingsForm.isDemoAccount} onChange={(e) => setSettingsForm(f => ({ ...f, isDemoAccount: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-sky-500 rounded" />
                            <div>
                                <div className="text-sm font-medium text-sky-200">Demo / App Review driver</div>
                                <p className="text-xs text-sky-300/60 mt-0.5">Used by the automatic review flow when assigning demo deliveries.</p>
                            </div>
                        </label>
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" className="flex-1">Save Settings</Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowSettingsModal(false); setSettingsTarget(null); }}>Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Create Modal */}
            {showCreateModal && isSuperAdmin && (
                <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateForm({ email: "", password: "", firstName: "", lastName: "", phoneNumber: "", isDemoAccount: false, hasOwnVehicle: false, vehicleType: "", ownVehicleBonusAmount: "0" }); setFormError(""); }} title="Add New Driver">
                    <form onSubmit={handleCreateSubmit} className="space-y-5">
                        {formError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <AlertCircle size={14} className="shrink-0" />{formError}
                            </div>
                        )}
                        {formSuccess && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                <CheckCircle2 size={14} className="shrink-0" />{formSuccess}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name *</label>
                                <Input type="text" value={createForm.firstName} onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))} placeholder="John" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name *</label>
                                <Input type="text" value={createForm.lastName} onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email *</label>
                            <Input type="email" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password *</label>
                            <Input type="password" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone Number</label>
                            <Input type="tel" value={createForm.phoneNumber} onChange={(e) => setCreateForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+383 44 123 456" />
                        </div>
                        <label className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                            <input type="checkbox" checked={createForm.hasOwnVehicle} onChange={(e) => setCreateForm(f => ({ ...f, hasOwnVehicle: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-emerald-500 rounded" />
                            <div>
                                <div className="text-sm font-medium text-emerald-200">Has Personal Vehicle</div>
                                <p className="text-xs text-emerald-300/60 mt-0.5">Eligible for own-vehicle bonus settlements.</p>
                            </div>
                        </label>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Vehicle Type</label>
                            <select value={createForm.vehicleType} onChange={(e) => setCreateForm(f => ({ ...f, vehicleType: e.target.value as "" | DriverVehicleType }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500">
                                <option value="">Not specified</option>
                                <option value={DriverVehicleType.Gas}>Gas</option>
                                <option value={DriverVehicleType.Electric}>Electric</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Own Vehicle Bonus (EUR)</label>
                            <Input type="number" min="0" max="999" step="0.01" value={createForm.ownVehicleBonusAmount} onChange={(e) => setCreateForm(f => ({ ...f, ownVehicleBonusAmount: e.target.value }))} placeholder="e.g. 1.50" />
                        </div>
                        <label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 cursor-pointer hover:bg-sky-500/10 transition-colors">
                            <input type="checkbox" checked={createForm.isDemoAccount} onChange={(e) => setCreateForm(f => ({ ...f, isDemoAccount: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-sky-500 rounded" />
                            <div>
                                <div className="text-sm font-medium text-sky-200">Create as Demo / Review driver</div>
                                <p className="text-xs text-sky-300/60 mt-0.5">This driver can be selected for automatic App Review delivery progression.</p>
                            </div>
                        </label>
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" variant="success" className="flex-1">Create Driver</Button>
                            <Button type="button" onClick={() => setShowCreateModal(false)} variant="outline" className="flex-1">Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deleteTarget && (
                <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }} title="Delete Driver">
                    <div className="space-y-5">
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-zinc-300">
                                    Delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> ({deleteTarget.email})?
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">This cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button type="button" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} variant="outline">Cancel</Button>
                            <Button type="button" onClick={confirmDelete} variant="danger">Delete</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk Commission Modal */}
            <BulkCommissionModal
                isOpen={showBulkCommissionModal}
                onClose={() => setShowBulkCommissionModal(false)}
                drivers={drivers}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
