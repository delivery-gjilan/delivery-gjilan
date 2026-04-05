"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
    DndContext,
    closestCenter,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Download } from "lucide-react";

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
    useUpdateProductsOrder,
    useCreateProductVariantGroup,
    useDeleteProductVariantGroup,
} from "@/lib/hooks/useProducts";
import { useProductSubcategories } from "@/lib/hooks/useProductSubcategories";
import type { CreateProductInput, UpdateProductInput } from "@/gql/graphql";
import { toast } from 'sonner';
import {
    CREATE_OPTION,
    CREATE_OPTION_GROUP,
    DELETE_OPTION,
    DELETE_OPTION_GROUP,
    GET_PRODUCT_WITH_OPTIONS,
    UPDATE_OPTION_GROUP,
    UPDATE_OPTION,
} from "@/graphql/operations/products";
import { useAuth } from "@/lib/auth-context";

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
    saleDiscountPercentage?: number | null;
    isAvailable: boolean;
    sortOrder: number;
    hasOptionGroups?: boolean;
}

/* ===============================================
   COMPONENT
=============================================== */

export default function ProductsBlock({ businessId }: { businessId: string }) {
    const { admin } = useAuth();
    const isPlatformAdminRole = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";
    const { products, categories, loading, error, refetch } = useProducts(businessId);
    const { subcategories } = useProductSubcategories(businessId);
    const { create: createProduct, loading: createLoading, error: createError } = useCreateProduct();
    const { update: updateProduct, loading: updateLoading, error: updateError } = useUpdateProduct();
    const { delete: deleteProduct, loading: deleteLoading, error: deleteError } = useDeleteProduct();
    const { updateOrder: updateProductsOrder, loading: updateOrderLoading } = useUpdateProductsOrder();
    const { createVariantGroup, loading: createVariantGroupLoading } = useCreateProductVariantGroup();
    const { deleteVariantGroup } = useDeleteProductVariantGroup();

    /* ===============================================
     EXPORT
    =============================================== */

    function handleExport() {
        const subcategoryMap = new Map(
            (subcategories as any[]).map((s: any) => [s.id, s])
        );

        const categoryMap = new Map(categories.map((c) => [c.id, c]));

        // Build category → subcategories → products tree
        const categoryTree = categories.map((cat) => {
            const catProducts = products.filter((p) => p.categoryId === cat.id);

            const subMap = new Map<string, any[]>();
            const noSub: any[] = [];

            catProducts.forEach((p) => {
                if (p.subcategoryId) {
                    const arr = subMap.get(p.subcategoryId) ?? [];
                    arr.push(p);
                    subMap.set(p.subcategoryId, arr);
                } else {
                    noSub.push(p);
                }
            });

            const subcategoriesOut = [...subMap.entries()].map(([subId, prods]) => {
                const sub = subcategoryMap.get(subId);
                return {
                    id: subId,
                    name: sub?.name ?? subId,
                    products: prods.map((p) => ({
                        id: p.id,
                        name: p.name,
                        description: p.description ?? null,
                        imageUrl: p.imageUrl ?? null,
                        price: p.price,
                        isOnSale: p.isOnSale,
                        saleDiscountPercentage: p.saleDiscountPercentage ?? null,
                        isAvailable: p.isAvailable,
                        sortOrder: p.sortOrder,
                        isOffer: p.isOffer ?? false,
                    })),
                };
            });

            return {
                id: cat.id,
                name: cat.name,
                subcategories: subcategoriesOut,
                products: noSub.map((p) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description ?? null,
                    imageUrl: p.imageUrl ?? null,
                    price: p.price,
                    isOnSale: p.isOnSale,
                    saleDiscountPercentage: p.saleDiscountPercentage ?? null,
                    isAvailable: p.isAvailable,
                    sortOrder: p.sortOrder,
                    isOffer: p.isOffer ?? false,
                })),
            };
        });

        const exportData = {
            exportedAt: new Date().toISOString(),
            businessId,
            totalProducts: products.length,
            categories: categoryTree,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-export-${businessId}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${products.length} products`);
    }
    const [createOptionGroup] = useMutation(CREATE_OPTION_GROUP);
    const [deleteOptionGroup] = useMutation(DELETE_OPTION_GROUP);
    const [updateOptionGroup] = useMutation(UPDATE_OPTION_GROUP);
    const [createOption] = useMutation(CREATE_OPTION);
    const [updateOption] = useMutation(UPDATE_OPTION);
    const [deleteOption] = useMutation(DELETE_OPTION);

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
    const [sortMode, setSortMode] = useState(false);
    const [orderByCategory, setOrderByCategory] = useState<Record<string, string[]>>({});
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [newVariantGroupName, setNewVariantGroupName] = useState("");
    const [variantGroupError, setVariantGroupError] = useState("");
    const [editVariantModalOpen, setEditVariantModalOpen] = useState(false);
    const [newEditVariantGroupName, setNewEditVariantGroupName] = useState("");
    const [editVariantGroupError, setEditVariantGroupError] = useState("");
    const [optionsModal, setOptionsModal] = useState<{ open: boolean; productId: string; productName: string }>({
        open: false,
        productId: "",
        productName: "",
    });
    const [newOptionGroupName, setNewOptionGroupName] = useState("");
    const [newOptionGroupMin, setNewOptionGroupMin] = useState(0);
    const [newOptionGroupMax, setNewOptionGroupMax] = useState(1);
    const [newOptionItems, setNewOptionItems] = useState<Array<{ name: string; extraPrice: number }>>([
        { name: "", extraPrice: 0 },
    ]);
    const [optionsError, setOptionsError] = useState("");
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [newOptionByGroup, setNewOptionByGroup] = useState<Record<string, { name: string; extraPrice: number; imageFile?: File | null; imagePreview?: string | null }>>({});
    const [optionGroupDrafts, setOptionGroupDrafts] = useState<Record<string, { name: string; min: number; max: number }>>({});
    const [optionDrafts, setOptionDrafts] = useState<Record<string, { name: string; extraPrice: number; imageFile?: File | null; imagePreview?: string | null }>>({});
    const [optionsDeleteTarget, setOptionsDeleteTarget] = useState<
        | { kind: "group"; id: string; name: string }
        | { kind: "option"; id: string; name: string }
        | null
    >(null);

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
        saleDiscountPercentage: undefined,
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
        saleDiscountPercentage: undefined,
        isAvailable: true,
    });

    const { data: productOptionsData, refetch: refetchProductOptions } = useQuery(GET_PRODUCT_WITH_OPTIONS, {
        variables: { id: optionsModal.productId },
        skip: !optionsModal.open || !optionsModal.productId,
        fetchPolicy: "network-only",
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

        // Sort each category group so variant members are adjacent
        for (const catId of Object.keys(groups)) {
            groups[catId].sort((a, b) => {
                // Group by variantGroupId first (nulls last), then by sortOrder
                const aGroup = a.variantGroupId ?? '';
                const bGroup = b.variantGroupId ?? '';
                if (aGroup !== bGroup) {
                    if (!aGroup) return 1;
                    if (!bGroup) return -1;
                    return aGroup.localeCompare(bGroup);
                }
                return a.sortOrder - b.sortOrder;
            });
        }

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

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        if (!sortMode) return;

        const nextOrders: Record<string, string[]> = {};
        categories.forEach((category) => {
            const items = (grouped[category.id] || [])
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => item.id);
            nextOrders[category.id] = items;
        });

        setOrderByCategory(nextOrders);
    }, [categories, grouped, sortMode]);

    /* ===============================================
     HANDLERS
    =============================================== */

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql').replace(/\/graphql$/, '');

    // Image upload handler
    async function uploadImage(file: File, folder: string): Promise<string | null> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        try {
            const response = await fetch(`${apiBase}/api/upload/image`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
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

    async function deleteImage(imageUrl: string): Promise<void> {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        try {
            await fetch(`${apiBase}/api/upload/image`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ imageUrl }),
            });
        } catch {
            console.warn('Failed to delete old image from S3:', imageUrl);
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
            isOffer: isPlatformAdminRole ? createForm.isOffer : false,
            name: createForm.name,
            description: createForm.description || undefined,
            imageUrl: imageUrl || undefined,
            price: Number(createForm.price),
            isOnSale: createForm.isOnSale,
            saleDiscountPercentage: createForm.isOnSale ? Number(createForm.saleDiscountPercentage) : undefined,
        };

        const { success, error, data } = await createProduct(input);

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
                saleDiscountPercentage: undefined,
            });
            setCreateImageFile(null);
            setCreateImagePreview(null);
            setVariantModalOpen(false);
            setNewVariantGroupName("");
            setVariantGroupError("");

            const createdId = data?.createProduct?.id;
            if (createForm.isOffer && createdId) {
                setOptionsModal({
                    open: true,
                    productId: createdId,
                    productName: createForm.name,
                });
            }
        } else {
            toast.error(`Error creating product: ${error}`);
        }
    };

    const openOptionsModal = (product: Product) => {
        setOptionsError("");
        setNewOptionGroupName("");
        setNewOptionGroupMin(0);
        setNewOptionGroupMax(1);
        setNewOptionItems([{ name: "", extraPrice: 0 }]);
        setNewOptionByGroup({});
        setOptionGroupDrafts({});
        setOptionDrafts({});
        setOptionsModal({
            open: true,
            productId: product.id,
            productName: product.name,
        });
    };

    const handleCreateOptionGroup = async () => {
        if (!optionsModal.productId) return;
        if (!newOptionGroupName.trim()) {
            setOptionsError("Option group name is required");
            return;
        }

        const cleanedOptions = newOptionItems
            .map((item, index) => ({
                name: item.name.trim(),
                extraPrice: Number(item.extraPrice) || 0,
                displayOrder: index,
            }))
            .filter((item) => item.name.length > 0);

        if (cleanedOptions.length === 0) {
            setOptionsError("Add at least one option");
            return;
        }

        if (newOptionGroupMax < newOptionGroupMin) {
            setOptionsError("Max selections must be greater than or equal to min selections");
            return;
        }

        setOptionsLoading(true);
        setOptionsError("");

        try {
            await createOptionGroup({
                variables: {
                    input: {
                        productId: optionsModal.productId,
                        name: newOptionGroupName.trim(),
                        minSelections: newOptionGroupMin,
                        maxSelections: newOptionGroupMax,
                        displayOrder: (productOptionsData?.product?.optionGroups?.length || 0) + 1,
                        options: cleanedOptions,
                    },
                },
            });

            setNewOptionGroupName("");
            setNewOptionGroupMin(0);
            setNewOptionGroupMax(1);
            setNewOptionItems([{ name: "", extraPrice: 0 }]);
            await refetchProductOptions();
        } catch (error) {
            setOptionsError((error as Error).message || "Failed to create option group");
        } finally {
            setOptionsLoading(false);
        }
    };

    const handleDeleteOptionGroup = async (id: string) => {
        setOptionsLoading(true);
        setOptionsError("");
        try {
            await deleteOptionGroup({ variables: { id } });
            await refetchProductOptions();
        } catch (error) {
            setOptionsError((error as Error).message || "Failed to delete option group");
        } finally {
            setOptionsLoading(false);
        }
    };

    const handleSaveOptionGroup = async (
        groupId: string,
        fallbackName: string,
        fallbackMin: number,
        fallbackMax: number
    ) => {
        const draft = optionGroupDrafts[groupId] || {
            name: fallbackName,
            min: fallbackMin,
            max: fallbackMax,
        };

        const name = draft.name.trim();
        if (!name) {
            setOptionsError("Question title is required");
            return;
        }
        if (draft.max < draft.min) {
            setOptionsError("Question max selections must be greater than or equal to min selections");
            return;
        }

        setOptionsLoading(true);
        setOptionsError("");
        try {
            await updateOptionGroup({
                variables: {
                    id: groupId,
                    input: {
                        name,
                        minSelections: Number(draft.min) || 0,
                        maxSelections: Number(draft.max) || 0,
                    },
                },
            });
            await refetchProductOptions();
        } catch (error) {
            setOptionsError((error as Error).message || "Failed to update question");
        } finally {
            setOptionsLoading(false);
        }
    };

    const handleCreateOption = async (optionGroupId: string) => {
        const draft = newOptionByGroup[optionGroupId] || { name: "", extraPrice: 0 };
        const name = draft.name.trim();

        if (!name) {
            setOptionsError("Answer text is required");
            return;
        }

        const group = productOptionsData?.product?.optionGroups?.find((g) => g.id === optionGroupId);
        const displayOrder = group?.options?.length || 0;

        setOptionsLoading(true);
        setOptionsError("");
        try {
            let imageUrl: string | undefined;
            if (draft.imageFile) {
                const url = await uploadImage(draft.imageFile, 'options');
                if (url) imageUrl = url;
            }

            await createOption({
                variables: {
                    optionGroupId,
                    input: {
                        name,
                        extraPrice: Number(draft.extraPrice) || 0,
                        imageUrl: imageUrl ?? null,
                        displayOrder,
                    },
                },
            });

            setNewOptionByGroup((prev) => ({
                ...prev,
                [optionGroupId]: { name: "", extraPrice: 0, imageFile: null, imagePreview: null },
            }));
            await refetchProductOptions();
        } catch (error) {
            setOptionsError((error as Error).message || "Failed to add answer");
        } finally {
            setOptionsLoading(false);
        }
    };

    const handleSaveOption = async (optionId: string, fallbackName: string, fallbackExtraPrice: number) => {
        const draft = optionDrafts[optionId] || { name: fallbackName, extraPrice: fallbackExtraPrice };
        const name = draft.name.trim();

        if (!name) {
            setOptionsError("Answer text is required");
            return;
        }

        setOptionsLoading(true);
        setOptionsError("");
        try {
            let imageUrl: string | undefined;
            if (draft.imageFile) {
                const url = await uploadImage(draft.imageFile, 'options');
                if (url) imageUrl = url;
            }

            await updateOption({
                variables: {
                    id: optionId,
                    input: {
                        name,
                        extraPrice: Number(draft.extraPrice) || 0,
                        ...(imageUrl !== undefined ? { imageUrl } : {}),
                    },
                },
            });
            // Clear the draft image after successful save
            if (draft.imageFile) {
                setOptionDrafts((prev) => ({
                    ...prev,
                    [optionId]: { ...prev[optionId]!, imageFile: null, imagePreview: null },
                }));
            }
            await refetchProductOptions();
        } catch (error) {
            setOptionsError((error as Error).message || "Failed to update answer");
        } finally {
            setOptionsLoading(false);
        }
    };

    const handleDeleteOption = async (optionId: string) => {
        setOptionsLoading(true);
        setOptionsError("");
        try {
            await deleteOption({ variables: { id: optionId } });
            await refetchProductOptions();
        } catch (error) {
            setOptionsError((error as Error).message || "Failed to delete answer");
        } finally {
            setOptionsLoading(false);
        }
    };

    const requestDeleteOptionGroup = (id: string, name: string) => {
        setOptionsDeleteTarget({ kind: "group", id, name });
    };

    const requestDeleteOption = (id: string, name: string) => {
        setOptionsDeleteTarget({ kind: "option", id, name });
    };

    const confirmDeleteOptionEntity = async () => {
        if (!optionsDeleteTarget) return;

        if (optionsDeleteTarget.kind === "group") {
            await handleDeleteOptionGroup(optionsDeleteTarget.id);
        } else {
            await handleDeleteOption(optionsDeleteTarget.id);
        }

        setOptionsDeleteTarget(null);
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
            saleDiscountPercentage: p.saleDiscountPercentage || undefined,
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

        // Upload new image if file is selected; delete old S3 image first
        if (editImageFile) {
            if (editForm.imageUrl) {
                await deleteImage(editForm.imageUrl);
            }
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
            isOffer: isPlatformAdminRole ? input.isOffer : undefined,
            name: input.name,
            description: input.description || undefined,
            imageUrl: imageUrl || undefined,
            price: Number(input.price),
            isOnSale: input.isOnSale,
            saleDiscountPercentage: input.isOnSale ? Number(input.saleDiscountPercentage) : undefined,
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

    const toggleSortMode = () => {
        if (!sortMode) {
            const initialOrders: Record<string, string[]> = {};
            categories.forEach((category) => {
                const items = (grouped[category.id] || [])
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => item.id);
                initialOrders[category.id] = items;
            });
            setOrderByCategory(initialOrders);
        }

        setSortMode((prev) => !prev);
    };

    const handleDragEnd = async (categoryId: string, event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const currentOrder = orderByCategory[categoryId] || [];
        const oldIndex = currentOrder.indexOf(String(active.id));
        const newIndex = currentOrder.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;

        const nextOrder = arrayMove(currentOrder, oldIndex, newIndex);
        setOrderByCategory((prev) => ({
            ...prev,
            [categoryId]: nextOrder,
        }));

        const payload = nextOrder.map((id, index) => ({ id, sortOrder: index }));
        const result = await updateProductsOrder(businessId, payload);
        if (!result.success) {
            toast.error(result.error || "Failed to update product order.");
            await refetch();
            return;
        }

        await refetch();
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
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={products.length === 0}
                        title="Export all products as JSON"
                    >
                        <Download size={14} className="mr-1 inline" />
                        Export JSON
                    </Button>
                    <Button
                        variant={sortMode ? "primary" : "outline"}
                        onClick={toggleSortMode}
                        disabled={updateOrderLoading}
                    >
                        {sortMode ? "Done Sorting" : "Sort Items"}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setCreateOpen(true)}
                        disabled={createLoading}
                    >
                        {createLoading ? "Adding..." : "+ Add Product"}
                    </Button>
                </div>
            </div>

            {sortMode && (
                <p className="text-xs text-gray-400 mb-4">
                    Sorting is applied inside each category. Use arrow controls to move items up or down.
                </p>
            )}

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
                const sortedItems = (() => {
                    if (!sortMode) return items;
                    const order = orderByCategory[cat.id] || [];
                    if (order.length === 0) return items;
                    const orderMap = new Map(order.map((id, index) => [id, index]));
                    return [...items].sort((a, b) => {
                        const aOrder = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
                        const bOrder = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
                        return aOrder - bOrder;
                    });
                })();

                return (
                    <div key={cat.id} className="mb-10">
                        <h3 className="text-lg font-semibold text-purple-300 mb-3">
                            {cat.name}
                        </h3>

                        {sortedItems.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                                No products here.
                            </p>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event) => handleDragEnd(cat.id, event)}
                            >
                                <Table>
                                    <thead>
                                        <tr>
                                            {sortMode && <Th></Th>}
                                            <Th>Image</Th>
                                            <Th>Name</Th>
                                            <Th>Subcategory</Th>
                                            <Th>Price</Th>
                                            <Th>Sale</Th>
                                            <Th>Status</Th>
                                            <Th>Actions</Th>
                                        </tr>
                                    </thead>

                                    <SortableContext
                                        items={sortedItems.map((p) => p.id)}
                                        strategy={verticalListSortingStrategy}
                                        disabled={!sortMode}
                                    >
                                        <tbody>
                                    {sortedItems.map((p) => (
                                        <SortableProductRow key={p.id} id={p.id} sortMode={sortMode}>
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

                                            <Td>
                                                <div className="flex flex-col gap-1">
                                                    <span>{p.name}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.variantGroupId && (
                                                            <span className="inline-flex items-center rounded-full bg-violet-500/20 border border-violet-500/40 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                                                                Variant: {p.variantGroupName || 'Group'}
                                                            </span>
                                                        )}
                                                        {p.isOffer && (
                                                            <span className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                                                Offer
                                                            </span>
                                                        )}
                                                        {p.hasOptionGroups && (
                                                            <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                                                                Has Options
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Td>

                                            <Td>
                                                {subcategories.find((s: any) => s.id === p.subcategoryId)?.name || "-"}
                                            </Td>

                                            <Td>€{p.price.toFixed(2)}</Td>

                                            <Td>
                                                {p.isOnSale &&
                                                p.saleDiscountPercentage != null ? (
                                                    <span className="text-green-400">
                                                        {p.saleDiscountPercentage}% off
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
                                                        variant="outline"
                                                        className="text-xs px-3"
                                                        onClick={() => openOptionsModal(p)}
                                                    >
                                                        Options
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
                                        </SortableProductRow>
                                    ))}
                                </tbody>
                                    </SortableContext>
                                </Table>
                            </DndContext>
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

                    {isPlatformAdminRole && (
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
                    )}

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
                                Discount % (0–100)
                            </label>
                            <Input
                                placeholder="e.g. 20"
                                type="number"
                                step="1"
                                min="1"
                                max="100"
                                value={createForm.saleDiscountPercentage || ""}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        saleDiscountPercentage: e.target.value ? Number(e.target.value) : undefined,
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

                    {isPlatformAdminRole && createForm.isOffer && (
                        <p className="text-xs text-gray-400">
                            Tip: after saving this offer, you can configure option groups and choices in the Options modal.
                        </p>
                    )}
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

                    {isPlatformAdminRole && (
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
                    )}

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
                                Discount % (0–100)
                            </label>
                            <Input
                                placeholder="e.g. 20"
                                type="number"
                                step="1"
                                min="1"
                                max="100"
                                value={editForm.saleDiscountPercentage || ""}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        saleDiscountPercentage: e.target.value ? Number(e.target.value) : undefined,
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

            <Modal
                isOpen={optionsModal.open}
                onClose={() => setOptionsModal({ open: false, productId: "", productName: "" })}
                title={`Manage Questions & Answers - ${optionsModal.productName}`}
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    <p className="text-xs text-gray-400">
                        Use questions for sections (for example: "Choose Size") and answers for selectable choices (for example: "Large", "+$1.50").
                    </p>

                    <div className="flex justify-end">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                                const section = document.getElementById("add-new-question-section");
                                if (section) {
                                    section.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                            }}
                        >
                            Add New Question
                        </Button>
                    </div>

                    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3">
                        <p className="text-sm font-medium text-gray-200 mb-2">Current Questions & Answers</p>
                        {productOptionsData?.product?.optionGroups?.length ? (
                            <div className="space-y-2">
                                {productOptionsData.product.optionGroups.map((group) => (
                                    <div key={group.id} className="rounded border border-gray-700 p-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 space-y-2">
                                                <label className="block text-xs text-gray-400">Question title</label>
                                                <Input
                                                    value={optionGroupDrafts[group.id]?.name ?? group.name}
                                                    onChange={(e) =>
                                                        setOptionGroupDrafts((prev) => ({
                                                            ...prev,
                                                            [group.id]: {
                                                                name: e.target.value,
                                                                min: prev[group.id]?.min ?? group.minSelections,
                                                                max: prev[group.id]?.max ?? group.maxSelections,
                                                            },
                                                        }))
                                                    }
                                                />
                                                <p className="text-[11px] text-gray-500">Example: Choose Size, Pick a Drink, Select Extra Toppings</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Min selections</label>
                                                    <Input
                                                        type="number"
                                                        value={optionGroupDrafts[group.id]?.min ?? group.minSelections}
                                                        onChange={(e) =>
                                                            setOptionGroupDrafts((prev) => ({
                                                                ...prev,
                                                                [group.id]: {
                                                                    name: prev[group.id]?.name ?? group.name,
                                                                    min: Number(e.target.value) || 0,
                                                                    max: prev[group.id]?.max ?? group.maxSelections,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <p className="text-[11px] text-gray-500 mt-1">Minimum answers required</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Max selections</label>
                                                    <Input
                                                        type="number"
                                                        value={optionGroupDrafts[group.id]?.max ?? group.maxSelections}
                                                        onChange={(e) =>
                                                            setOptionGroupDrafts((prev) => ({
                                                                ...prev,
                                                                [group.id]: {
                                                                    name: prev[group.id]?.name ?? group.name,
                                                                    min: prev[group.id]?.min ?? group.minSelections,
                                                                    max: Number(e.target.value) || 0,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <p className="text-[11px] text-gray-500 mt-1">Maximum answers allowed</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleSaveOptionGroup(
                                                            group.id,
                                                            group.name,
                                                            group.minSelections,
                                                            group.maxSelections
                                                        )
                                                    }
                                                    disabled={optionsLoading}
                                                >
                                                    Save Question
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => requestDeleteOptionGroup(group.id, group.name)}
                                                    disabled={optionsLoading}
                                                >
                                                    Delete Group
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-2 space-y-2">
                                            {group.options.map((opt) => (
                                                <div key={opt.id} className="grid grid-cols-[48px_1fr_110px_auto_auto] gap-2 items-center">
                                                    <div className="relative">
                                                        <label className="block text-xs text-gray-400 mb-1">Image</label>
                                                        <label className="cursor-pointer block">
                                                            {(optionDrafts[opt.id]?.imagePreview || opt.imageUrl) ? (
                                                                <img
                                                                    src={optionDrafts[opt.id]?.imagePreview || opt.imageUrl!}
                                                                    alt=""
                                                                    className="w-10 h-10 rounded-lg object-cover border border-gray-600"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg border border-dashed border-gray-600 flex items-center justify-center text-gray-500 text-xs">+</div>
                                                            )}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    const preview = URL.createObjectURL(file);
                                                                    setOptionDrafts((prev) => ({
                                                                        ...prev,
                                                                        [opt.id]: {
                                                                            name: prev[opt.id]?.name ?? opt.name,
                                                                            extraPrice: prev[opt.id]?.extraPrice ?? opt.extraPrice,
                                                                            imageFile: file,
                                                                            imagePreview: preview,
                                                                        },
                                                                    }));
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Answer text</label>
                                                        <Input
                                                            value={optionDrafts[opt.id]?.name ?? opt.name}
                                                            onChange={(e) =>
                                                                setOptionDrafts((prev) => ({
                                                                    ...prev,
                                                                    [opt.id]: {
                                                                        name: e.target.value,
                                                                        extraPrice: prev[opt.id]?.extraPrice ?? opt.extraPrice,
                                                                        imageFile: prev[opt.id]?.imageFile,
                                                                        imagePreview: prev[opt.id]?.imagePreview,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Extra price</label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={optionDrafts[opt.id]?.extraPrice ?? opt.extraPrice}
                                                            onChange={(e) =>
                                                                setOptionDrafts((prev) => ({
                                                                    ...prev,
                                                                    [opt.id]: {
                                                                        name: prev[opt.id]?.name ?? opt.name,
                                                                        extraPrice: Number(e.target.value) || 0,
                                                                        imageFile: prev[opt.id]?.imageFile,
                                                                        imagePreview: prev[opt.id]?.imagePreview,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSaveOption(opt.id, opt.name, opt.extraPrice)}
                                                        disabled={optionsLoading}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => requestDeleteOption(opt.id, opt.name)}
                                                        disabled={optionsLoading}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            ))}

                                            <div className="grid grid-cols-[48px_1fr_110px_auto] gap-2 items-center border-t border-gray-700 pt-2 mt-2">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Image</label>
                                                    <label className="cursor-pointer block">
                                                        {newOptionByGroup[group.id]?.imagePreview ? (
                                                            <img
                                                                src={newOptionByGroup[group.id]!.imagePreview!}
                                                                alt=""
                                                                className="w-10 h-10 rounded-lg object-cover border border-gray-600"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg border border-dashed border-gray-600 flex items-center justify-center text-gray-500 text-xs">+</div>
                                                        )}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const preview = URL.createObjectURL(file);
                                                                setNewOptionByGroup((prev) => ({
                                                                    ...prev,
                                                                    [group.id]: {
                                                                        name: prev[group.id]?.name ?? "",
                                                                        extraPrice: prev[group.id]?.extraPrice ?? 0,
                                                                        imageFile: file,
                                                                        imagePreview: preview,
                                                                    },
                                                                }));
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">New answer text</label>
                                                    <Input
                                                        placeholder="Add answer"
                                                        value={newOptionByGroup[group.id]?.name ?? ""}
                                                        onChange={(e) =>
                                                            setNewOptionByGroup((prev) => ({
                                                                ...prev,
                                                                [group.id]: {
                                                                    name: e.target.value,
                                                                    extraPrice: prev[group.id]?.extraPrice ?? 0,
                                                                    imageFile: prev[group.id]?.imageFile,
                                                                    imagePreview: prev[group.id]?.imagePreview,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <p className="text-[11px] text-gray-500 mt-1">Example: Medium, Coke, Add Ketchup</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Extra price</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Extra"
                                                        value={newOptionByGroup[group.id]?.extraPrice ?? 0}
                                                        onChange={(e) =>
                                                            setNewOptionByGroup((prev) => ({
                                                                ...prev,
                                                                [group.id]: {
                                                                    name: prev[group.id]?.name ?? "",
                                                                    extraPrice: Number(e.target.value) || 0,
                                                                    imageFile: prev[group.id]?.imageFile,
                                                                    imagePreview: prev[group.id]?.imagePreview,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <p className="text-[11px] text-gray-500 mt-1">Enter amount added to base price</p>
                                                </div>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleCreateOption(group.id)}
                                                    disabled={optionsLoading}
                                                >
                                                    Add Answer
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No option groups yet.</p>
                        )}
                    </div>

                    <div id="add-new-question-section" className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 space-y-3">
                        <p className="text-sm font-medium text-violet-100">Add New Question</p>
                        <label className="block text-xs text-violet-200">Question title</label>
                        <Input
                            placeholder="Question title (e.g., Choose Sauce)"
                            value={newOptionGroupName}
                            onChange={(e) => setNewOptionGroupName(e.target.value)}
                        />
                        <p className="text-[11px] text-violet-200/80">This is what customer sees before choosing answers</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-violet-200 mb-1">Min selections</label>
                                <Input
                                    type="number"
                                    placeholder="Min selections"
                                    value={newOptionGroupMin}
                                    onChange={(e) => setNewOptionGroupMin(Number(e.target.value) || 0)}
                                />
                                <p className="text-[11px] text-violet-200/80 mt-1">Set 0 if optional</p>
                            </div>
                            <div>
                                <label className="block text-xs text-violet-200 mb-1">Max selections</label>
                                <Input
                                    type="number"
                                    placeholder="Max selections"
                                    value={newOptionGroupMax}
                                    onChange={(e) => setNewOptionGroupMax(Number(e.target.value) || 0)}
                                />
                                <p className="text-[11px] text-violet-200/80 mt-1">Set 1 for single-choice</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {newOptionItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_120px_auto] gap-2">
                                    <div>
                                        <label className="block text-xs text-violet-200 mb-1">Answer {idx + 1}</label>
                                        <Input
                                            placeholder={`Answer ${idx + 1} text`}
                                            value={item.name}
                                            onChange={(e) => {
                                                const next = [...newOptionItems];
                                                next[idx] = { ...next[idx], name: e.target.value };
                                                setNewOptionItems(next);
                                            }}
                                        />
                                        <p className="text-[11px] text-violet-200/80 mt-1">Visible choice label</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-violet-200 mb-1">Extra price</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Extra"
                                            value={item.extraPrice}
                                            onChange={(e) => {
                                                const next = [...newOptionItems];
                                                next[idx] = { ...next[idx], extraPrice: Number(e.target.value) || 0 };
                                                setNewOptionItems(next);
                                            }}
                                        />
                                        <p className="text-[11px] text-violet-200/80 mt-1">Additional amount for this answer</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setNewOptionItems((prev) => prev.filter((_, i) => i !== idx));
                                        }}
                                        disabled={newOptionItems.length <= 1}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => setNewOptionItems((prev) => [...prev, { name: "", extraPrice: 0 }])}
                        >
                            Add Option Row
                        </Button>

                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleCreateOptionGroup}
                            disabled={optionsLoading}
                        >
                            {optionsLoading ? "Saving..." : "Save Option Group"}
                        </Button>

                        {optionsError && <p className="text-sm text-red-400">{optionsError}</p>}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={optionsDeleteTarget !== null}
                onClose={() => setOptionsDeleteTarget(null)}
                title={optionsDeleteTarget?.kind === "group" ? "Delete Question" : "Delete Answer"}
            >
                <p className="text-gray-300 mb-4">
                    Are you sure you want to delete <strong>{optionsDeleteTarget?.name}</strong>?
                </p>

                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setOptionsDeleteTarget(null)}
                        disabled={optionsLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={confirmDeleteOptionEntity}
                        disabled={optionsLoading}
                    >
                        {optionsLoading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

function SortableProductRow({
    id,
    sortMode,
    children,
}: {
    id: string;
    sortMode: boolean;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={isDragging ? "opacity-60" : ""}
        >
            {sortMode && (
                <Td>
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="inline-flex items-center justify-center rounded border border-violet-500/30 bg-violet-500/10 p-1 text-violet-300 hover:bg-violet-500/20"
                        aria-label="Reorder product"
                    >
                        <GripVertical size={14} />
                    </button>
                </Td>
            )}
            {children}
        </tr>
    );
}
