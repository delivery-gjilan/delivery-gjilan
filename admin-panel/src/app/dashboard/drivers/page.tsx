"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import {
    CREATE_USER_MUTATION,
    DELETE_USER_MUTATION,
    ADMIN_UPDATE_DRIVER_SETTINGS_MUTATION,
    UPDATE_USER_MUTATION,
} from "@/graphql/operations/users/mutations";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserRole } from "@/gql/graphql";
import { useAuth } from "@/lib/auth-context";
import { useAdminPtt } from "@/lib/hooks/useAdminPtt";
import {
    Trash2, Plus, Signal, Settings2, Mic, MicOff, Users, Loader2,
    Search, AlertCircle, CheckCircle2, Radio, BatteryCharging, BatteryLow,
    BatteryMedium, Phone, Mail, Percent, Layers, Wifi, WifiOff,
} from "lucide-react";

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
    };
}

interface DriversResponse {
    drivers: DriverItem[];
}

export default function DriversPage() {
    const { admin } = useAuth();
    const isSuperAdmin = admin?.role === "SUPER_ADMIN";

    const { data, loading, error, refetch } = useQuery<DriversResponse>(DRIVERS_QUERY);
    const [drivers, setDrivers] = useState<DriverItem[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (data?.drivers) {
            setDrivers(data.drivers);
        }
    }, [data?.drivers]);

    useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incoming = subscriptionData.data?.driversUpdated as DriverItem[] | undefined;
            if (!incoming || incoming.length === 0) return;

            setDrivers((prev) => {
                const byId = new Map(prev.map((d) => [d.id, d]));
                incoming.forEach((driver) => {
                    byId.set(driver.id, { ...byId.get(driver.id), ...driver });
                });
                return Array.from(byId.values());
            });
        },
    });

    const [createDriver] = useMutation(CREATE_USER_MUTATION, {
        onCompleted: () => { refetch(); handleCloseCreateModal(); },
    });
    const [deleteDriver] = useMutation(DELETE_USER_MUTATION, {
        onCompleted: () => refetch(),
    });
    const [updateDriverSettings] = useMutation(ADMIN_UPDATE_DRIVER_SETTINGS_MUTATION, {
        onCompleted: () => { refetch(); setShowSettingsModal(false); setSettingsTarget(null); },
    });
    const [updateUser] = useMutation(UPDATE_USER_MUTATION);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ email: "", password: "", firstName: "", lastName: "", isDemoAccount: false });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DriverItem | null>(null);

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsTarget, setSettingsTarget] = useState<DriverItem | null>(null);
    const [settingsForm, setSettingsForm] = useState({ commissionPercentage: "", maxActiveOrders: "", isDemoAccount: false });
    const [settingsError, setSettingsError] = useState("");

    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
    const { isTalking, isMuted, pttError, startTalking, stopTalking, toggleMute } = useAdminPtt();

    const filteredDrivers = useMemo(() => {
        if (!search.trim()) return drivers;
        const q = search.toLowerCase();
        return drivers.filter((d) =>
            `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
            d.email.toLowerCase().includes(q) ||
            d.phoneNumber?.toLowerCase().includes(q)
        );
    }, [drivers, search]);

    const selectedDrivers = drivers.filter((d) => selectedDriverIds.includes(d.id));
    const selectedConnectedDriverIds = selectedDrivers
        .filter((d) => d.driverConnection?.connectionStatus === 'CONNECTED')
        .map((d) => d.id);
    const selectedOfflineCount = selectedDrivers.length - selectedConnectedDriverIds.length;

    const connectedCount = drivers.filter((d) => d.driverConnection?.connectionStatus === 'CONNECTED').length;
    const onlineCount = drivers.filter((d) => d.driverConnection?.onlinePreference).length;

    const handleStartTalking = () => startTalking(selectedConnectedDriverIds);
    const handleStopTalking = () => stopTalking();
    const handleToggleMute = () => toggleMute(selectedConnectedDriverIds);

    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        setCreateForm({ email: "", password: "", firstName: "", lastName: "", isDemoAccount: false });
        setFormError("");
    };

    const openSettingsModal = (driver: DriverItem) => {
        setSettingsTarget(driver);
        setSettingsForm({
            commissionPercentage: driver.commissionPercentage !== null && driver.commissionPercentage !== undefined
                ? String(driver.commissionPercentage) : "0",
            maxActiveOrders: driver.maxActiveOrders !== null && driver.maxActiveOrders !== undefined
                ? String(driver.maxActiveOrders) : "2",
            isDemoAccount: Boolean(driver.isDemoAccount),
        });
        setSettingsError("");
        setShowSettingsModal(true);
    };

    const handleSettingsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!settingsTarget) return;
        setSettingsError("");

        const commission = parseFloat(settingsForm.commissionPercentage);
        const maxOrders = parseInt(settingsForm.maxActiveOrders, 10);

        if (isNaN(commission) || commission < 0 || commission > 100) {
            setSettingsError("Commission must be between 0 and 100");
            return;
        }
        if (isNaN(maxOrders) || maxOrders < 1 || maxOrders > 99) {
            setSettingsError("Max active orders must be between 1 and 99");
            return;
        }

        try {
            await updateDriverSettings({
                variables: { driverId: settingsTarget.id, commissionPercentage: commission, maxActiveOrders: maxOrders },
            });
            await updateUser({
                variables: {
                    id: settingsTarget.id,
                    firstName: settingsTarget.firstName,
                    lastName: settingsTarget.lastName,
                    role: UserRole.Driver,
                    businessId: null,
                    isDemoAccount: settingsForm.isDemoAccount,
                },
            });
            setFormSuccess(`Settings updated for ${settingsTarget.firstName} ${settingsTarget.lastName}`);
            setTimeout(() => setFormSuccess(""), 3000);
        } catch (err) {
            setSettingsError(err instanceof Error ? err.message : "Failed to update settings");
        }
    };

    const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) {
            setFormError("All fields are required");
            return;
        }
        try {
            const { data: created } = await createDriver({
                variables: { ...createForm, role: UserRole.Driver },
            }) as any;
            if (created?.createUser) {
                setFormSuccess(created.createUser.message || "Driver created successfully");
                setTimeout(() => setFormSuccess(""), 3000);
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to create driver");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDriver({ variables: { id: deleteTarget.id } });
            setFormSuccess("Driver deleted successfully");
            setTimeout(() => setFormSuccess(""), 3000);
            setShowDeleteModal(false);
            setDeleteTarget(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to delete driver");
        }
    };

    const toggleSelectAll = () => {
        if (selectedDriverIds.length === filteredDrivers.length) {
            setSelectedDriverIds([]);
        } else {
            setSelectedDriverIds(filteredDrivers.map((d) => d.id));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-zinc-500">
                <Loader2 className="animate-spin mr-2" size={20} />
                Loading drivers…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white flex items-center gap-2.5">
                        <Users size={22} />
                        Drivers
                    </h1>
                    <p className="text-zinc-400 mt-1 text-sm">
                        Manage drivers, commissions, and capacity limits.
                    </p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus size={16} />
                        Add Driver
                    </Button>
                )}
            </div>

            {/* Feedback */}
            {error && (
                <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="shrink-0" />
                    {error.message}
                </div>
            )}
            {formSuccess && (
                <div className="flex items-center gap-2.5 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <CheckCircle2 size={16} className="shrink-0" />
                    {formSuccess}
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Users size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-white tabular-nums">{drivers.length}</p>
                            <p className="text-xs text-zinc-500">Total Drivers</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Wifi size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-white tabular-nums">{connectedCount}</p>
                            <p className="text-xs text-zinc-500">Connected</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Radio size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-white tabular-nums">{onlineCount}</p>
                            <p className="text-xs text-zinc-500">Online</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                            <WifiOff size={18} className="text-zinc-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-white tabular-nums">{drivers.length - connectedCount}</p>
                            <p className="text-xs text-zinc-500">Disconnected</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PTT Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Mic size={16} className="text-violet-400" />
                                Push-to-Talk
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {selectedDrivers.length} selected &middot; {selectedConnectedDriverIds.length} connected
                                {selectedOfflineCount > 0 && ` · ${selectedOfflineCount} offline`}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleToggleMute}
                                disabled={!isTalking}
                            >
                                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                                {isMuted ? 'Unmute' : 'Mute'}
                            </Button>
                            <Button
                                variant={isTalking ? "danger" : "success"}
                                size="sm"
                                onMouseDown={handleStartTalking}
                                onMouseUp={handleStopTalking}
                                onMouseLeave={handleStopTalking}
                                onTouchStart={handleStartTalking}
                                onTouchEnd={handleStopTalking}
                            >
                                <Mic size={14} />
                                {isTalking ? 'Release To Stop' : 'Hold To Talk'}
                            </Button>
                        </div>
                    </div>
                    {pttError && (
                        <p className="text-red-400 text-sm mt-2">{pttError}</p>
                    )}
                </CardHeader>
            </Card>

            {/* Driver list */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-base">All Drivers</CardTitle>
                            <CardDescription className="mt-1">
                                {filteredDrivers.length} {filteredDrivers.length === 1 ? "driver" : "drivers"}
                                {search && ` matching "${search}"`}
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search drivers…"
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredDrivers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3">
                                <Users size={20} className="text-zinc-500" />
                            </div>
                            <p className="text-zinc-400 text-sm font-medium">
                                {search ? "No drivers match your search" : "No drivers found"}
                            </p>
                            <p className="text-zinc-500 text-xs mt-1">
                                {search ? "Try a different search term." : "Create a driver to get started."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedDriverIds.length === filteredDrivers.length && filteredDrivers.length > 0}
                                            onChange={toggleSelectAll}
                                            className="h-3.5 w-3.5 accent-violet-500 rounded cursor-pointer"
                                        />
                                    </TableHead>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Battery</TableHead>
                                    <TableHead className="text-right">Commission</TableHead>
                                    <TableHead className="text-right">Max Orders</TableHead>
                                    <TableHead className="w-24" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDrivers.map((driver) => {
                                    const conn = driver.driverConnection;
                                    const status = conn?.connectionStatus ?? "DISCONNECTED";
                                    const isOnline = conn?.onlinePreference ?? false;

                                    return (
                                        <TableRow key={driver.id}>
                                            <TableCell className="text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDriverIds.includes(driver.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDriverIds((prev) => [...prev, driver.id]);
                                                        } else {
                                                            setSelectedDriverIds((prev) => prev.filter((id) => id !== driver.id));
                                                        }
                                                    }}
                                                    className="h-3.5 w-3.5 accent-violet-500 rounded cursor-pointer"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-sm font-medium text-violet-300 shrink-0">
                                                        {driver.firstName[0]}{driver.lastName[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-zinc-100 truncate">
                                                                {driver.firstName} {driver.lastName}
                                                            </span>
                                                            {driver.isDemoAccount && (
                                                                <Badge variant="default" className="text-[10px] px-1.5 py-0">Demo</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {isOnline ? (
                                                                <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                    Online
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                                    Offline
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                                        <Mail size={12} className="shrink-0 text-zinc-500" />
                                                        <span className="truncate">{driver.email}</span>
                                                    </div>
                                                    {driver.phoneNumber && (
                                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                                            <Phone size={12} className="shrink-0 text-zinc-500" />
                                                            <span>{driver.phoneNumber}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <ConnectionBadge status={status} />
                                            </TableCell>
                                            <TableCell>
                                                <BatteryIndicator connection={conn} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-zinc-100 font-medium tabular-nums">
                                                    {driver.commissionPercentage ?? 0}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-zinc-100 font-medium tabular-nums">
                                                    {driver.maxActiveOrders ?? 2}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openSettingsModal(driver)}
                                                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                                                        title="Settings"
                                                    >
                                                        <Settings2 size={15} />
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => { setDeleteTarget(driver); setShowDeleteModal(true); }}
                                                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Settings Modal */}
            {showSettingsModal && settingsTarget && (
                <Modal
                    isOpen={showSettingsModal}
                    onClose={() => { setShowSettingsModal(false); setSettingsTarget(null); }}
                    title={`Driver Settings`}
                >
                    <form onSubmit={handleSettingsSubmit} className="space-y-5">
                        {/* Driver identity header */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-sm font-medium text-violet-300 shrink-0">
                                {settingsTarget.firstName[0]}{settingsTarget.lastName[0]}
                            </div>
                            <div>
                                <div className="font-medium text-zinc-100">{settingsTarget.firstName} {settingsTarget.lastName}</div>
                                <div className="text-xs text-zinc-500">{settingsTarget.email}</div>
                            </div>
                        </div>

                        {settingsError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <AlertCircle size={14} className="shrink-0" />
                                {settingsError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5">
                                    <Percent size={13} className="text-zinc-500" />
                                    Commission Percentage
                                </label>
                                <p className="text-xs text-zinc-500 mb-2">Platform deducts this % from each delivery fee earned.</p>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={settingsForm.commissionPercentage}
                                    onChange={(e) => setSettingsForm(f => ({ ...f, commissionPercentage: e.target.value }))}
                                    placeholder="e.g. 10"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5">
                                    <Layers size={13} className="text-zinc-500" />
                                    Max Active Orders
                                </label>
                                <p className="text-xs text-zinc-500 mb-2">Maximum simultaneous orders this driver can accept.</p>
                                <Input
                                    type="number"
                                    min="1"
                                    max="99"
                                    step="1"
                                    value={settingsForm.maxActiveOrders}
                                    onChange={(e) => setSettingsForm(f => ({ ...f, maxActiveOrders: e.target.value }))}
                                    placeholder="e.g. 2"
                                />
                            </div>
                        </div>

                        <label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 cursor-pointer transition-colors hover:bg-sky-500/10">
                            <input
                                type="checkbox"
                                checked={settingsForm.isDemoAccount}
                                onChange={(e) => setSettingsForm(f => ({ ...f, isDemoAccount: e.target.checked }))}
                                className="mt-0.5 h-4 w-4 accent-sky-500 rounded cursor-pointer"
                            />
                            <div>
                                <div className="text-sm font-medium text-sky-200">Demo / App Review driver</div>
                                <p className="text-xs text-sky-300/60 mt-0.5">Used by the automatic review flow when assigning demo deliveries.</p>
                            </div>
                        </label>

                        <div className="flex gap-3 pt-1">
                            <Button type="submit" className="flex-1">Save Settings</Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowSettingsModal(false); setSettingsTarget(null); }}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Create Modal */}
            {showCreateModal && isSuperAdmin && (
                <Modal isOpen={showCreateModal} onClose={handleCloseCreateModal} title="Add New Driver">
                    <form onSubmit={handleCreateSubmit} className="space-y-5">
                        {formError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <AlertCircle size={14} className="shrink-0" />
                                {formError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="First Name"
                                type="text"
                                value={createForm.firstName}
                                onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                                placeholder="John"
                                required
                            />
                            <Input
                                label="Last Name"
                                type="text"
                                value={createForm.lastName}
                                onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                                placeholder="Doe"
                                required
                            />
                        </div>
                        <Input
                            label="Email"
                            type="email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="john@example.com"
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={createForm.password}
                            onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="••••••••"
                            required
                        />
                        <label className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 cursor-pointer transition-colors hover:bg-sky-500/10">
                            <input
                                type="checkbox"
                                checked={createForm.isDemoAccount}
                                onChange={(e) => setCreateForm(f => ({ ...f, isDemoAccount: e.target.checked }))}
                                className="mt-0.5 h-4 w-4 accent-sky-500 rounded cursor-pointer"
                            />
                            <div>
                                <div className="text-sm font-medium text-sky-200">Create as Demo / Review driver</div>
                                <p className="text-xs text-sky-300/60 mt-0.5">This driver can be selected for automatic App Review delivery progression.</p>
                            </div>
                        </label>
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" variant="success" className="flex-1">Create Driver</Button>
                            <Button type="button" onClick={handleCloseCreateModal} variant="outline" className="flex-1">Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deleteTarget && (
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                    title="Delete Driver"
                >
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                <Trash2 size={16} className="text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-300">
                                    Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget.firstName} {deleteTarget.lastName}</span>?
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={confirmDelete} variant="danger" className="flex-1">Delete Driver</Button>
                            <Button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} variant="outline" className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ─── Sub-components ─── */

function ConnectionBadge({ status }: { status: string }) {
    const config: Record<string, { variant: "success" | "warning" | "danger" | "secondary"; icon: typeof Signal }> = {
        CONNECTED: { variant: "success", icon: Signal },
        STALE: { variant: "warning", icon: Signal },
        LOST: { variant: "danger", icon: Signal },
        DISCONNECTED: { variant: "secondary", icon: Signal },
    };
    const { variant, icon: Icon } = config[status] ?? config.DISCONNECTED;

    return (
        <Badge variant={variant} className="gap-1">
            <Icon size={10} />
            {status.charAt(0) + status.slice(1).toLowerCase()}
        </Badge>
    );
}

function BatteryIndicator({ connection }: { connection?: DriverItem["driverConnection"] }) {
    if (!connection?.batteryOptIn || connection.batteryLevel == null) {
        return <span className="text-xs text-zinc-600">—</span>;
    }

    const level = connection.batteryLevel;
    const isCharging = connection.isCharging;

    let Icon = BatteryMedium;
    let color = "text-emerald-400";
    if (isCharging) {
        Icon = BatteryCharging;
        color = "text-blue-400";
    } else if (level < 20) {
        Icon = BatteryLow;
        color = "text-red-400";
    }

    return (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
            <Icon size={14} />
            <span className="tabular-nums">{level}%</span>
        </div>
    );
}
