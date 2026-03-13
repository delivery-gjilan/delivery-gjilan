"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useQuery, useMutation, useSubscription, useLazyQuery } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import { ADMIN_SEND_PTT_SIGNAL, GET_AGORA_RTC_CREDENTIALS } from "@/graphql/operations/users/ptt";
import {
    CREATE_USER_MUTATION,
    DELETE_USER_MUTATION,
    ADMIN_UPDATE_DRIVER_SETTINGS_MUTATION,
} from "@/graphql/operations/users/mutations";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { Trash2, Plus, Signal, Settings2, Mic, MicOff } from "lucide-react";
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

interface DriverItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
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

interface CreateUserResponse {
    createUser: {
        token: string;
        user: DriverItem;
        message: string;
    };
}

export default function DriversPage() {
    const { admin } = useAuth();
    const isSuperAdmin = admin?.role === "SUPER_ADMIN";

    const { data, loading, error, refetch } = useQuery<DriversResponse>(DRIVERS_QUERY);
    const [drivers, setDrivers] = useState<DriverItem[]>([]);

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
    const [sendPttSignal] = useMutation(ADMIN_SEND_PTT_SIGNAL);
    const [getAgoraCredentials] = useLazyQuery(GET_AGORA_RTC_CREDENTIALS, { fetchPolicy: 'no-cache' });

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ email: "", password: "", firstName: "", lastName: "" });

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DriverItem | null>(null);

    // Settings modal state
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsTarget, setSettingsTarget] = useState<DriverItem | null>(null);
    const [settingsForm, setSettingsForm] = useState({ commissionPercentage: "", maxActiveOrders: "" });
    const [settingsError, setSettingsError] = useState("");

    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
    const [isTalking, setIsTalking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [pttChannelName, setPttChannelName] = useState<string | null>(null);
    const [pttError, setPttError] = useState<string>("");
    const [activePttDriverIds, setActivePttDriverIds] = useState<string[]>([]);

    const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
    const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

    const selectedDrivers = drivers.filter((d) => selectedDriverIds.includes(d.id));
    const selectedConnectedDriverIds = selectedDrivers
        .filter((d) => d.driverConnection?.connectionStatus === 'CONNECTED')
        .map((d) => d.id);
    const selectedOfflineCount = selectedDrivers.length - selectedConnectedDriverIds.length;

    const ensureRtcClient = async () => {
        if (rtcClientRef.current) {
            return rtcClientRef.current;
        }

        const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
        await client.setClientRole('host');
        rtcClientRef.current = client;
        return client;
    };

    const stopTalking = async () => {
        const targetDriverIds = activePttDriverIds.length > 0 ? activePttDriverIds : selectedConnectedDriverIds;

        if (pttChannelName && targetDriverIds.length > 0) {
            try {
                await sendPttSignal({
                    variables: {
                        driverIds: targetDriverIds,
                        channelName: pttChannelName,
                        action: 'STOPPED',
                        muted: false,
                    },
                });
            } catch {
                // Ignore signaling errors during teardown.
            }
        }

        try {
            if (rtcClientRef.current && micTrackRef.current) {
                await rtcClientRef.current.unpublish([micTrackRef.current]);
            }
            micTrackRef.current?.stop();
            micTrackRef.current?.close();
            micTrackRef.current = null;
            if (rtcClientRef.current) {
                await rtcClientRef.current.leave();
            }
        } catch {
            // no-op
        }

        setIsTalking(false);
        setPttChannelName(null);
        setActivePttDriverIds([]);
    };

    const startTalking = async () => {
        if (isTalking) {
            return;
        }
        setPttError('');
        if (selectedConnectedDriverIds.length === 0) {
            setPttError('Select at least one connected driver to start PTT.');
            return;
        }

        const channelName = `ptt-${Date.now()}-${admin?.id || 'admin'}`;
        const targetDriverIds = [...selectedConnectedDriverIds];

        try {
            const credsResult = await getAgoraCredentials({
                variables: {
                    channelName,
                    role: 'PUBLISHER',
                },
            });

            const creds = credsResult.data?.getAgoraRtcCredentials;
            if (!creds) {
                throw new Error('Failed to get Agora credentials');
            }

            const client = await ensureRtcClient();
            const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await client.join(creds.appId, creds.channelName, creds.token, creds.uid);
            await client.publish([micTrack]);

            micTrackRef.current = micTrack;

            await sendPttSignal({
                variables: {
                    driverIds: targetDriverIds,
                    channelName,
                    action: 'STARTED',
                    muted: isMuted,
                },
            });

            setPttChannelName(channelName);
            setActivePttDriverIds(targetDriverIds);
            setIsTalking(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to start PTT session';
            setPttError(msg);
            await stopTalking();
        }
    };

    const handleToggleMute = async () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);

        if (micTrackRef.current) {
            await micTrackRef.current.setEnabled(!nextMuted);
        }

        const targetDriverIds = activePttDriverIds.length > 0 ? activePttDriverIds : selectedConnectedDriverIds;

        if (pttChannelName && targetDriverIds.length > 0) {
            await sendPttSignal({
                variables: {
                    driverIds: targetDriverIds,
                    channelName: pttChannelName,
                    action: nextMuted ? 'MUTE' : 'UNMUTE',
                    muted: nextMuted,
                },
            });
        }
    };

    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        setCreateForm({ email: "", password: "", firstName: "", lastName: "" });
        setFormError("");
    };

    const openSettingsModal = (driver: DriverItem) => {
        setSettingsTarget(driver);
        setSettingsForm({
            commissionPercentage: driver.commissionPercentage !== null && driver.commissionPercentage !== undefined
                ? String(driver.commissionPercentage) : "0",
            maxActiveOrders: driver.maxActiveOrders !== null && driver.maxActiveOrders !== undefined
                ? String(driver.maxActiveOrders) : "2",
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
                variables: { ...createForm, role: "DRIVER" as any },
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

    const getConnectionBadge = (status?: string) => {
        switch (status) {
            case "CONNECTED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
            case "STALE": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
            case "LOST": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
            default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
        }
    };

    useEffect(() => {
        return () => {
            stopTalking();
        };
    }, []);

    return (
        <div className="text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Drivers</h1>
                    <p className="text-gray-400 mt-1">Manage drivers, commissions, and capacity limits.</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                        <Plus size={18} />
                        Create Driver
                    </Button>
                )}
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300 text-sm mb-4">
                    {error.message}
                </div>
            )}
            {formSuccess && (
                <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-4 text-emerald-300 text-sm mb-4">
                    {formSuccess}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="border-b border-gray-800 p-4 bg-gray-900/80">
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                        <div>
                            <p className="text-white font-medium">Push-to-Talk (PTT)</p>
                            <p className="text-sm text-gray-400">
                                Selected drivers: {selectedDrivers.length} | Connected: {selectedConnectedDriverIds.length}
                                {selectedOfflineCount > 0 ? ` | Offline: ${selectedOfflineCount}` : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleToggleMute}
                                disabled={!isTalking}
                                className="text-yellow-300 border-yellow-700"
                            >
                                {isMuted ? <MicOff size={14} className="mr-1" /> : <Mic size={14} className="mr-1" />}
                                {isMuted ? 'Unmute' : 'Mute'}
                            </Button>
                            <Button
                                className={`${isTalking ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
                                onMouseDown={startTalking}
                                onMouseUp={stopTalking}
                                onMouseLeave={stopTalking}
                                onTouchStart={startTalking}
                                onTouchEnd={stopTalking}
                            >
                                <Mic size={16} className="mr-2" />
                                {isTalking ? 'Release To Stop' : 'Hold To Talk'}
                            </Button>
                        </div>
                    </div>
                    {pttError && (
                        <p className="text-red-300 text-sm mt-2">{pttError}</p>
                    )}
                </div>
                {loading ? (
                    <p className="text-gray-400 p-6">Loading drivers...</p>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Select</Th>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Phone</Th>
                                <Th>Status</Th>
                                <Th>Battery</Th>
                                <Th>Commission</Th>
                                <Th>Max Orders</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map((driver) => {
                                const conn = driver.driverConnection;
                                const status = conn?.connectionStatus ?? "DISCONNECTED";
                                const isOnline = conn?.onlinePreference ?? false;

                                return (
                                    <tr key={driver.id}>
                                        <Td>
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
                                                className="h-4 w-4 accent-emerald-500"
                                            />
                                        </Td>
                                        <Td>
                                            <div className="font-medium text-white">{driver.firstName} {driver.lastName}</div>
                                            <div className="mt-0.5">
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${isOnline ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-gray-500/10 text-gray-500 border-gray-700"}`}>
                                                    {isOnline ? "🟢 Online" : "⚫ Offline"}
                                                </span>
                                            </div>
                                        </Td>
                                        <Td><span className="text-gray-300">{driver.email}</span></Td>
                                        <Td><span className="text-gray-300">{driver.phoneNumber || "—"}</span></Td>
                                        <Td>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getConnectionBadge(status)}`}>
                                                <Signal size={11} />
                                                {status}
                                            </span>
                                        </Td>
                                        <Td>
                                            {conn?.batteryOptIn && conn?.batteryLevel != null ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${conn.batteryLevel < 20 ? 'bg-red-500/10 text-red-300 border-red-700' : 'bg-emerald-500/10 text-emerald-300 border-emerald-700'}`}>
                                                    {conn.isCharging ? 'Charging' : 'Battery'} {conn.batteryLevel}%
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">Not shared</span>
                                            )}
                                        </Td>
                                        <Td>
                                            <span className="text-white font-mono">
                                                {driver.commissionPercentage !== null && driver.commissionPercentage !== undefined
                                                    ? `${driver.commissionPercentage}%` : "0%"}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-white font-mono">{driver.maxActiveOrders ?? 2}</span>
                                        </Td>
                                        <Td>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openSettingsModal(driver)}
                                                    className="text-blue-400 hover:text-blue-300"
                                                >
                                                    <Settings2 size={14} className="mr-1" />
                                                    Settings
                                                </Button>
                                                {isSuperAdmin && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => { setDeleteTarget(driver); setShowDeleteModal(true); }}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 size={14} className="mr-1" />
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </Td>
                                    </tr>
                                );
                            })}
                            {!drivers.length && (
                                <tr>
                                    <Td colSpan={9}>
                                        <div className="text-center text-gray-500 py-8">No drivers found.</div>
                                    </Td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                )}
            </div>

            {/* Settings Modal */}
            {showSettingsModal && settingsTarget && (
                <Modal
                    isOpen={showSettingsModal}
                    onClose={() => { setShowSettingsModal(false); setSettingsTarget(null); }}
                    title={`Settings — ${settingsTarget.firstName} ${settingsTarget.lastName}`}
                >
                    <form onSubmit={handleSettingsSubmit} className="space-y-4">
                        {settingsError && (
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                                {settingsError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Commission Percentage (%)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Platform deducts this % from each delivery fee earned by the driver.</p>
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
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Max Active Orders
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Maximum simultaneous orders this driver can accept at once.</p>
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
                        <div className="flex gap-3 pt-2">
                            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Save Settings</Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowSettingsModal(false); setSettingsTarget(null); }}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Create Modal */}
            {showCreateModal && isSuperAdmin && (
                <Modal isOpen={showCreateModal} onClose={handleCloseCreateModal} title="Create New Driver">
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        {formError && (
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                                {formError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                                <Input type="text" value={createForm.firstName} onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))} placeholder="John" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                                <Input type="text" value={createForm.lastName} onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                            <Input type="email" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                            <Input type="password" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">Create Driver</Button>
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
                    title="Confirm Delete"
                >
                    <div className="space-y-4">
                        <p className="text-gray-300">
                            Delete driver <span className="font-semibold text-white">{deleteTarget.firstName} {deleteTarget.lastName}</span>? This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700">Delete</Button>
                            <Button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} variant="outline" className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
