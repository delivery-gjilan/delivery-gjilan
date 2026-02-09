"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import ProductsBlock from "@/components/businesses/ProductsBlock";
import { useAuth } from "@/lib/auth-context";

interface Business {
    id: string;
    name: string;
    businessType: string;
}

interface GetBusinessesData {
    businesses: Business[];
}

export default function ProductsPage() {
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
    const { admin } = useAuth();
    const isBusinessAdmin = admin?.role === "BUSINESS_ADMIN";
    const { data, loading } = useQuery<GetBusinessesData>(GET_BUSINESSES, {
        skip: isBusinessAdmin,
    });

    const businesses = data?.businesses || [];
    const effectiveBusinessId = useMemo(
        () => (isBusinessAdmin ? admin?.businessId ?? "" : selectedBusinessId),
        [admin?.businessId, isBusinessAdmin, selectedBusinessId]
    );

    if (loading) {
        return <p className="text-gray-400">Loading businesses...</p>;
    }

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Products</h1>
            </div>

            {/* Business Selector (Super Admin only) */}
            {!isBusinessAdmin && (
                <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Select a Business
                    </label>
                    <Select
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        className="max-w-md"
                    >
                        <option value="">-- Choose a business --</option>
                        {businesses.map((business) => (
                            <option key={business.id} value={business.id}>
                                {business.name} ({business.businessType})
                            </option>
                        ))}
                    </Select>
                </div>
            )}

            {/* Products Display */}
            {effectiveBusinessId ? (
                <ProductsBlock businessId={effectiveBusinessId} />
            ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <p className="text-gray-400">
                        {isBusinessAdmin
                            ? "Your business profile is missing a business ID."
                            : "Please select a business to view and manage its products"}
                    </p>
                </div>
            )}
        </div>
    );
}
