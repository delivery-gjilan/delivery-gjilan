"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Table, Th, Td } from "@/components/ui/Table";
import {
    CREATE_BUSINESS,
    CREATE_BUSINESS_WITH_OWNER,
    DELETE_BUSINESS,
    GET_BUSINESSES,
    UPDATE_BUSINESS,
} from "@/graphql/operations/businesses";
import CreateBusinessModal from "@/components/businesses/CreateBusinessModal";
import EditBusinessModal from "@/components/businesses/EditBusinessModal";
import DeleteBusinessDialog from "@/components/businesses/DeleteBusinessDialog";
import { BusinessesQuery } from "@/gql/graphql";

type Business = BusinessesQuery["businesses"][number];

export default function BusinessesPage() {
    const router = useRouter();

    const { data, loading, refetch } = useQuery<BusinessesQuery>(GET_BUSINESSES);

    const [createBusiness] = useMutation(CREATE_BUSINESS);
    const [createBusinessWithOwner] = useMutation(CREATE_BUSINESS_WITH_OWNER);
    const [updateBusiness] = useMutation(UPDATE_BUSINESS);
    const [deleteBusiness] = useMutation(DELETE_BUSINESS);

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selected, setSelected] = useState<Business | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    function openEditModal(business: Business) {
        setSelected(business);
        setEditOpen(true);
    }

    async function handleDelete() {
        if (!deleteId) return;
        await deleteBusiness({ variables: { id: deleteId } });
        await refetch();
        setDeleteId(null);
    }

    if (loading) {
        return (
            <div className="text-white">
                <div className="flex justify-between items-center mb-5">
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Businesses</h1>
                </div>
                <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            </div>
        );
    }

    const businesses: Business[] = data?.businesses || [];

    const filteredBusinesses = businesses.filter((business) => {
        const query = searchQuery.toLowerCase();
        return (
            business.name.toLowerCase().includes(query) ||
            business.businessType.toLowerCase().includes(query) ||
            business.location?.address.toLowerCase().includes(query)
        );
    });

    const TYPE_BADGE: Record<string, string> = {
        RESTAURANT: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        MARKET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        PHARMACY: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    };

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Businesses</h1>
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                    + Create
                </Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Search businesses by name, type, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Table>
                <thead>
                    <tr>
                        <Th>Business</Th>
                        <Th>Type</Th>
                        <Th>Address</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {filteredBusinesses.length === 0 ? (
                        <tr>
                            <Td colSpan={5}>
                                <div className="text-center text-zinc-500 py-6">
                                    {businesses.length === 0 ? "No businesses yet." : "No businesses match your search."}
                                </div>
                            </Td>
                        </tr>
                    ) : (
                        filteredBusinesses.map((b) => (
                            <tr key={b.id}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        {b.imageUrl ? (
                                            <img
                                                src={b.imageUrl}
                                                alt=""
                                                className="h-9 w-9 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700 flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-zinc-100">{b.name}</span>
                                    </div>
                                </Td>
                                <Td>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[b.businessType] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                        {b.businessType.charAt(0) + b.businessType.slice(1).toLowerCase()}
                                    </span>
                                </Td>
                                <Td>
                                    <span className="text-zinc-400 text-sm truncate max-w-[200px] block">
                                        {b.location?.address || <span className="text-zinc-600">—</span>}
                                    </span>
                                </Td>
                                <Td>
                                    {b.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                            Inactive
                                        </span>
                                    )}
                                </Td>
                                <Td className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/businesses/${b.id}`)}
                                        >
                                            View
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openEditModal(b)}>
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => setDeleteId(b.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </Td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            <CreateBusinessModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={async () => { await refetch(); }}
                createBusiness={createBusiness}
                createBusinessWithOwner={createBusinessWithOwner}
            />

            <EditBusinessModal
                isOpen={editOpen}
                business={selected}
                onClose={() => setEditOpen(false)}
                onSaved={(freshBusiness) => {
                    if (freshBusiness) setSelected(freshBusiness);
                }}
                updateBusiness={updateBusiness}
                refetch={refetch}
            />

            <DeleteBusinessDialog
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
