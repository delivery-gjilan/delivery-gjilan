'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import ProductsBlock from '@/components/businesses/ProductsBlock';
import CategoriesBlock from '@/components/businesses/CategoriesBlock';
import SubcategoriesBlock from '@/components/businesses/SubcategoriesBlock';
import { BusinessType } from '@/gql/graphql';
import { GET_BUSINESS, UPDATE_BUSINESS } from '@/graphql/operations/businesses';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';


/* ----------------------------------
   TYPES
------------------------------------ */

interface Business {
    id: string;
    name: string;
    phoneNumber?: string | null;
    imageUrl?: string | null;
    businessType: string;
    isActive: boolean;
    createdAt: string;
    minOrderAmount?: number | null;
}

/* ----------------------------------
   GraphQL
------------------------------------ */

/* ----------------------------------
   Page Component
------------------------------------ */

export default function BusinessDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const businessId = params.id as string;

    const { data, loading, refetch } = useQuery(GET_BUSINESS, {
        variables: { id: businessId },
    });

    const [updateBusiness] = useMutation(UPDATE_BUSINESS);

    /* -----------------------------
     EDIT MODAL STATE
  ------------------------------ */
    const [editOpen, setEditOpen] = useState(false);

    const [editForm, setEditForm] = useState<{
        name: string;
        phoneNumber: string;
        businessType: BusinessType;
        imageUrl: string;
        minOrderAmount: number;
    }>({
        name: '',
        phoneNumber: '',
        businessType: BusinessType.Restaurant,
        imageUrl: '',
        minOrderAmount: 0,
    });

    function openEditModal(b: Business) {
        setEditForm({
            name: b.name,
            phoneNumber: b.phoneNumber || '',
            businessType: BusinessType.Restaurant,
            imageUrl: b.imageUrl || '',
            minOrderAmount: b.minOrderAmount ?? 0,
        });

        setEditOpen(true);
    }

    async function handleEdit() {
        try {
            await updateBusiness({
                variables: {
                    id: businessId,
                    input: {
                        name: editForm.name,
                        phoneNumber: editForm.phoneNumber.trim() || null,
                        businessType: editForm.businessType,
                        imageUrl: editForm.imageUrl || null,
                        minOrderAmount: editForm.minOrderAmount,
                    },
                },
            });
            await refetch();
            setEditOpen(false);
            toast.success('Business updated');
        } catch {
            toast.error('Failed to update business');
        }
    }

    /* -----------------------------
     LOADING / ERRORS
  ------------------------------ */
    if (loading) {
        return (
            <div className="text-white space-y-4">
                <div className="h-8 w-48 rounded bg-zinc-800 animate-pulse" />
                <div className="h-40 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            </div>
        );
    }
    if (!data?.business) return <p className="text-red-400">Business not found.</p>;

    const b = data.business;

    const TYPE_BADGE: Record<string, string> = {
        RESTAURANT: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        MARKET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        PHARMACY: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    };

    return (
        <div className="text-white space-y-6">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/dashboard/businesses')}
                        className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Businesses
                    </button>
                    <span className="text-zinc-700">/</span>
                    <span className="text-sm font-medium text-zinc-200">{b.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditModal(b)}>
                    Edit Business
                </Button>
            </div>

            {/* BUSINESS INFO CARD */}
            <div className="bg-[#111113] border border-[#1e1e22] rounded-xl p-5">
                <div className="flex items-start gap-5">
                    {b.imageUrl ? (
                        <img
                            src={b.imageUrl}
                            alt={b.name}
                            className="w-20 h-20 object-cover rounded-xl border border-zinc-800 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-xl border border-zinc-800 bg-zinc-900 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-lg font-semibold text-zinc-100">{b.name}</h1>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[b.businessType] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                {b.businessType.charAt(0) + b.businessType.slice(1).toLowerCase()}
                            </span>
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
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-1.5 mt-3">
                            {b.phoneNumber && (
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wide">Phone</p>
                                    <p className="text-sm text-zinc-200">{b.phoneNumber}</p>
                                </div>
                            )}
                            {(b.minOrderAmount ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wide">Min. Order</p>
                                    <p className="text-sm text-amber-400 font-medium">€{Number(b.minOrderAmount).toFixed(2)}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-zinc-500 uppercase tracking-wide">Created</p>
                                <p className="text-sm text-zinc-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CATEGORIES */}
            <CategoriesBlock businessId={businessId} />

            {/* SUBCATEGORIES */}
            <SubcategoriesBlock businessId={businessId} />

            {/* PRODUCTS */}
            <ProductsBlock businessId={businessId} />

            {/* EDIT MODAL */}
            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Business">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Business Name</label>
                        <Input
                            placeholder="Business name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Phone Number</label>
                        <Input
                            placeholder="e.g., +383 44 123 456"
                            value={editForm.phoneNumber}
                            onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Business Type</label>
                        <Select
                            value={editForm.businessType}
                            onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value as BusinessType })}
                        >
                            <option value={BusinessType.Restaurant}>Restaurant</option>
                            <option value={BusinessType.Market}>Market</option>
                            <option value={BusinessType.Pharmacy}>Pharmacy</option>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Image URL</label>
                        <Input
                            placeholder="https://..."
                            value={editForm.imageUrl}
                            onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Minimum Order Amount (€)</label>
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={editForm.minOrderAmount}
                            onChange={(e) => setEditForm({ ...editForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Set to 0 to disable</p>
                    </div>

                    <Button variant="primary" className="w-full mt-2" onClick={handleEdit}>
                        Save Changes
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
