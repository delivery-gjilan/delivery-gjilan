"use client";

import { useState, FormEvent, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { USERS_QUERY } from "@/graphql/operations/users/queries";
import { CREATE_USER_MUTATION, UPDATE_USER_MUTATION, DELETE_USER_MUTATION } from "@/graphql/operations/users/mutations";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { Pencil, Trash2, Building2, UserCog, AlertCircle } from "lucide-react";

interface UserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
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

export default function AdminsPage() {
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

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserItem | null>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<string>("all");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "BUSINESS_ADMIN",
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

    const handleDelete = async (admin: UserItem) => {
        if (admin.role === 'SUPER_ADMIN') return;
        setSelectedUserForDelete(admin);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedUserForDelete) return;

        try {
            await deleteUser({ variables: { id: selectedUserForDelete.id } });
            setFormSuccess("Admin deleted successfully");
            setTimeout(() => setFormSuccess(""), 3000);
            setShowDeleteModal(false);
            setSelectedUserForDelete(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to delete admin");
            setTimeout(() => setFormError(""), 3000);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ email: "", password: "", firstName: "", lastName: "", role: "BUSINESS_ADMIN", businessId: "" });
        setFormError("");
        setFormSuccess("");
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        try {
            if (editingUser) {
                // Update existing admin
                await updateUser({
                    variables: {
                        id: editingUser.id,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        role: formData.role,
                        businessId: formData.role === 'BUSINESS_ADMIN' ? formData.businessId : null,
                    },
                });
                setFormSuccess("Admin updated successfully");
                setTimeout(() => {
                    handleCloseModal();
                }, 1000);
            } else {
                // Create new admin
                const { data: created } = await createUser({
                    variables: {
                        email: formData.email,
                        password: formData.password,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        role: formData.role,
                        businessId: formData.role === 'BUSINESS_ADMIN' ? formData.businessId : null,
                    },
                });

                if (created && created.createUser) {
                    setFormSuccess(created.createUser.message || "Admin created successfully");
                    handleCloseModal();
                }
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to " + (editingUser ? "update" : "create") + " admin");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Filter business admins and super admins
    const admins = useMemo(() => {
        if (!data?.users) return [];
        
        let filtered = data.users.filter(user => user.role === "BUSINESS_ADMIN" || user.role === "SUPER_ADMIN");
        
        // Apply business filter (only applies to business admins)
        if (selectedBusiness !== "all") {
            filtered = filtered.filter(user => 
                user.role === "SUPER_ADMIN" || user.business?.id === selectedBusiness
            );
        }
        
        return filtered;
    }, [data?.users, selectedBusiness]);

    if (loading) return <div className="text-white p-8">Loading admins...</div>;
    if (error) return <div className="text-red-500 p-8">Error loading admins: {error.message}</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admins</h1>
                    <p className="text-gray-400">Manage business and super administrators</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowModal(true)}>
                        <UserCog size={18} className="mr-2" />
                        Add Admin
                    </Button>
                )}
            </div>

            {/* Business Filter */}
            <div className="mb-6 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-300">Filter by Business:</label>
                <Select 
                    value={selectedBusiness} 
                    onChange={(e) => setSelectedBusiness(e.target.value)}
                    className="w-64"
                >
                    <option value="all">All Businesses</option>
                    {businessesData?.businesses?.map((business) => (
                        <option key={business.id} value={business.id}>
                            {business.name}
                        </option>
                    ))}
                </Select>
                <span className="text-sm text-gray-400">
                    ({admins.length} admin{admins.length !== 1 ? 's' : ''})
                </span>
            </div>

            {formSuccess && (
                <div className="mb-4 bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-300 text-sm">
                    {formSuccess}
                </div>
            )}

            {formError && (
                <div className="mb-4 bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
                    {formError}
                </div>
            )}

            <Table>
                <thead>
                    <tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Role</Th>
                        <Th>Business</Th>
                        {isSuperAdmin && <Th>Actions</Th>}
                    </tr>
                </thead>
                <tbody>
                    {admins.map((admin) => (
                        <tr key={admin.id}>
                            <Td>
                                <div className="font-medium text-white">
                                    {`${admin.firstName} ${admin.lastName}`}
                                </div>
                            </Td>
                            <Td>
                                <div className="text-gray-300">{admin.email}</div>
                            </Td>
                            <Td>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                    admin.role === 'SUPER_ADMIN' 
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                }`}>
                                    {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Business Admin'}
                                </span>
                            </Td>
                            <Td>
                                {admin.business ? (
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <Building2 size={16} />
                                        <span className="text-sm">{admin.business.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-500 text-sm">No business assigned</span>
                                )}
                            </Td>
                            {isSuperAdmin && (
                                <Td>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(admin)}
                                            disabled={updating}
                                            className="text-cyan-400 hover:text-cyan-300"
                                        >
                                            <Pencil size={14} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(admin)}
                                            disabled={deleting || admin.role === 'SUPER_ADMIN'}
                                            className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={admin.role === 'SUPER_ADMIN' ? 'Cannot delete super admins' : ''}
                                        >
                                            <Trash2 size={14} className="mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </Td>
                            )}
                        </tr>
                    ))}
                    {admins.length === 0 && (
                        <tr>
                            <Td colSpan={isSuperAdmin ? 5 : 4}>
                                <div className="text-center text-gray-500 py-8">
                                    {selectedBusiness === "all" 
                                        ? "No business admins found." 
                                        : "No admins found for this business."}
                                </div>
                            </Td>
                        </tr>
                    )}
                </tbody>
            </Table>

            {/* Modal for Create/Edit Admin */}
            {showModal && (
                <Modal isOpen={showModal} onClose={handleCloseModal} title={editingUser ? "Edit Admin" : "Add Admin"}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Admin Type *</label>
                            <Select name="role" value={formData.role} onChange={handleInputChange} required>
                                <option value="BUSINESS_ADMIN">Business Admin</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </Select>
                        </div>

                        {formData.role === 'BUSINESS_ADMIN' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Business *</label>
                                <Select name="businessId" value={formData.businessId} onChange={handleInputChange} required>
                                    <option value="">Select a business</option>
                                    {businessesData?.businesses?.map((business) => (
                                        <option key={business.id} value={business.id}>
                                            {business.name}
                                        </option>
                                    ))}
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">Required for Business Admin</p>
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
                                placeholder="admin@example.com"
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
                                {(creating || updating) ? (editingUser ? "Updating..." : "Creating...") : (editingUser ? "Update Admin" : "Create Admin")}
                            </Button>
                        </div>
                    </form>
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
                                {deleting ? "Deleting..." : "Delete Admin"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
