"use client";

import { useState, FormEvent, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { USERS_QUERY, USER_BEHAVIOR_QUERY } from "@/graphql/operations/users/queries";
import { CREATE_USER_MUTATION, UPDATE_USER_MUTATION, DELETE_USER_MUTATION, UPDATE_USER_NOTE_MUTATION } from "@/graphql/operations/users/mutations";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Flag, AlertCircle } from "lucide-react";

interface UserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phoneNumber?: string;
    address?: string;
    adminNote?: string;
    flagColor?: string;
    business?: {
        id: string;
        name: string;
    };
}

interface BusinessItem {
    id: string;
    name: string;
}

interface UsersResponse {
    users: UserItem[];
}

interface BusinessesResponse {
    businesses: BusinessItem[];
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
        quantityInStock: number;
        quantityNeeded: number;
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
    dropOffLocation: {
        address: string;
    };
    businesses: OrderBusinessItem[];
    user?: {
        id: string;
    };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

interface OrdersResponse {
    orders: OrderItem[];
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

export default function UsersPage() {
    const { admin } = useAuth();
    const isSuperAdmin = admin?.role === "SUPER_ADMIN";


    const { data, loading, error, refetch } = useQuery<UsersResponse>(USERS_QUERY);
    const { data: businessesData } = useQuery<BusinessesResponse>(GET_BUSINESSES);
    const [createUser, { loading: creating }] = useMutation<CreateUserResponse>(CREATE_USER_MUTATION, {
        onCompleted: () => {
            refetch();
        },
    });
    
    const [updateUser, { loading: updating }] = useMutation(UPDATE_USER_MUTATION, {
        onCompleted: () => {
            refetch();
        },
    });
    
    const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER_MUTATION, {
        onCompleted: () => {
            refetch();
        },
    });

    const [updateUserNote] = useMutation(UPDATE_USER_NOTE_MUTATION, {
        onCompleted: () => {
            refetch();
        },
    });

    const [showModal, setShowModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
    const [selectedUserForNote, setSelectedUserForNote] = useState<UserItem | null>(null);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserItem | null>(null);
    const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserItem | null>(null);
    const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderItem | null>(null);
    const [noteInput, setNoteInput] = useState("");
    const [flagColor, setFlagColor] = useState("yellow");
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "CUSTOMER",
        businessId: "",
    });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const { data: ordersData, loading: ordersLoading, error: ordersError } = useQuery<OrdersResponse>(GET_ORDERS, {
        skip: !showHistoryModal,
    });

