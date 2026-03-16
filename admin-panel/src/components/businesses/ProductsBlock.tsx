"use client";

import { useState, useMemo } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import {
    useProducts,
    useCreateProduct,
    useUpdateProduct,
    useDeleteProduct,
    useCreateProductVariantGroup,
    useDeleteProductVariantGroup,
} from "@/lib/hooks/useProducts";
import { useProductSubcategories } from "@/lib/hooks/useProductSubcategories";
import type { CreateProductInput, UpdateProductInput } from "@/gql/graphql";
import { toast } from 'sonner';

/* ===============================================
   TYPES
=============================================== */

interface Category {
    id: string;
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
    imageUrl?: string | null;
    isOffer?: boolean;
    isOnSale: boolean;
    salePrice?: number | null;
    isAvailable: boolean;
}

/* ===============================================
   COMPONENT
=============================================== */

export default function ProductsBlock({ businessId }: { businessId: string }) {
    const { products, categories, loading, error, refetch } = useProducts(businessId);
    const { subcategories } = useProductSubcategories(businessId);
    const { create: createProduct, loading: createLoading, error: createError } = useCreateProduct();
    const { update: updateProduct, loading: updateLoading, error: updateError } = useUpdateProduct();
    const { delete: deleteProduct, loading: deleteLoading, error: deleteError } = useDeleteProduct();
    const { createVariantGroup, loading: createVariantGroupLoading } = useCreateProductVariantGroup();
    const { deleteVariantGroup } = useDeleteProductVariantGroup();

    /* ===============================================
     UI STATE
    =============================================== */

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string;
        name: string;
        isOffer?: boolean;
        variantGroupId?: string;
        variantGroupName?: string;
        variantGroupCount?: number;
        deleteWholeVariantGroup?: boolean;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [newVariantGroupName, setNewVariantGroupName] = useState("");
    const [variantGroupError, setVariantGroupError] = useState("");
    const [editVariantModalOpen, setEditVariantModalOpen] = useState(false);
    const [newEditVariantGroupName, setNewEditVariantGroupName] = useState("");
    const [editVariantGroupError, setEditVariantGroupError] = useState("");

    /* ===============================================
     UPLOAD STATE
    =============================================== */

    const [createImageFile, setCreateImageFile] = useState<File | null>(null);
    const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    /* ===============================================
     FORM STATE
    =============================================== */

    const [createForm, setCreateForm] = useState<CreateProductInput & { id?: string }>({
        businessId,
        categoryId: "",
        subcategoryId: undefined,
        variantGroupId: undefined,
        isOffer: false,
        name: "",
        description: "",
        imageUrl: "",
        price: 0,
        isOnSale: false,
        salePrice: undefined,
    });

    const [editForm, setEditForm] = useState<UpdateProductInput & { id: string }>({
        id: "",
        categoryId: "",
        subcategoryId: undefined,
        variantGroupId: undefined,
        isOffer: false,
        name: "",
        description: "",
        imageUrl: "",
        price: 0,
        isOnSale: false,
        salePrice: undefined,
        isAvailable: true,
    });

    /* ===============================================
     GROUPING
    =============================================== */

    const grouped = useMemo(() => {
        const groups: Record<string, Product[]> = {};

        categories.forEach((c) => {
            groups[c.id] = [];
        });

        // Filter products based on search query
        const filteredProducts = products.filter((p) => {
            const query = searchQuery.toLowerCase();
            return (
                p.name.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query) ||
                categories.find(c => c.id === p.categoryId)?.name.toLowerCase().includes(query) ||
                subcategories.find((s: any) => s.id === p.subcategoryId)?.name.toLowerCase().includes(query)
            );
        });

        filteredProducts.forEach((p) => {
            if (!groups[p.categoryId]) groups[p.categoryId] = [];
            groups[p.categoryId].push(p);
        });

        return groups;
    }, [products, categories, searchQuery, subcategories]);

    const variantGroups = useMemo(() => {
        const deduped = new Map<string, { id: string; name: string }>();
        products.forEach((p) => {
            if (!p.variantGroupId) return;
            if (deduped.has(p.variantGroupId)) return;
            deduped.set(p.variantGroupId, {
                id: p.variantGroupId,
                name: p.variantGroupName || `Variant Group ${p.variantGroupId.slice(0, 6)}`,
            });
        });
        return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    /* ===============================================
     HANDLERS
    =============================================== */

    // Image upload handler
    async function uploadImage(file: File, folder: string): Promise<string | null> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        try {
            const response = await fetch('http://localhost:4000/api/upload/image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.url) {
                return data.url;
            }
            throw new Error(data.error || 'Upload failed');
        } catch (error) {
            console.error('Image upload error:', error);
            toast.error('Failed to upload image');
            return null;
        }
    }

    function handleCreateImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setCreateImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCreateImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setEditImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    const handleCreate = async () => {
        if (!createForm.categoryId || !createForm.name || !createForm.price) {
            toast.warning("Please fill in all required fields");
            return;
        }

        setUploadingImage(true);
        let imageUrl = createForm.imageUrl;

        // Upload image if file is selected
        if (createImageFile) {
            const uploadedUrl = await uploadImage(createImageFile, 'products');
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        setUploadingImage(false);

        const input: CreateProductInput = {
            businessId,
            categoryId: createForm.categoryId,
            subcategoryId: createForm.subcategoryId || undefined,
            variantGroupId: createForm.variantGroupId || undefined,
            isOffer: createForm.isOffer,
            name: createForm.name,
            description: createForm.description || undefined,
            imageUrl: imageUrl || undefined,
            price: Number(createForm.price),
            isOnSale: createForm.isOnSale,
            salePrice: createForm.isOnSale ? Number(createForm.salePrice) : undefined,
        };

        const { success, error } = await createProduct(input);

        if (success) {
            await refetch();
            setCreateOpen(false);
            setCreateForm({
                businessId,
                categoryId: "",
                subcategoryId: undefined,
                variantGroupId: undefined,
                isOffer: false,
                name: "",
                description: "",
                imageUrl: "",
                price: 0,
                isOnSale: false,
                salePrice: undefined,
            });
            setCreateImageFile(null);
            setCreateImagePreview(null);
            setVariantModalOpen(false);
            setNewVariantGroupName("");
            setVariantGroupError("");
        } else {
            toast.error(`Error creating product: ${error}`);
        }
    };

    const handleCreateVariantGroup = async () => {
        if (!newVariantGroupName.trim()) {
            setVariantGroupError("Variant group name is required");
            return;
        }

        setVariantGroupError("");
        const result = await createVariantGroup({
            businessId,
            name: newVariantGroupName.trim(),
        });

        if (!result.success || !result.data?.id) {
            setVariantGroupError(result.error || "Failed to create variant group");
            return;
        }

        await refetch();
        setCreateForm((prev) => ({
            ...prev,
            variantGroupId: result.data.id,
            isOffer: false,
        }));
        setNewVariantGroupName("");
        setVariantModalOpen(false);
    };

    const handleCreateEditVariantGroup = async () => {
        if (!newEditVariantGroupName.trim()) {
            setEditVariantGroupError("Variant group name is required");
            return;
        }

        setEditVariantGroupError("");
        const result = await createVariantGroup({
            businessId,
            name: newEditVariantGroupName.trim(),
        });

        if (!result.success || !result.data?.id) {
            setEditVariantGroupError(result.error || "Failed to create variant group");
            return;
        }

        await refetch();
        setEditForm((prev) => ({
            ...prev,
            variantGroupId: result.data.id,
            isOffer: false,
        }));
        setNewEditVariantGroupName("");
        setEditVariantModalOpen(false);
    };

    const openEditModal = (p: Product) => {
        setEditForm({
            id: p.id,
            categoryId: p.categoryId,
            subcategoryId: p.subcategoryId ?? undefined,
            variantGroupId: p.variantGroupId ?? undefined,
            isOffer: p.isOffer ?? false,
            name: p.name,
            description: p.description || "",
            imageUrl: p.imageUrl || "",
            price: p.price,
            isOnSale: p.isOnSale,
            salePrice: p.salePrice || undefined,
            isAvailable: p.isAvailable,
        });
        setEditImageFile(null);
        setEditImagePreview(p.imageUrl || null);
        setEditOpen(true);
    };

    const handleEdit = async () => {
        if (!editForm.categoryId || !editForm.name || !editForm.price) {
            toast.warning("Please fill in all required fields");
            return;
        }

        setUploadingImage(true);
        let imageUrl = editForm.imageUrl;

        // Upload new image if file is selected
        if (editImageFile) {
            const uploadedUrl = await uploadImage(editImageFile, 'products');
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        setUploadingImage(false);

        const { id, ...input } = editForm;
        const updateInput: UpdateProductInput = {
            categoryId: input.categoryId,
            subcategoryId: input.subcategoryId || undefined,
            variantGroupId: input.variantGroupId || undefined,
            isOffer: input.isOffer,
            name: input.name,
            description: input.description || undefined,
            imageUrl: imageUrl || undefined,
            price: Number(input.price),
            isOnSale: input.isOnSale,
            salePrice: input.isOnSale ? Number(input.salePrice) : undefined,
            isAvailable: input.isAvailable,
        };

        const { success, error } = await updateProduct(id, updateInput);

        if (success) {
            await refetch();
            setEditOpen(false);
        } else {
            toast.error(`Error updating product: ${error}`);
        }
    };

    const handleDelete = async (options?: { deleteWholeVariantGroup?: boolean }) => {
        if (!deleteTarget) return;

        const deleteWholeVariantGroup = Boolean(options?.deleteWholeVariantGroup);
        const result = deleteWholeVariantGroup && deleteTarget.variantGroupId
            ? await deleteVariantGroup(deleteTarget.variantGroupId)
            : await deleteProduct(deleteTarget.id);

        if (result.success) {
            await refetch();
            setDeleteTarget(null);
        } else {
            toast.error(`Error deleting product: ${result.error}`);
        }
    };

    /* ===============================================
     RENDER
    =============================================== */

    if (loading) {
        return <p className="text-gray-400">Loading products...</p>;
    }

    if (error) {
        return <p className="text-red-400">Error: {error}</p>;
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Products</h2>

                <Button 
                    variant="primary" 
                    onClick={() => setCreateOpen(true)}
                    disabled={createLoading}
                >
                    {createLoading ? "Adding..." : "+ Add Product"}
                </Button>
            </div>

            {/* SEARCH BAR */}
            <div className="mb-6">
                <Input
                    placeholder="Search products by name, description, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* ===============================================
             CATEGORY GROUPS
            =============================================== */}

            {categories.map((cat) => {
                const items = grouped[cat.id] || [];

                return (
                    <div key={cat.id} className="mb-10">
                        <h3 className="text-lg font-semibold text-purple-300 mb-3">
                            {cat.name}
                        </h3>

                        {items.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                                No products here.
                            </p>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Image</Th>
                                        <Th>Name</Th>
                                        <Th>Subcategory</Th>
                                        <Th>Price</Th>
                                        <Th>Sale</Th>
                                        <Th>Status</Th>
                                        <Th>Actions</Th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map((p) => (
                                        <tr key={p.id}>
                                            <Td>
                                                {p.imageUrl ? (
                                                    <img
                                                        src={p.imageUrl}
                                                        alt={p.name}
                                                        className="h-12 w-12 rounded object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400 text-xs">
                                                        No image
                                                    </span>
                                                )}
                                            </Td>

                                            <Td>{p.name}</Td>

                                            <Td>
                                                {subcategories.find((s: any) => s.id === p.subcategoryId)?.name || "-"}
                                            </Td>

                                            <Td>${p.price.toFixed(2)}</Td>

                                            <Td>
                                                {p.isOnSale &&
                                                p.salePrice != null ? (
                                                    <span className="text-green-400">
                                                        $
                                                        {p.salePrice.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </Td>

                                            <Td>
                                                {p.isAvailable ? (
                                                    <span className="text-green-400">
                                                        Available
                                                    </span>
                                                ) : (
                                                    <span className="text-red-400">
                                                        Unavailable
                                                    </span>
                                                )}
                                            </Td>

                                            <Td>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="text-xs px-3"
                                                        onClick={() =>
                                                            openEditModal(p)
                                                        }
                                                        disabled={updateLoading}
                                                    >
                                                        Edit
                                                    </Button>

                                                    <Button
                                                        variant="danger"
                                                        className="text-xs px-3"
                                                        onClick={() => {
                                                            const variantGroupCount = p.variantGroupId
                                                                ? items.filter((item) => item.variantGroupId === p.variantGroupId).length
                                                                : 0;

                                                            setDeleteTarget({
                                                                id: p.id,
                                                                name: p.name,
                                                                isOffer: p.isOffer,
                                                                variantGroupId: p.variantGroupId || undefined,
                                                                variantGroupName: p.variantGroupName || undefined,
                                                                variantGroupCount,
                                                            });
                                                        }}
                                                        disabled={deleteLoading}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>
                );
            })}

            {/* ===============================================
             CREATE MODAL
            =============================================== */}

            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Create Product"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Category *
                        </label>
                        <Select
                            value={createForm.categoryId}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    categoryId: e.target.value,
                                    subcategoryId: undefined,
                                })
                            }
                        >
                            <option value="">Select category</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Subcategory
                        </label>
                        <Select
                            value={createForm.subcategoryId ?? ""}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    subcategoryId: e.target.value || undefined,
                                })
                            }
                            disabled={!createForm.categoryId}
                        >
                            <option value="">No subcategory</option>
                            {subcategories
                                .filter((s: any) => s.categoryId === createForm.categoryId)
                                .map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Product Name *
                        </label>
                        <Input
                            placeholder="Product name"
                            value={createForm.name}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Description
                        </label>
                        <Input
                            placeholder="Description (optional)"
                            value={createForm.description ?? ""}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    description: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Product Image
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleCreateImageChange}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                        />
                        {createImagePreview && (
                            <div className="mt-2">
                                <img
                                    src={createImagePreview}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Price *
                        </label>
                        <Input
                            placeholder="Price"
                            type="number"
                            step="0.01"
                            value={createForm.price}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    price: Number(e.target.value),
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="createIsOffer"
                            checked={createForm.isOffer ?? false}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    isOffer: e.target.checked,
                                    variantGroupId: e.target.checked ? undefined : createForm.variantGroupId,
                                })
                            }
                        />
                        <label htmlFor="createIsOffer" className="text-gray-300">
                            Create as Deal / Offer
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="createIsVariant"
                            checked={Boolean(createForm.variantGroupId)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                    setVariantModalOpen(true);
                                    setCreateForm({
                                        ...createForm,
                                        isOffer: false,
                                    });
                                } else {
                                    setCreateForm({
                                        ...createForm,
                                        variantGroupId: undefined,
                                    });
                                }
                            }}
                        />
                        <label htmlFor="createIsVariant" className="text-gray-300">
                            Add as Variant
                        </label>
                    </div>

                    {Boolean(createForm.variantGroupId) && (
                        <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-sm text-violet-200 w-full">
                            Variant group: {variantGroups.find((g) => g.id === createForm.variantGroupId)?.name || createForm.variantGroupId}
                            <Button
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => setVariantModalOpen(true)}
                            >
                                Change Variant Group
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={createForm.isOnSale ?? false}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    isOnSale: e.target.checked,
                                })
                            }
                        />
                        <span className="text-gray-300">On Sale</span>
                    </div>

                    {createForm.isOnSale && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Sale Price
                            </label>
                            <Input
                                placeholder="Sale Price"
                                type="number"
                                step="0.01"
                                value={createForm.salePrice || ""}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        salePrice: e.target.value ? Number(e.target.value) : undefined,
                                    })
                                }
                            />
                        </div>
                    )}

                    {createError && (
                        <p className="text-red-400 text-sm">{createError}</p>
                    )}

                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleCreate}
                        disabled={createLoading || uploadingImage || (Boolean(createForm.variantGroupId) && !createForm.variantGroupId)}
                    >
                        {uploadingImage ? "Uploading..." : createLoading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={variantModalOpen}
                onClose={() => {
                    setVariantModalOpen(false);
                    setVariantGroupError("");
                }}
                title="Select or Create Variant Group"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Existing Variant Groups</label>
                        {variantGroups.length === 0 ? (
                            <p className="text-sm text-gray-500">No variant groups yet. Create one below.</p>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {variantGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => {
                                            setCreateForm((prev) => ({
                                                ...prev,
                                                variantGroupId: group.id,
                                                isOffer: false,
                                            }));
                                            setVariantModalOpen(false);
                                        }}
                                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                                            createForm.variantGroupId === group.id
                                                ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                                                : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-violet-500/50'
                                        }`}
                                    >
                                        {group.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-700 pt-4 space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Create New Variant Group</label>
                        <Input
                            placeholder="e.g., Burger Sizes"
                            value={newVariantGroupName}
                            onChange={(e) => setNewVariantGroupName(e.target.value)}
                        />
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleCreateVariantGroup}
                            disabled={createVariantGroupLoading}
                        >
                            {createVariantGroupLoading ? "Creating..." : "Create and Select"}
                        </Button>
                    </div>

                    {variantGroupError && <p className="text-red-400 text-sm">{variantGroupError}</p>}
                </div>
            </Modal>

            {/* ===============================================
             EDIT MODAL
            =============================================== */}

            <Modal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Product"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Category *
                        </label>
                        <Select
                            value={editForm.categoryId ?? ""}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    categoryId: e.target.value,
                                    subcategoryId: undefined,
                                })
                            }
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Subcategory
                        </label>
                        <Select
                            value={editForm.subcategoryId ?? ""}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    subcategoryId: e.target.value || undefined,
                                })
                            }
                            disabled={!editForm.categoryId}
                        >
                            <option value="">No subcategory</option>
                            {subcategories
                                .filter((s: any) => s.categoryId === editForm.categoryId)
                                .map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Product Name *
                        </label>
                        <Input
                            placeholder="Product name"
                            value={editForm.name ?? ""}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Description
                        </label>
                        <Input
                            placeholder="Description"
                            value={editForm.description ?? ""}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    description: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Product Image
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleEditImageChange}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                        />
                        {editImagePreview && (
                            <div className="mt-2">
                                <img
                                    src={editImagePreview}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Price *
                        </label>
                        <Input
                            placeholder="Price"
                            type="number"
                            step="0.01"
                            value={editForm.price ?? 0}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    price: Number(e.target.value),
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="editIsOffer"
                            checked={editForm.isOffer ?? false}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    isOffer: e.target.checked,
                                    variantGroupId: e.target.checked ? undefined : editForm.variantGroupId,
                                })
                            }
                        />
                        <label htmlFor="editIsOffer" className="text-gray-300">
                            Mark as Deal / Offer
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="editIsVariant"
                            checked={Boolean(editForm.variantGroupId)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                    setEditVariantModalOpen(true);
                                    setEditForm({
                                        ...editForm,
                                        isOffer: false,
                                    });
                                } else {
                                    setEditForm({
                                        ...editForm,
                                        variantGroupId: undefined,
                                    });
                                }
                            }}
                        />
                        <label htmlFor="editIsVariant" className="text-gray-300">
                            Part of Variant Group
                        </label>
                    </div>

                    {Boolean(editForm.variantGroupId) && (
                        <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-sm text-violet-200 w-full">
                            Variant group: {variantGroups.find((g) => g.id === editForm.variantGroupId)?.name || editForm.variantGroupId}
                            <Button
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => setEditVariantModalOpen(true)}
                            >
                                Change Variant Group
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editForm.isOnSale ?? false}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    isOnSale: e.target.checked,
                                })
                            }
                        />
                        <span className="text-gray-300">On Sale</span>
                    </div>

                    {editForm.isOnSale && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Sale Price
                            </label>
                            <Input
                                placeholder="Sale Price"
                                type="number"
                                step="0.01"
                                value={editForm.salePrice || ""}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        salePrice: e.target.value ? Number(e.target.value) : undefined,
                                    })
                                }
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editForm.isAvailable ?? true}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    isAvailable: e.target.checked,
                                })
                            }
                        />
                        <span className="text-gray-300">Available</span>
                    </div>

                    {updateError && (
                        <p className="text-red-400 text-sm">{updateError}</p>
                    )}

                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleEdit}
                        disabled={updateLoading || uploadingImage}
                    >
                        {uploadingImage ? "Uploading..." : updateLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={editVariantModalOpen}
                onClose={() => {
                    setEditVariantModalOpen(false);
                    setEditVariantGroupError("");
                }}
                title="Select or Create Variant Group"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Existing Variant Groups</label>
                        {variantGroups.length === 0 ? (
                            <p className="text-sm text-gray-500">No variant groups yet. Create one below.</p>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {variantGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => {
                                            setEditForm((prev) => ({
                                                ...prev,
                                                variantGroupId: group.id,
                                                isOffer: false,
                                            }));
                                            setEditVariantModalOpen(false);
                                        }}
                                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                                            editForm.variantGroupId === group.id
                                                ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                                                : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-violet-500/50'
                                        }`}
                                    >
                                        {group.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-700 pt-4 space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Create New Variant Group</label>
                        <Input
                            placeholder="e.g., Pizza Sizes"
                            value={newEditVariantGroupName}
                            onChange={(e) => setNewEditVariantGroupName(e.target.value)}
                        />
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleCreateEditVariantGroup}
                            disabled={createVariantGroupLoading}
                        >
                            {createVariantGroupLoading ? "Creating..." : "Create and Select"}
                        </Button>
                    </div>

                    {editVariantGroupError && <p className="text-red-400 text-sm">{editVariantGroupError}</p>}
                </div>
            </Modal>

            {/* ===============================================
             DELETE MODAL
            =============================================== */}

            <Modal
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                title="Delete Product"
            >
                <p className="text-gray-300 mb-4">
                    Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                </p>

                {deleteTarget?.isOffer && (
                    <p className="text-sm text-amber-300 mb-3">This item is currently marked as an offer/deal.</p>
                )}

                {deleteTarget?.variantGroupId && (
                    <div className="mb-4 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3">
                        <p className="text-sm text-violet-200 mb-2">
                            This item belongs to variant group <strong>{deleteTarget.variantGroupName || deleteTarget.variantGroupId}</strong>
                            {deleteTarget.variantGroupCount
                                ? ` (${deleteTarget.variantGroupCount} variant${deleteTarget.variantGroupCount === 1 ? '' : 's'})`
                                : ''}.
                        </p>
                        <label className="flex items-center gap-2 text-sm text-violet-100">
                            <input
                                type="checkbox"
                                checked={Boolean(deleteTarget?.deleteWholeVariantGroup)}
                                onChange={(e) =>
                                    setDeleteTarget((prev) =>
                                        prev
                                            ? { ...prev, deleteWholeVariantGroup: e.target.checked }
                                            : prev
                                    )
                                }
                            />
                            Delete entire variant group instead of only this variant
                        </label>
                    </div>
                )}

                {deleteError && (
                    <p className="text-red-400 text-sm mb-4">{deleteError}</p>
                )}

                <div className="flex justify-end gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleteLoading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={() =>
                            handleDelete({
                                deleteWholeVariantGroup: Boolean(deleteTarget?.deleteWholeVariantGroup),
                            })
                        }
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
