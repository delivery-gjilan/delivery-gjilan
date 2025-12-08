"use client";

import { useState, FormEvent } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_USER_MUTATION } from "@/graphql/operations/users/mutations";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

interface CreateUserResponse {
    createUser: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        message?: string;
    };
}

export default function UsersPage() {
    const [createUser, { loading: creating }] = useMutation<CreateUserResponse>(CREATE_USER_MUTATION);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "CUSTOMER",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const { data } = await createUser({
                variables: {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    role: formData.role,
                },
            });

            if (data && data.createUser) {
                setSuccess(
                    data.createUser.message ||
                    `User ${formData.firstName} ${formData.lastName} created successfully!`
                );
                // Reset form
                setFormData({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    role: "CUSTOMER",
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create user");
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="text-white">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Create User</h1>
                <p className="text-gray-400 mt-1">
                    Create new drivers or customers (Superadmin only)
                </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            User Type *
                        </label>
                        <Select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="CUSTOMER">Customer</option>
                            <option value="DRIVER">Driver</option>
                        </Select>
                    </div>

                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            First Name *
                        </label>
                        <Input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="John"
                            required
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Last Name *
                        </label>
                        <Input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="Doe"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email *
                        </label>
                        <Input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Password *
                        </label>
                        <Input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum 6 characters
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-green-300 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={creating}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                        {creating ? "Creating User..." : "Create User"}
                    </Button>
                </form>
            </div>

            {/* Info Section */}
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
                <h3 className="text-lg font-semibold mb-3">User Roles</h3>
                <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs font-medium">
                            CUSTOMER
                        </span>
                        <span>Regular users who can place orders</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs font-medium">
                            DRIVER
                        </span>
                        <span>Delivery drivers who can accept and complete orders</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
