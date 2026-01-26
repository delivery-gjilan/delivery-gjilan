"use client";

import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { USERS_QUERY } from "@/graphql/operations/users/queries";
import { CREATE_USER_MUTATION, UPDATE_USER_MUTATION, DELETE_USER_MUTATION, UPDATE_USER_NOTE_MUTATION } from "@/graphql/operations/users/mutations";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Building2, Flag, MessageSquare, AlertCircle } from "lucide-react";

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
    const [selectedUserForNote, setSelectedUserForNote] = useState<UserItem | null>(null);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserItem | null>(null);
    const [noteInput, setNoteInput] = useState("");
    const [flagColor, setFlagColor] = useState("yellow");
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
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

    // Filter to show only customers and drivers
    const filteredUsers = data?.users?.filter(user => user.role === 'CUSTOMER' || user.role === 'DRIVER') || [];

    return (
        <div className="text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Users</h1>
                    <p className="text-gray-400 mt-1">View and manage customers and drivers.</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700">
                        Create User
                    </Button>
                )}
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
                                        {isSuperAdmin && (
                                            <div className="flex items-center gap-2">
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
                                            </div>
                                        )}
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
                    open={showModal}
                    onClose={handleCloseModal}
                    title={editingUser ? "Edit User" : "Create User"}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">User Type *</label>
                            <Select name="role" value={formData.role} onChange={handleInputChange} required>
                                <option value="CUSTOMER">Customer</option>
                                <option value="DRIVER">Driver</option>
                            </Select>
                        </div>

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
                                {(creating || updating) ? (editingUser ? "Updating..." : "Creating...") : (editingUser ? "Update User" : "Create User")}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Note Modal */}
            {showNoteModal && selectedUserForNote && (
                <Modal 
                    open={showNoteModal} 
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
                    open={showDeleteModal} 
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
        </div>
    );
}
