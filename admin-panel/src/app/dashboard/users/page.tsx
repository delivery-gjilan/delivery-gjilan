"use client";

import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { USERS_QUERY } from "@/graphql/operations/users/queries";
import { CREATE_USER_MUTATION } from "@/graphql/operations/users/mutations";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useAuth } from "@/lib/auth-context";

interface UserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
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

    const [showModal, setShowModal] = useState(false);
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

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        try {
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
                setShowModal(false);
                setFormData({ email: "", password: "", firstName: "", lastName: "", role: "CUSTOMER", businessId: "" });
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to create user");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="text-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Users</h1>
                    <p className="text-gray-400 mt-1">View and manage users.</p>
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

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                {loading ? (
                    <p className="text-gray-400">Loading users...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b border-gray-800">
                                    <th className="py-3 pr-4">Name</th>
                                    <th className="py-3 pr-4">Email</th>
                                    <th className="py-3 pr-4">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.users?.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-800/60">
                                        <td className="py-3 pr-4">{`${user.firstName} ${user.lastName}`}</td>
                                        <td className="py-3 pr-4 text-gray-300">{user.email}</td>
                                        <td className="py-3 pr-4">
                                            <span className="px-2 py-1 rounded bg-gray-800 text-xs uppercase tracking-wide">
                                                {user.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!data?.users?.length && (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-gray-500 text-center">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && isSuperAdmin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">Create User</h2>
                                <p className="text-gray-400 text-sm">Super admin can create users quickly.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white"
                                aria-label="Close create user modal"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">User Type *</label>
                                <Select name="role" value={formData.role} onChange={handleInputChange} required>
                                    <option value="CUSTOMER">Customer</option>
                                    <option value="DRIVER">Driver</option>
                                    <option value="BUSINESS_ADMIN">Business Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </Select>
                            </div>

                            {formData.role === "BUSINESS_ADMIN" && (
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
                                    <p className="text-xs text-gray-500 mt-1">Required for Business Admin role</p>
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
                                    placeholder="user@example.com"
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
                                    placeholder="Password"
                                    required
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
                                    onClick={() => setShowModal(false)}
                                    className="bg-gray-800 hover:bg-gray-700"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creating}
                                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
