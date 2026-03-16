"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
    const [businessSearch, setBusinessSearch] = useState("");
    const { admin } = useAuth();
    const isBusinessOwner = admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE";
    const { data, loading } = useQuery<GetBusinessesData>(GET_BUSINESSES, {
        skip: isBusinessOwner,
    });

    const businesses = data?.businesses || [];
    const filteredBusinesses = useMemo(() => {
        if (!businessSearch.trim()) return businesses;
        const query = businessSearch.toLowerCase();
        return businesses.filter(
            (business) =>
                business.name.toLowerCase().includes(query) ||
                business.businessType.toLowerCase().includes(query)
        );
    }, [businesses, businessSearch]);

    const selectedBusiness = useMemo(
        () => businesses.find((business) => business.id === selectedBusinessId),
        [businesses, selectedBusinessId]
    );

    const effectiveBusinessId = useMemo(
        () => (isBusinessOwner ? admin?.businessId ?? "" : selectedBusinessId),
        [admin?.businessId, isBusinessOwner, selectedBusinessId]
    );

    if (loading) {
        return <p className="text-gray-400">Loading businesses...</p>;
    }

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Products</h1>
            </div>

            {/* Business Owner/Employee: direct access to own products */}
            {isBusinessOwner && (
                <>
                    {effectiveBusinessId ? (
                        <ProductsBlock businessId={effectiveBusinessId} />
                    ) : (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                            <p className="text-gray-400">Your business profile is missing a business ID.</p>
                        </div>
                    )}
                </>
            )}

            {/* Super Admin/Staff: business list first, then details view */}
            {!isBusinessOwner && !selectedBusinessId && (
                <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Search Businesses</label>
                        <Input
                            placeholder="Search by business name or type..."
                            value={businessSearch}
                            onChange={(e) => setBusinessSearch(e.target.value)}
                            className="max-w-lg"
                        />
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        {filteredBusinesses.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">No businesses match your search.</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-800/50 border-b border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Business</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {filteredBusinesses.map((business) => (
                                        <tr key={business.id} className="hover:bg-gray-800/40 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-white">{business.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-300">{business.businessType}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => setSelectedBusinessId(business.id)}
                                                >
                                                    Open Products
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {!isBusinessOwner && selectedBusinessId && (
                <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500">Business</p>
                            <p className="text-lg font-semibold text-white">{selectedBusiness?.name || "Selected Business"}</p>
                            <p className="text-sm text-gray-400">Product search is available inside the products table below.</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedBusinessId("")}
                        >
                            Back to Businesses
                        </Button>
                    </div>
                    <ProductsBlock businessId={selectedBusinessId} />
                </div>
            )}
        </div>
    );
}
