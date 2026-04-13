"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import Select from "@/components/ui/Select";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import CategoriesBlock from "@/components/businesses/CategoriesBlock";
import SubcategoriesBlock from "@/components/businesses/SubcategoriesBlock";
import { useAuth } from "@/lib/auth-context";

interface Business {
    id: string;
    name: string;
    businessType: string;
}

interface GetBusinessesData {
    businesses: Business[];
}

export default function CategoriesPage() {
    const { admin } = useAuth();
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
    const isBusinessUser = admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE";
    const { data, loading } = useQuery<GetBusinessesData>(GET_BUSINESSES, {
        skip: isBusinessUser,
    });

    const businesses = data?.businesses || [];

    const effectiveBusinessId = useMemo(() => {
        if (isBusinessUser) {
            return admin?.businessId || "";
        }
        return selectedBusinessId;
    }, [admin?.businessId, isBusinessUser, selectedBusinessId]);

    useEffect(() => {
        if (isBusinessUser && admin?.businessId) {
            setSelectedBusinessId(admin.businessId);
        }
    }, [admin?.businessId, isBusinessUser]);

    if (loading) {
        return <p className="text-gray-400">Loading businesses...</p>;
    }

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Product Categories</h1>
            </div>

            {!isBusinessUser && (
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

            {/* Categories Display */}
            {effectiveBusinessId ? (
                <>
                    <CategoriesBlock businessId={effectiveBusinessId} />
                    <div className="mt-8">
                        <SubcategoriesBlock businessId={effectiveBusinessId} />
                    </div>
                </>
            ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <p className="text-gray-400">
                        {isBusinessUser
                            ? "No business is assigned to your account. Ask a super admin to assign your business first."
                            : "Please select a business to view and manage its product categories"}
                    </p>
                </div>
            )}
        </div>
    );
}
