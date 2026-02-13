"use client";

import { useState, FormEvent } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import { CREATE_USER_MUTATION, DELETE_USER_MUTATION } from "@/graphql/operations/users/mutations";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Plus, Signal, AlertCircle } from "lucide-react";

interface DriverItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phoneNumber?: string;
    address?: string;
    imageUrl?: string;
    isOnline?: boolean;
    driverConnection?: {
        onlinePreference: boolean;
        connectionStatus: "CONNECTED" | "DISCONNECTED";
        lastLocationUpdate?: string;
    };
}

interface DriversResponse {
    drivers: DriverItem[];
}

interface BusinessItem {
    id: string;
    name: string;
}

interface BusinessesResponse {
    businesses: BusinessItem[];
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
    const { data: businessesData } = useQuery<BusinessesResponse>(GET_BUSINESSES);

    // Subscribe to real-time driver updates
    useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, {
        onData: ({ data: subData }) => {
            if (subData?.data?.driversUpdated) {
                // Refetch drivers to get updated list
                refetch();
            }
        },
    });

    const [createDriver] = useMutation<CreateUserResponse>(CREATE_USER_MUTATION, {
        onCompleted: () => {
            refetch();
            handleCloseModal();
        },
    });

    const [deleteDriver] = useMutation(DELETE_USER_MUTATION, {
        onCompleted: () => {
            refetch();
        },
    });

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedDriverForDelete, setSelectedDriverForDelete] = useState<DriverItem | null>(null);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({ email: "", password: "", firstName: "", lastName: "" });
        setFormError("");
        setFormSuccess("");
    };

    const handleDelete = async (driver: DriverItem) => {
        setSelectedDriverForDelete(driver);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedDriverForDelete) return;

        try {
            await deleteDriver({ variables: { id: selectedDriverForDelete.id } });
            setFormSuccess("Driver deleted successfully");
            setTimeout(() => setFormSuccess(""), 3000);
            setShowDeleteModal(false);
            setSelectedDriverForDelete(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to delete driver");
            setTimeout(() => setFormError(""), 3000);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
            setFormError("All fields are required");
            return;
        }

        try {
            const { data: created } = await createDriver({
                variables: {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    role: "DRIVER",
                },
            });

            if (created && created.createUser) {
                setFormSuccess(created.createUser.message || "Driver created successfully");
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to create driver");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const getConnectionStatusColor = (status?: "CONNECTED" | "DISCONNECTED") => {
        switch (status) {
            case "CONNECTED":
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
            case "DISCONNECTED":
                return "bg-red-500/10 text-red-400 border-red-500/30";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/30";
        }
    };

    const getOnlinePreferenceColor = (preferred?: boolean) => {
        return preferred
            ? "bg-blue-500/10 text-blue-400"
            : "bg-gray-500/10 text-gray-400";
    };

    return (
        <div className="text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Drivers</h1>
                    <p className="text-gray-400 mt-1">Manage driver accounts and track connection status.</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                        <Plus size={18} />
                        Create Driver
                    </Button>
                )}
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm mb-4">
                    {error.message}
                </div>
            )}

            {formSuccess && (
                <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 text-emerald-300 text-sm mb-4">
                    {formSuccess}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {loading ? (
                    <p className="text-gray-400 p-6">Loading drivers...</p>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Phone</Th>
                                <Th>Online Preference</Th>
                                <Th>Connection Status</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.drivers?.map((driver) => {
                                const driverConn = driver.driverConnection;
                                const connectionStatus = driverConn?.connectionStatus || "DISCONNECTED";
                                const onlinePreference = driverConn?.onlinePreference ?? driver.isOnline ?? false;

                                return (
                                    <tr key={driver.id}>
                                        <Td>
                                            <div className="font-medium text-white">
                                                {`${driver.firstName} ${driver.lastName}`}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-gray-300">{driver.email}</div>
                                        </Td>
                                        <Td>
                                            <div className="text-gray-300">{driver.phoneNumber || "-"}</div>
                                        </Td>
                                        <Td>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getOnlinePreferenceColor(onlinePreference)}`}>
                                                {onlinePreference ? "🟢 Online" : "🔴 Offline"}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getConnectionStatusColor(connectionStatus)}`}>
                                                <Signal size={12} />
                                                {connectionStatus === "CONNECTED" ? "Connected" : "Disconnected"}
                                            </span>
                                        </Td>
                                        <Td>
                                            {isSuperAdmin && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(driver)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 size={14} className="mr-1" />
                                                    Delete
                                                </Button>
                                            )}
                                        </Td>
                                    </tr>
                                );
                            })}
                            {!data?.drivers?.length && (
                                <tr>
                                    <Td colSpan={6}>
                                        <div className="text-center text-gray-500 py-8">
                                            No drivers found.
                                        </div>
                                    </Td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                )}
            </div>

            {showModal && isSuperAdmin && (
                <Modal
                    open={showModal}
                    onClose={handleCloseModal}
                    title="Create New Driver"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                                {formError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                                <Input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                                <Input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                            <Input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                            <Input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                Create Driver
                            </Button>
                            <Button type="button" onClick={handleCloseModal} variant="outline" className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {showDeleteModal && selectedDriverForDelete && (
                <Modal
                    open={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setSelectedDriverForDelete(null);
                    }}
                    title="Confirm Delete"
                >
                    <div className="space-y-4">
                        <p className="text-gray-300">
                            Are you sure you want to delete driver{" "}
                            <span className="font-semibold">
                                {selectedDriverForDelete.firstName} {selectedDriverForDelete.lastName}
                            </span>
                            ?
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={confirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                Delete
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedDriverForDelete(null);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
