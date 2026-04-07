"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import ProductsBlock from "@/components/businesses/ProductsBlock";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft } from "lucide-react";

interface Business {
    id: string;
    name: string;
    businessType: string;
}

interface GetBusinessesData {
    businesses: Business[];
}

const TYPE_BADGE: Record<string, string> = {
    RESTAURANT: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    MARKET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    PHARMACY: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

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
        return (
            <div className="text-white">
                <div className="flex justify-between items-center mb-5">
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Products</h1>
                </div>
                <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Products</h1>
            </div>

            {/* Business Owner/Employee: direct access to own products */}
            {isBusinessOwner && (
                <>
                    {effectiveBusinessId ? (
                        <ProductsBlock businessId={effectiveBusinessId} />
                    ) : (
                        <div className="bg-[#111113] border border-[#1e1e22] rounded-xl p-12 text-center">
                            <p className="text-zinc-500">Your business profile is missing a business ID.</p>
                        </div>
                    )}
                </>
            )}

            {/* Super Admin/Staff: business list */}
            {!isBusinessOwner && !selectedBusinessId && (
                <div className="space-y-4">
                    <Input
                        placeholder="Search businesses by name or type..."
                        value={businessSearch}
                        onChange={(e) => setBusinessSearch(e.target.value)}
                    />

                    <Table>
                        <thead>
                            <tr>
                                <Th>Business</Th>
                                <Th>Type</Th>
                                <Th className="text-right">Action</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBusinesses.length === 0 ? (
                                <tr>
                                    <Td colSpan={3}>
                                        <div className="text-center text-zinc-500 py-6">
                                            {businesses.length === 0 ? "No businesses found." : "No businesses match your search."}
                                        </div>
                                    </Td>
                                </tr>
                            ) : (
                                filteredBusinesses.map((business) => (
                                    <tr key={business.id}>
                                        <Td>
                                            <span className="font-medium text-zinc-100">{business.name}</span>
                                        </Td>
                                        <Td>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[business.businessType] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                                {business.businessType.charAt(0) + business.businessType.slice(1).toLowerCase()}
                                            </span>
                                        </Td>
                                        <Td className="text-right">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => setSelectedBusinessId(business.id)}
                                            >
                                                Open Products
                                            </Button>
                                        </Td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            )}

            {/* Selected business: product block */}
            {!isBusinessOwner && selectedBusinessId && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedBusinessId("")}
                                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                            >
                                <ChevronLeft size={16} />
                                All businesses
                            </button>
                            <span className="text-zinc-700">/</span>
                            <span className="text-zinc-100 font-semibold">{selectedBusiness?.name}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedBusinessId("")}>
                            Back
                        </Button>
                    </div>
                    <ProductsBlock businessId={selectedBusinessId} />
                </div>
            )}
        </div>
    );
}