    const handleEdit = (user: UserItem) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: "",
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            businessId: user.business?.id || "",
        });
        setShowModal(true);
    };

    const handleDelete = async (user: UserItem) => {
        setSelectedUserForDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedUserForDelete) return;

        try {
            await deleteUser({ variables: { id: selectedUserForDelete.id } });
            setFormSuccess("User deleted successfully");
            setTimeout(() => setFormSuccess(""), 3000);
            setShowDeleteModal(false);
            setSelectedUserForDelete(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to delete user");
            setTimeout(() => setFormError(""), 3000);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ email: "", password: "", firstName: "", lastName: "", role: "CUSTOMER", businessId: "" });
        setFormError("");
        setFormSuccess("");
    };

    const handleOpenNoteModal = (user: UserItem) => {
        setSelectedUserForNote(user);
        setNoteInput(user.adminNote || "");
        setFlagColor(user.flagColor || "yellow");
        setShowNoteModal(true);
    };

    const handleCloseNoteModal = () => {
        setShowNoteModal(false);
        setSelectedUserForNote(null);
        setNoteInput("");
    };

    const handleOpenHistoryModal = (user: UserItem) => {
        setSelectedUserForHistory(user);
        setShowHistoryModal(true);
    };

    const handleCloseHistoryModal = () => {
        setShowHistoryModal(false);
        setSelectedUserForHistory(null);
        setShowOrderDetailsModal(false);
        setSelectedOrderForDetails(null);
    };

    const handleOpenOrderDetails = (order: OrderItem) => {
        setSelectedOrderForDetails(order);
        setShowOrderDetailsModal(true);
    };

    const handleCloseOrderDetails = () => {
        setShowOrderDetailsModal(false);
        setSelectedOrderForDetails(null);
    };

    const handleSaveNote = async () => {
        if (!selectedUserForNote) return;

        try {
            await updateUserNote({
                variables: {
                    userId: selectedUserForNote.id,
                    note: noteInput.trim() || null,
                    flagColor: noteInput.trim() ? flagColor : null,
                },
            });
            handleCloseNoteModal();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update note");
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        try {
            if (editingUser) {
                // Update existing user
                await updateUser({
                    variables: {
                        id: editingUser.id,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        role: formData.role,
                        businessId: formData.businessId || null,
                    },
                });
                setFormSuccess("User updated successfully");
                setTimeout(() => {
                    handleCloseModal();
                }, 1000);
            } else {
                // Create new user
                const { data: created } = await createUser({
                    variables: {
                        email: formData.email,
                        password: formData.password,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        role: formData.role,
                        businessId: formData.businessId || null,
                    },
                });

                if (created && created.createUser) {
                    setFormSuccess(created.createUser.message || "User created successfully");
                    handleCloseModal();
                }
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to " + (editingUser ? "update" : "create") + " user");
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
            case 'BUSINESS_ADMIN':
                return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
            case 'DRIVER':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            case 'CUSTOMER':
                return 'bg-green-500/10 text-green-400 border-green-500/30';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const formatDate = (value?: string | null) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleString();
    };

    const formatCurrency = (value?: number | null) => {
        if (value === null || value === undefined) return "-";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatDuration = (ms: number) => {
        if (!Number.isFinite(ms) || ms <= 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [] as string[];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(" ");
    };

    const getOrderDuration = (order: OrderItem) => {
        const start = new Date(order.orderDate).getTime();
        if (Number.isNaN(start)) return "-";
        const end = order.status === "DELIVERED" ? new Date(order.updatedAt).getTime() : Date.now();
        if (Number.isNaN(end)) return "-";
        const ms = Math.max(0, end - start);
        return formatDuration(ms);
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "DELIVERED":
                return "bg-green-500/10 text-green-400 border-green-500/30";
            case "CANCELLED":
                return "bg-red-500/10 text-red-400 border-red-500/30";
            case "OUT_FOR_DELIVERY":
                return "bg-blue-500/10 text-blue-400 border-blue-500/30";
            case "READY":
                return "bg-amber-500/10 text-amber-400 border-amber-500/30";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/30";
        }
    };

    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Filter to show only customers (drivers are managed in Drivers section)
    const filteredUsers = useMemo(() => {
        const customers = data?.users?.filter(user => user.role === 'CUSTOMER') || [];
        if (!normalizedSearch) return customers;
        return customers.filter((user) => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            return (
                fullName.includes(normalizedSearch) ||
                user.email.toLowerCase().includes(normalizedSearch) ||
                (user.phoneNumber || "").toLowerCase().includes(normalizedSearch)
            );
        });
    }, [data?.users, normalizedSearch]);

    const { data: behaviorData, loading: behaviorLoading, error: behaviorError } = useQuery<UserBehaviorResponse>(
        USER_BEHAVIOR_QUERY,
        {
            variables: { userId: selectedUserForHistory?.id || "" },
            skip: !showHistoryModal || !selectedUserForHistory || !isSuperAdmin,
        },
    );

    const userOrders = useMemo(() => {
        if (!selectedUserForHistory) return [];
        const orders = ordersData?.orders || [];
        return orders
            .filter((order) => order.user?.id === selectedUserForHistory.id)
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [ordersData?.orders, selectedUserForHistory]);

    return (
        <div className="text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Users</h1>
                    <p className="text-gray-400 mt-1">Manage customer accounts. To manage drivers, go to the Drivers section.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-64">
                        <Input
                            name="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search users by name, email, phone"
                        />
                    </div>
                    {isSuperAdmin && (
                        <Button onClick={() => {setShowModal(true); console.log("qap")}} className="bg-blue-600 hover:bg-blue-700">
                            Create Customer
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm mb-4">
                    {error.message}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {loading ? (
                    <p className="text-gray-400 p-6">Loading users...</p>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Phone Number</Th>
                                <Th>Address</Th>
                                <Th>Flag/Note</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={user.adminNote ? (user.flagColor === 'red' ? 'bg-red-900/10' : 'bg-amber-900/10') : ''}>
                                    <Td>
                                        <div className="font-medium text-white">
                                            {`${user.firstName} ${user.lastName}`}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="text-gray-300">{user.email}</div>
                                    </Td>
                                    <Td>
                                        <div className="text-gray-300">{user.phoneNumber || '-'}</div>
                                    </Td>
                                    <Td>
                                        <div className="text-gray-300 max-w-xs truncate">{user.address || '-'}</div>
                                    </Td>
                                    <Td>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenNoteModal(user)}
                                            className={`${
                                                user.adminNote 
                                                    ? (user.flagColor === 'red' ? "text-red-400 hover:text-red-300 border-red-500/30" : "text-amber-400 hover:text-amber-300 border-amber-500/30")
                                                    : "text-gray-400 hover:text-gray-300"
                                            }`}
                                        >
                                            {user.adminNote ? (
                                                <>
                                                    <AlertCircle size={14} className="mr-1" />
                                                    Flagged
                                                </>
                                            ) : (
                                                <>
                                                    <Flag size={14} className="mr-1" />
                                                    Add Note
                                                </>
                                            )}
                                        </Button>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenHistoryModal(user)}
                                                className="text-blue-400 hover:text-blue-300"
                                            >
                                                View History
                                            </Button>
                                            {isSuperAdmin && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(user)}
                                                        disabled={updating}
                                                        className="text-cyan-400 hover:text-cyan-300"
                                                    >
                                                        <Pencil size={14} className="mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(user)}
                                                        disabled={deleting}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 size={14} className="mr-1" />
                                                        Delete
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </Td>
                                </tr>
                            ))}
                            {!filteredUsers.length && (
                                <tr>
                                    <Td colSpan={6}>
                                        <div className="text-center text-gray-500 py-8">
                                            No users found.
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
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    title={editingUser ? "Edit User" : "Create Customer"}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="hidden" name="role" value="CUSTOMER" />

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
                                placeholder="user@example.com"
                                required
                                disabled={!!editingUser}
                            />
                            {editingUser && (
                                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password {editingUser ? "(leave blank to keep current)" : "*"}
                            </label>
                            <Input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Password"
                                required={!editingUser}
                                minLength={6}
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                        </div>

                        {formError && (
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                                {formError}
                            </div>
                        )}

                        {formSuccess && (
                            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-300 text-sm">
                                {formSuccess}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-2">
                            <Button
                                type="button"
                                onClick={handleCloseModal}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={creating || updating}
                            >
                                {(creating || updating) ? (editingUser ? "Updating..." : "Creating...") : (editingUser ? "Update Customer" : "Create Customer")}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Note Modal */}
            {showNoteModal && selectedUserForNote && (
                <Modal 
                    isOpen={showNoteModal} 
                    onClose={handleCloseNoteModal} 
                    title={`Flag/Note for ${selectedUserForNote.firstName} ${selectedUserForNote.lastName}`}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Admin Note
                            </label>
                            <textarea
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder="Add a note about this user (e.g., bad behavior, warnings, etc.)"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                                rows={5}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                {noteInput.trim() ? "This user will be flagged with your note." : "Leave blank to remove flag."}
                            </p>
                        </div>

                        {noteInput.trim() && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Highlight Color
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFlagColor('yellow')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                            flagColor === 'yellow'
                                                ? 'border-amber-500 bg-amber-900/30'
                                                : 'border-gray-700 bg-gray-800 hover:border-amber-500/50'
                                        }`}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                                        <span className="text-sm text-gray-300">Yellow (Warning)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFlagColor('red')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                            flagColor === 'red'
                                                ? 'border-red-500 bg-red-900/30'
                                                : 'border-gray-700 bg-gray-800 hover:border-red-500/50'
                                        }`}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                        <span className="text-sm text-gray-300">Red (Critical)</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedUserForNote.adminNote && (
                            <div className={`${selectedUserForNote.flagColor === 'red' ? 'bg-red-900/20 border-red-800' : 'bg-amber-900/20 border-amber-800'} border rounded-lg p-3`}>
                                <div className="flex items-start gap-2">
                                    <AlertCircle size={16} className={`${selectedUserForNote.flagColor === 'red' ? 'text-red-400' : 'text-amber-400'} mt-0.5 flex-shrink-0`} />
                                    <div className={`text-sm ${selectedUserForNote.flagColor === 'red' ? 'text-red-300' : 'text-amber-300'}`}>
                                        <strong>Current Note:</strong>
                                        <p className="mt-1">{selectedUserForNote.adminNote}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-2">
                            <Button
                                type="button"
                                onClick={handleCloseNoteModal}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveNote}
                                className={noteInput.trim() ? "bg-amber-600 hover:bg-amber-700" : ""}
                            >
                                {noteInput.trim() ? "Save Flag" : "Remove Flag"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUserForDelete && (
                <Modal 
                    isOpen={showDeleteModal} 
                    onClose={() => setShowDeleteModal(false)} 
                    title="Confirm Delete"
                >
                    <div className="space-y-4">
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-red-300 font-semibold mb-2">Are you sure?</h3>
                                    <p className="text-gray-300 text-sm">
                                        You are about to delete <strong>{selectedUserForDelete.firstName} {selectedUserForDelete.lastName}</strong> ({selectedUserForDelete.email}).
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <Button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {deleting ? "Deleting..." : "Delete User"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* User History Modal */}
            {showHistoryModal && selectedUserForHistory && (
                <Modal
                    isOpen={showHistoryModal}
                    onClose={handleCloseHistoryModal}
                    title={`Order history for ${selectedUserForHistory.firstName} ${selectedUserForHistory.lastName}`}
                >
                    <div className="space-y-6">
                        {isSuperAdmin ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-200 mb-3">Behavior Summary</h3>
                                {behaviorError && (
                                    <div className="text-sm text-red-300">{behaviorError.message}</div>
                                )}
                                {behaviorLoading ? (
                                    <div className="text-sm text-gray-400">Loading behavior...</div>
                                ) : behaviorData?.userBehavior ? (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-gray-800/60 rounded-lg p-3">
                                            <div className="text-gray-400">Total Orders</div>
                                            <div className="text-white font-semibold">
                                                {behaviorData.userBehavior.totalOrders}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/60 rounded-lg p-3">
                                            <div className="text-gray-400">Delivered Orders</div>
                                            <div className="text-white font-semibold">
                                                {behaviorData.userBehavior.deliveredOrders}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/60 rounded-lg p-3">
                                            <div className="text-gray-400">Cancelled Orders</div>
                                            <div className="text-white font-semibold">
                                                {behaviorData.userBehavior.cancelledOrders}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/60 rounded-lg p-3">
                                            <div className="text-gray-400">Total Spend</div>
                                            <div className="text-white font-semibold">
                                                {formatCurrency(behaviorData.userBehavior.totalSpend)}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/60 rounded-lg p-3">
                                            <div className="text-gray-400">Avg Order Value</div>
                                            <div className="text-white font-semibold">
                                                {formatCurrency(behaviorData.userBehavior.avgOrderValue)}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/60 rounded-lg p-3">
                                            <div className="text-gray-400">Last Delivered</div>
                                            <div className="text-white font-semibold">
                                                {formatDate(behaviorData.userBehavior.lastDeliveredAt)}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-400">No behavior data yet.</div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400">
                                Behavior summary is only available for super admins.
                            </div>
                        )}

                        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-gray-200">
                                Orders ({userOrders.length})
                            </div>
                            {ordersError && (
                                <div className="p-4 text-sm text-red-300">{ordersError.message}</div>
                            )}
                            {ordersLoading ? (
                                <div className="p-4 text-sm text-gray-400">Loading orders...</div>
                            ) : userOrders.length ? (
                                <div className="max-h-[360px] overflow-y-auto">
                                    <Table>
                                        <thead>
                                            <tr>
                                                <Th>Date</Th>
                                                <Th>Status</Th>
                                                <Th>Total</Th>
                                                <Th>Businesses</Th>
                                                <Th>Dropoff</Th>
                                                <Th>Actions</Th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userOrders.map((order) => (
                                                <tr key={order.id}>
                                                    <Td>{formatDate(order.orderDate)}</Td>
                                                    <Td>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${getStatusBadgeColor(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                    </Td>
                                                    <Td>{formatCurrency(order.totalPrice)}</Td>
                                                    <Td>
                                                        <div className="text-gray-300">
                                                            {order.businesses.map((b) => b.business.name).join(", ") || "-"}
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <div className="text-gray-400 max-w-xs truncate">
                                                            {order.dropOffLocation?.address || "-"}
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleOpenOrderDetails(order)}
                                                            className="text-blue-400 hover:text-blue-300"
                                                        >
                                                            View Details
                                                        </Button>
                                                    </Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="p-4 text-sm text-gray-400">No orders found for this user.</div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={handleCloseHistoryModal}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Order Details Modal */}
            {showOrderDetailsModal && selectedOrderForDetails && (
                <Modal
                    isOpen={showOrderDetailsModal}
                    onClose={handleCloseOrderDetails}
                    title="Order Details"
                >
                    <div className="space-y-5">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                            <div>
                                <div className="text-xs text-gray-400">Order ID</div>
                                <div className="font-mono text-sm text-white">{selectedOrderForDetails.id}</div>
                                <div className="text-xs text-gray-500 mt-1">{formatDate(selectedOrderForDetails.orderDate)}</div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs border ${getStatusBadgeColor(selectedOrderForDetails.status)}`}>
                                {selectedOrderForDetails.status}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                                <div className="text-xs text-gray-400 mb-2">Assigned Driver</div>
                                {selectedOrderForDetails.driver ? (
                                    <>
                                        <div className="text-white font-medium">
                                            {selectedOrderForDetails.driver.firstName} {selectedOrderForDetails.driver.lastName}
                                        </div>
                                        <div className="text-sm text-gray-400 mt-1">
                                            {selectedOrderForDetails.driver.email}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-neutral-500">No driver assigned</div>
                                )}
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                                <div className="text-xs text-gray-400 mb-2">Delivery</div>
                                <div className="text-sm text-white">
                                    {selectedOrderForDetails.dropOffLocation?.address || "-"}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    {selectedOrderForDetails.status === "DELIVERED" ? "Delivery time" : "Elapsed"}: {getOrderDuration(selectedOrderForDetails)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedOrderForDetails.businesses.map((biz, idx) => (
                                <div key={`${biz.business.id}-${idx}`} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-white">{biz.business.name}</div>
                                            {biz.business.businessType && (
                                                <div className="text-xs text-gray-500">{biz.business.businessType}</div>
                                            )}
                                        </div>
                                        {biz.business.phoneNumber && (
                                            <div className="text-xs text-gray-400">{biz.business.phoneNumber}</div>
                                        )}
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {biz.items.map((item) => (
                                            <div key={item.productId} className="flex items-center justify-between text-sm">
                                                <div className="text-gray-200">
                                                    {item.quantity}x {item.name}
                                                </div>
                                                <div className="text-gray-400">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Subtotal</span>
                                <span className="text-white">{formatCurrency(selectedOrderForDetails.orderPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Delivery Fee</span>
                                <span className="text-white">{formatCurrency(selectedOrderForDetails.deliveryPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-800">
                                <span className="text-white">Total</span>
                                <span className="text-blue-300">{formatCurrency(selectedOrderForDetails.totalPrice)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={handleCloseOrderDetails}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
