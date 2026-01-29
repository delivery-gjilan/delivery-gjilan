'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import ProductsBlock from '@/components/businesses/ProductsBlock';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import CategoriesBlock from '@/components/businesses/CategoriesBlock';
import { BusinessType } from '@/gql/graphql';
import { GET_BUSINESS, UPDATE_BUSINESS } from '@/graphql/operations/businesses';

/* ----------------------------------
   TYPES
------------------------------------ */

interface Business {
    id: string;
    name: string;
    imageUrl?: string | null;
    businessType: string;
    isActive: boolean;
    createdAt: string;
}

/* ----------------------------------
   GraphQL
------------------------------------ */

/* ----------------------------------
   Page Component
------------------------------------ */

export default function BusinessDetailsPage() {
    const params = useParams();
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
        businessType: BusinessType;
        imageUrl: string;
    }>({
        name: '',
        businessType: BusinessType.Restaurant,
        imageUrl: '',
    });

    function openEditModal(b: Business) {
        setEditForm({
            name: b.name,
            businessType: BusinessType.Restaurant,
            imageUrl: b.imageUrl || '',
        });

        setEditOpen(true);
    }

    async function handleEdit() {
        await updateBusiness({
            variables: {
                id: businessId,
                input: {
                    name: editForm.name,
                    businessType: editForm.businessType,
                    imageUrl: editForm.imageUrl || null,
                },
            },
        });

        await refetch();
        setEditOpen(false);
    }

    /* -----------------------------
     LOADING / ERRORS
  ------------------------------ */
    if (loading) return <p className="text-gray-400">Loading...</p>;
    if (!data?.business) return <p className="text-red-400">Business not found.</p>;

    const b = data.business;

    return (
        <div className="text-white space-y-10 p-4">
            {/* HEADER */}
            <h1 className="text-3xl font-semibold">
                Business Details - <span className="text-purple-400">{b.name}</span>
            </h1>

            {/* PRODUCTS BLOCK */}
            <ProductsBlock businessId={businessId} />

            {/* CATEGORIES BLOCK */}
            <CategoriesBlock businessId={businessId} />

            {/* BUSINESS INFO */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Business Info</h2>

                <div className="flex items-start gap-6">
                    {b.imageUrl && <img src={b.imageUrl} alt={b.name} className="w-32 h-32 object-cover rounded-lg" />}

                    <div className="space-y-2">
                        <p>
                            <span className="text-gray-400">Name:</span> <span className="font-semibold">{b.name}</span>
                        </p>

                        <p>
                            <span className="text-gray-400">Type:</span>{' '}
                            <span className="font-semibold">{b.businessType}</span>
                        </p>

                        <p>
                            <span className="text-gray-400">Status:</span>{' '}
                            {b.isActive ? (
                                <span className="text-green-400">Active</span>
                            ) : (
                                <span className="text-red-400">Inactive</span>
                            )}
                        </p>

                        <p className="text-gray-400 text-sm">Created at: {new Date(b.createdAt).toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-5">
                    <Button variant="outline" onClick={() => openEditModal(b)}>
                        Edit Business
                    </Button>
                </div>
            </div>

            {/* ------------------------------------
          EDIT MODAL
      ------------------------------------ */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Business">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Business Name</label>
                        <Input
                            placeholder="Business name"
                            value={editForm.name}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Business Type</label>
                        <Select
                            value={editForm.businessType}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    businessType: e.target.value as BusinessType,
                                })
                            }
                        >
                            <option value={BusinessType.Restaurant}>Restaurant</option>
                            <option value={BusinessType.Market}>Market</option>
                            <option value={BusinessType.Pharmacy}>Pharmacy</option>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Image URL</label>
                        <Input
                            placeholder="Image URL"
                            value={editForm.imageUrl}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    imageUrl: e.target.value,
                                })
                            }
                        />
                    </div>

                    <Button variant="primary" className="w-full mt-2" onClick={handleEdit}>
                        Save Changes
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
