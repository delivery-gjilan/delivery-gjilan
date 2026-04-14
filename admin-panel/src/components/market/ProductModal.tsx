'use client';

import { useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { uploadImage, deleteImage } from '@/lib/utils/image-upload';
import { getAuthToken } from '@/lib/utils/auth';
import type { CreateProductInput, UpdateProductInput } from '@/gql/graphql';

interface Category {
    id: string;
    name: string;
    isActive: boolean;
}

interface Subcategory {
    id: string;
    categoryId: string;
    name: string;
}

interface Product {
    id: string;
    categoryId: string;
    subcategoryId?: string | null;
    variantGroupId?: string | null;
    variantGroupName?: string | null;
    name: string;
    description?: string | null;
    price: number;
    markupPrice?: number | null;
    nightMarkedupPrice?: number | null;
    imageUrl?: string | null;
    isOffer: boolean;
    isOnSale: boolean;
    saleDiscountPercentage?: number | null;
    isAvailable: boolean;
    sortOrder: number;
}

interface VariantGroupOption {
    id: string;
    name: string;
}

type ProductModalState = {
    open: boolean;
    mode: 'create' | 'edit';
    categoryId?: string;
    subcategoryId?: string;
    data?: Product;
};

type VariantGroupCreateData = { id: string };

interface ProductModalProps {
    modal: ProductModalState;
    businessId: string;
    categories: Category[];
    subcategories: Subcategory[];
    variantGroups: VariantGroupOption[];
    onClose: () => void;
    onCreate: (input: CreateProductInput) => Promise<{ success: boolean; error?: string }>;
    onUpdate: (id: string, input: UpdateProductInput) => Promise<{ success: boolean; error?: string }>;
    onCreateVariantGroup: (name: string) => Promise<{ success: boolean; data?: VariantGroupCreateData; error?: string }>;
}

export default function ProductModal({
    modal,
    businessId,
    categories,
    subcategories,
    variantGroups,
    onClose,
    onCreate,
    onUpdate,
    onCreateVariantGroup,
}: ProductModalProps) {
    const [form, setForm] = useState({
        categoryId: '',
        subcategoryId: '',
        variantGroupId: '',
        name: '',
        description: '',
        price: '',
        markupPrice: '',
        nightMarkedupPrice: '',
        saleDiscountPercentage: '',
        imageUrl: '',
        isOffer: false,
        isVariant: false,
        isOnSale: false,
        isAvailable: true,
    });
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const availableSubcategories = useMemo(() => {
        if (!form.categoryId) return [];
        return subcategories.filter((s) => s.categoryId === form.categoryId);
    }, [form.categoryId, subcategories]);

    useMemo(() => {
        if (modal.open) {
            if (modal.mode === 'edit' && modal.data) {
                setForm({
                    categoryId: modal.data.categoryId,
                    subcategoryId: modal.data.subcategoryId || '',
                    variantGroupId: modal.data.variantGroupId || '',
                    name: modal.data.name,
                    description: modal.data.description || '',
                    price: modal.data.price.toString(),
                    markupPrice:
                        modal.data.markupPrice != null && modal.data.markupPrice > 0
                            ? modal.data.markupPrice.toString()
                            : '',
                    nightMarkedupPrice:
                        modal.data.nightMarkedupPrice != null && modal.data.nightMarkedupPrice > 0
                            ? modal.data.nightMarkedupPrice.toString()
                            : '',
                    saleDiscountPercentage: modal.data.saleDiscountPercentage?.toString() || '',
                    imageUrl: modal.data.imageUrl || '',
                    isOffer: modal.data.isOffer || false,
                    isVariant: Boolean(modal.data.variantGroupId),
                    isOnSale: modal.data.isOnSale,
                    isAvailable: modal.data.isAvailable,
                });
                setImagePreview(modal.data.imageUrl || null);
            } else {
                setForm({
                    categoryId: modal.categoryId || '',
                    subcategoryId: modal.subcategoryId || '',
                    variantGroupId: '',
                    name: '',
                    description: '',
                    price: '',
                    markupPrice: '',
                    nightMarkedupPrice: '',
                    saleDiscountPercentage: '',
                    imageUrl: '',
                    isOffer: false,
                    isVariant: false,
                    isOnSale: false,
                    isAvailable: true,
                });
                setImagePreview(null);
            }
            setImageFile(null);
            setError('');
        }
    }, [modal.open, modal.mode, modal.data, modal.categoryId, modal.subcategoryId]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!form.categoryId || !form.name.trim() || !form.price) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        let imageUrl = form.imageUrl;

        if (imageFile) {
            if (modal.mode === 'edit' && form.imageUrl) {
                await deleteImage(form.imageUrl);
            }
            setUploadingImage(true);
            const uploadedUrl = await uploadImage(imageFile, 'products');
            setUploadingImage(false);
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            } else {
                setError('Failed to upload image');
                setLoading(false);
                return;
            }
        }

        const input: CreateProductInput | UpdateProductInput = {
            categoryId: form.categoryId,
            subcategoryId: form.subcategoryId || undefined,
            variantGroupId: form.isVariant ? form.variantGroupId || undefined : undefined,
            name: form.name,
            description: form.description || undefined,
            imageUrl: imageUrl || undefined,
            price: parseFloat(form.price),
            markupPrice: form.markupPrice ? parseFloat(form.markupPrice) : null,
            nightMarkedupPrice: form.nightMarkedupPrice ? parseFloat(form.nightMarkedupPrice) : null,
            isOffer: form.isOffer,
            isOnSale: form.isOnSale,
            saleDiscountPercentage:
                form.isOnSale && form.saleDiscountPercentage ? parseFloat(form.saleDiscountPercentage) : undefined,
            isAvailable: form.isAvailable,
        };

        const result =
            modal.mode === 'create'
                ? await onCreate({ ...input, businessId } as CreateProductInput)
                : await onUpdate(modal.data!.id, input as UpdateProductInput);

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'An error occurred');
        }
    };

    return (
        <Modal
            isOpen={modal.open}
            onClose={onClose}
            title={modal.mode === 'create' ? 'Create Product' : 'Edit Product'}
        >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category *</label>
                        <Select
                            value={form.categoryId}
                            onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })}
                        >
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subcategory</label>
                        <Select
                            value={form.subcategoryId}
                            onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
                            disabled={!form.categoryId || availableSubcategories.length === 0}
                        >
                            <option value="">None</option>
                            {availableSubcategories.map((subcat) => (
                                <option key={subcat.id} value={subcat.id}>
                                    {subcat.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Product Name *</label>
                    <Input
                        placeholder="e.g., Coca-Cola 500ml"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                    <textarea
                        placeholder="Product description..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-150"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Price * (€)</label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Discount % (0–90)</label>
                        <Input
                            type="number"
                            step="1"
                            min="1"
                            max="90"
                            placeholder="e.g. 20"
                            value={form.saleDiscountPercentage}
                            onChange={(e) => setForm({ ...form, saleDiscountPercentage: e.target.value })}
                            disabled={!form.isOnSale}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Markup Price (€)</label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Settlement price"
                            value={form.markupPrice}
                            onChange={(e) => setForm({ ...form, markupPrice: e.target.value })}
                        />
                        <p className="text-[11px] text-zinc-600 mt-0.5">For driver settlements only</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Night Price (€)</label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="23:00–06:00 price"
                            value={form.nightMarkedupPrice}
                            onChange={(e) => setForm({ ...form, nightMarkedupPrice: e.target.value })}
                        />
                        <p className="text-[11px] text-zinc-600 mt-0.5">Active 23:00–06:00</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Product Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
                    />
                    {imagePreview && (
                        <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isOffer"
                            checked={form.isOffer}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    isOffer: e.target.checked,
                                    isVariant: e.target.checked ? false : prev.isVariant,
                                    variantGroupId: e.target.checked ? '' : prev.variantGroupId,
                                }))
                            }
                            className="w-4 h-4"
                        />
                        <label htmlFor="isOffer" className="text-sm text-zinc-300">
                            Create as Deal / Offer
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isVariant"
                            checked={form.isVariant}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setForm((prev) => ({
                                    ...prev,
                                    isVariant: checked,
                                    isOffer: checked ? false : prev.isOffer,
                                }));
                                if (checked) setVariantModalOpen(true);
                            }}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isVariant" className="text-sm text-zinc-300">
                            Add as Variant
                        </label>
                    </div>
                </div>

                {form.isVariant && (
                    <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 space-y-2">
                        <div className="text-sm text-violet-200">
                            {form.variantGroupId
                                ? `Variant group selected: ${variantGroups.find((g) => g.id === form.variantGroupId)?.name || form.variantGroupId}`
                                : 'No variant group selected yet.'}
                        </div>
                        <Button variant="outline" onClick={() => setVariantModalOpen(true)} className="w-full">
                            {form.variantGroupId ? 'Change Variant Group' : 'Choose or Create Variant Group'}
                        </Button>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isOnSale"
                            checked={form.isOnSale}
                            onChange={(e) => setForm({ ...form, isOnSale: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isOnSale" className="text-sm text-zinc-300">
                            On Sale
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isAvailable"
                            checked={form.isAvailable}
                            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isAvailable" className="text-sm text-zinc-300">
                            Available
                        </label>
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={loading || uploadingImage || (form.isVariant && !form.variantGroupId)}
                >
                    {uploadingImage
                        ? 'Uploading Image...'
                        : loading
                            ? 'Saving...'
                            : modal.mode === 'create'
                                ? 'Create Product'
                                : 'Save Changes'}
                </Button>
            </div>

            <VariantGroupModal
                isOpen={variantModalOpen}
                existingGroups={variantGroups}
                selectedGroupId={form.variantGroupId}
                onClose={() => setVariantModalOpen(false)}
                onSelect={(groupId) => {
                    setForm((prev) => ({ ...prev, variantGroupId: groupId, isVariant: true, isOffer: false }));
                    setVariantModalOpen(false);
                }}
                onCreate={async (name) => {
                    const result = await onCreateVariantGroup(name);
                    if (!result.success || !result.data?.id) {
                        return { success: false, error: result.error || 'Failed to create variant group' };
                    }
                    setForm((prev) => ({
                        ...prev,
                        variantGroupId: result.data!.id,
                        isVariant: true,
                        isOffer: false,
                    }));
                    return { success: true };
                }}
            />
        </Modal>
    );
}

/* -----------------------------------------------
   VARIANT GROUP MODAL (internal)
----------------------------------------------- */

interface VariantGroupModalProps {
    isOpen: boolean;
    existingGroups: VariantGroupOption[];
    selectedGroupId: string;
    onClose: () => void;
    onSelect: (groupId: string) => void;
    onCreate: (name: string) => Promise<{ success: boolean; error?: string }>;
}

function VariantGroupModal({
    isOpen,
    existingGroups,
    selectedGroupId,
    onClose,
    onSelect,
    onCreate,
}: VariantGroupModalProps) {
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setNewName('');
        setError('');
        setLoading(false);
    }, [isOpen]);

    const handleCreate = async () => {
        if (!newName.trim()) {
            setError('Variant group name is required');
            return;
        }

        setLoading(true);
        setError('');
        const result = await onCreate(newName.trim());
        setLoading(false);

        if (!result.success) {
            setError(result.error || 'Failed to create variant group');
            return;
        }

        setNewName('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select or Create Variant Group">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Existing Variant Groups</label>
                    {existingGroups.length === 0 ? (
                        <p className="text-sm text-zinc-600">No variant groups yet. Create your first one below.</p>
                    ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {existingGroups.map((group) => (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => onSelect(group.id)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                                        selectedGroupId === group.id
                                            ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                                            : 'border-zinc-800 bg-[#09090b] text-zinc-200 hover:border-violet-500/50'
                                    }`}
                                >
                                    {group.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-2">
                    <label className="block text-xs font-medium text-zinc-400">Create New Variant Group</label>
                    <Input
                        placeholder="e.g., Coca-Cola Sizes"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <Button variant="primary" className="w-full" onClick={handleCreate} disabled={loading}>
                        {loading ? 'Creating...' : 'Create and Select'}
                    </Button>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
        </Modal>
    );
}

export type { ProductModalState };
