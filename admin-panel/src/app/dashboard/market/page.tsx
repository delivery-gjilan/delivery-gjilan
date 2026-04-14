"use client";

import { useState, useMemo, useEffect } from "react";
import { useBusinesses } from "@/lib/hooks/useBusinesses";
import { useAuth } from "@/lib/auth-context";
import {
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
} from "@/lib/hooks/useProductCategories";
import {
    useProductSubcategories,
    useCreateProductSubcategory,
    useUpdateProductSubcategory,
    useDeleteProductSubcategory,
} from "@/lib/hooks/useProductSubcategories";
import {
    useProducts,
    useCreateProduct,
    useUpdateProduct,
    useDeleteProduct,
    useUpdateProductsOrder,
    useCreateProductVariantGroup,
    useDeleteProductVariantGroup,
} from "@/lib/hooks/useProducts";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
    Plus,
    Package,
    Search,
    ShoppingBag,
    Grid3x3,
    LayoutGrid,
    X,
    GripVertical,
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import ManageCategoriesPanel from "@/components/market/ManageCategoriesPanel";
import ProductRow from "@/components/market/ProductRow";
import CategoryModal from "@/components/market/CategoryModal";
import SubcategoryModal from "@/components/market/SubcategoryModal";
import ProductModal from "@/components/market/ProductModal";
import MarketDeleteModal from "@/components/market/MarketDeleteModal";
import type { Category, Subcategory } from "@/components/market/ManageCategoriesPanel";
import type { Product } from "@/components/market/ProductRow";
import type { CategoryModalState } from "@/components/market/CategoryModal";
import type { SubcategoryModalState } from "@/components/market/SubcategoryModal";
import type { ProductModalState } from "@/components/market/ProductModal";
import type { DeleteModalData } from "@/components/market/MarketDeleteModal";

interface VariantGroupOption {
    id: string;
    name: string;
}

/* ===============================================
   MAIN PAGE
=============================================== */

export default function MarketPage() {
    const { businesses, loading: businessesLoading } = useBusinesses();
    const { admin } = useAuth();

    const marketBusiness = useMemo(() => {
        return businesses.find((business) => business.businessType === "MARKET");
    }, [businesses]);

    const effectiveBusinessId = useMemo(() => {
        if (admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE") return admin?.businessId ?? "";
        return marketBusiness?.id ?? "";
    }, [admin?.businessId, admin?.role, marketBusiness?.id]);

    if (businessesLoading) {
        return (
            <div className="text-white">
                <div className="flex justify-between items-center mb-5">
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Market</h1>
                </div>
                <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="text-white space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Market</h1>
                {marketBusiness && (
                    <span className="text-sm text-zinc-500">{marketBusiness.name}</span>
                )}
            </div>

            {effectiveBusinessId ? (
                <MarketContent businessId={effectiveBusinessId} />
            ) : (
                <div className="bg-[#111113] border border-[#1e1e22] rounded-xl p-12 text-center">
                    <ShoppingBag className="mx-auto mb-4 text-zinc-700" size={48} />
                    <p className="text-zinc-500">No market business found. Create one first.</p>
                </div>
            )}
        </div>
    );
}

/* ===============================================
   MARKET CONTENT
=============================================== */

function MarketContent({ businessId }: { businessId: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("all");
    const [showManageCategories, setShowManageCategories] = useState(false);
    const [sortMode, setSortMode] = useState(false);
    const [productOrder, setProductOrder] = useState<string[]>([]);

    // Data hooks
    const { categories, loading: categoriesLoading, refetch: refetchCategories } = useCategories(businessId);
    const { subcategories, refetch: refetchSubcategories } = useProductSubcategories(businessId);
    const { products, refetch: refetchProducts } = useProducts(businessId);

    // Category operations
    const { create: createCategory } = useCreateCategory();
    const { update: updateCategory } = useUpdateCategory();
    const { delete: deleteCategory } = useDeleteCategory();

    // Subcategory operations
    const { create: createSubcategory } = useCreateProductSubcategory();
    const { update: updateSubcategory } = useUpdateProductSubcategory();
    const { delete: deleteSubcategory } = useDeleteProductSubcategory();

    // Product operations
    const { create: createProduct } = useCreateProduct();
    const { update: updateProduct } = useUpdateProduct();
    const { delete: deleteProduct } = useDeleteProduct();
    const { updateOrder: updateProductsOrder } = useUpdateProductsOrder();
    const { createVariantGroup } = useCreateProductVariantGroup();
    const { deleteVariantGroup } = useDeleteProductVariantGroup();

    // Modal states
    const [categoryModal, setCategoryModal] = useState<CategoryModalState>({ open: false, mode: 'create' });
    const [subcategoryModal, setSubcategoryModal] = useState<SubcategoryModalState>({ open: false, mode: 'create' });
    const [productModal, setProductModal] = useState<ProductModalState>({ open: false, mode: 'create' });
    const [deleteModal, setDeleteModal] = useState<(DeleteModalData & { open: boolean }) | null>(null);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Get subcategories for selected category
    const availableSubcategories = useMemo(() => {
        if (selectedCategoryId === "all") return [];
        return (subcategories as Subcategory[]).filter((s) => s.categoryId === selectedCategoryId);
    }, [selectedCategoryId, subcategories]);

    const variantGroups = useMemo<VariantGroupOption[]>(() => {
        const deduped = new Map<string, VariantGroupOption>();
        (products as Product[]).forEach((product) => {
            if (!product.variantGroupId) return;
            if (deduped.has(product.variantGroupId)) return;
            deduped.set(product.variantGroupId, {
                id: product.variantGroupId,
                name: product.variantGroupName || `Variant Group ${product.variantGroupId.slice(0, 6)}`,
            });
        });
        return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let filtered = [...products] as Product[];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
            );
        }

        if (selectedCategoryId !== "all") {
            filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
        }

        if (selectedSubcategoryId !== "all") {
            filtered = filtered.filter((p) => p.subcategoryId === selectedSubcategoryId);
        }

        if (sortMode && productOrder.length > 0) {
            const orderMap = new Map(productOrder.map((id, index) => [id, index]));
            filtered.sort((a, b) => {
                const aOrder = orderMap.get(a.id) ?? 999999;
                const bOrder = orderMap.get(b.id) ?? 999999;
                return aOrder - bOrder;
            });
        } else {
            filtered.sort((a, b) => a.sortOrder - b.sortOrder);
        }

        return filtered;
    }, [products, searchQuery, selectedCategoryId, selectedSubcategoryId, sortMode, productOrder]);

    // Stable product IDs key
    const productIdsKey = useMemo(() => products.map((p) => p.id).sort().join(','), [products]);

    // Initialize product order
    useEffect(() => {
        if (productOrder.length === 0 && products.length > 0) {
            const initialOrder = [...products]
                .filter((p) => {
                    if (selectedCategoryId !== "all" && p.categoryId !== selectedCategoryId) return false;
                    if (selectedSubcategoryId !== "all" && p.subcategoryId !== selectedSubcategoryId) return false;
                    return true;
                })
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((p) => p.id);
            setProductOrder(initialOrder);
        }
    }, [productIdsKey, productOrder.length, selectedCategoryId, selectedSubcategoryId]);

    // Update product order when filters change in sort mode
    useEffect(() => {
        if (sortMode) {
            let filtered = [...products] as Product[];

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(
                    (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
                );
            }

            if (selectedCategoryId !== "all") {
                filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
            }

            if (selectedSubcategoryId !== "all") {
                filtered = filtered.filter((p) => p.subcategoryId === selectedSubcategoryId);
            }

            filtered.sort((a, b) => a.sortOrder - b.sortOrder);
            setProductOrder(filtered.map((p) => p.id));
        }
    }, [sortMode, productIdsKey, selectedCategoryId, selectedSubcategoryId, searchQuery]);

    // Handle drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            let newOrder: string[] = [];
            setProductOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                newOrder = arrayMove(items, oldIndex, newIndex);
                return newOrder;
            });

            const productsWithOrder = newOrder.map((id, index) => ({ id, sortOrder: index }));
            await updateProductsOrder(businessId, productsWithOrder);
            await refetchProducts();
        }
    };

    // Quick toggle sale
    const toggleSale = async (product: Product) => {
        await updateProduct(product.id, {
            isOnSale: !product.isOnSale,
            saleDiscountPercentage:
                !product.isOnSale && !product.saleDiscountPercentage ? 20 : product.saleDiscountPercentage ?? undefined,
        });
        await refetchProducts();
    };

    // Quick toggle availability
    const toggleAvailability = async (product: Product) => {
        await updateProduct(product.id, { isAvailable: !product.isAvailable });
        await refetchProducts();
    };

    // Toggle sort mode
    const toggleSortMode = () => {
        if (!sortMode) {
            setProductOrder(filteredProducts.map((p) => p.id));
        }
        setSortMode(!sortMode);
    };

    if (categoriesLoading) {
        return <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />;
    }

    return (
        <div className="space-y-4">
            {/* Top Bar: Search + Actions */}
            <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <Input
                        placeholder="Search products by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button
                    variant={sortMode ? "primary" : "outline"}
                    onClick={toggleSortMode}
                    className="flex items-center gap-2"
                >
                    <GripVertical size={18} />
                    {sortMode ? "Done Sorting" : "Sort Items"}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setShowManageCategories(!showManageCategories)}
                    className="flex items-center gap-2"
                >
                    <Grid3x3 size={18} />
                    Categories
                </Button>
                <Button
                    variant="primary"
                    onClick={() => setProductModal({ open: true, mode: 'create' })}
                    className="flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add Product
                </Button>
            </div>

            {/* Sort Mode Info Banner */}
            {sortMode && (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 flex items-center gap-3">
                    <GripVertical className="text-violet-400" size={20} />
                    <p className="text-violet-300 text-sm flex-1">
                        <strong>Sort Mode Active:</strong> Drag and drop to reorder products
                        {selectedCategoryId !== "all"
                            ? ` in ${(categories as Category[]).find((c) => c.id === selectedCategoryId)?.name}`
                            : ""}
                        .
                    </p>
                    <Button variant="outline" size="sm" onClick={toggleSortMode}>
                        Done
                    </Button>
                </div>
            )}

            {/* Manage Categories Panel */}
            {showManageCategories && (
                <ManageCategoriesPanel
                    categories={categories as Category[]}
                    subcategories={subcategories as Subcategory[]}
                    onClose={() => setShowManageCategories(false)}
                    onAddCategory={() => setCategoryModal({ open: true, mode: 'create' })}
                    onEditCategory={(cat) => setCategoryModal({ open: true, mode: 'edit', data: cat })}
                    onDeleteCategory={(cat) =>
                        setDeleteModal({ open: true, type: 'category', id: cat.id, name: cat.name })
                    }
                    onAddSubcategory={(catId) =>
                        setSubcategoryModal({ open: true, mode: 'create', categoryId: catId })
                    }
                    onEditSubcategory={(subcat) =>
                        setSubcategoryModal({ open: true, mode: 'edit', data: subcat })
                    }
                    onDeleteSubcategory={(subcat) =>
                        setDeleteModal({ open: true, type: 'subcategory', id: subcat.id, name: subcat.name })
                    }
                />
            )}

            {/* Filters */}
            <div className="flex gap-3 items-center bg-[#111113] border border-[#1e1e22] rounded-xl p-4">
                <LayoutGrid className="text-violet-400" size={20} />
                <div className="flex gap-3 flex-1 items-center">
                    <Select
                        value={selectedCategoryId}
                        onChange={(e) => {
                            setSelectedCategoryId(e.target.value);
                            setSelectedSubcategoryId("all");
                        }}
                        className="flex-1"
                    >
                        <option value="all">All Categories</option>
                        {(categories as Category[]).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </Select>

                    {selectedCategoryId !== "all" && (
                        <Select
                            value={selectedSubcategoryId}
                            onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                            className="flex-1"
                        >
                            <option value="all">All Subcategories</option>
                            {availableSubcategories.map((subcat) => (
                                <option key={subcat.id} value={subcat.id}>
                                    {subcat.name}
                                </option>
                            ))}
                        </Select>
                    )}
                </div>

                {(selectedCategoryId !== "all" || selectedSubcategoryId !== "all" || searchQuery) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSelectedCategoryId("all");
                            setSelectedSubcategoryId("all");
                            setSearchQuery("");
                        }}
                        className="flex items-center gap-1"
                    >
                        <X size={14} />
                        Clear
                    </Button>
                )}
            </div>

            {/* Products Table */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="bg-[#111113] border border-[#1e1e22] rounded-xl overflow-hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="mx-auto mb-4 text-zinc-700" size={48} />
                            <p className="text-zinc-500 mb-4">
                                {searchQuery ? "No products found" : "No products yet. Add your first product!"}
                            </p>
                            {!searchQuery && (
                                <Button
                                    variant="primary"
                                    onClick={() =>
                                        setProductModal({
                                            open: true,
                                            mode: 'create',
                                            categoryId: selectedCategoryId || undefined,
                                        })
                                    }
                                >
                                    <Plus size={18} className="inline mr-2" />
                                    Add Product
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        {sortMode && (
                                            <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider w-12" />
                                        )}
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider w-20">
                                            Image
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Subcategory
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Markup
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Night
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider">
                                            Sale
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider text-center w-24">
                                            Available
                                        </th>
                                        <th className="px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider text-right w-32">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <SortableContext
                                    items={filteredProducts.map((p) => p.id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={!sortMode}
                                >
                                    <tbody>
                                        {filteredProducts.map((product) => (
                                            <ProductRow
                                                key={product.id}
                                                product={product}
                                                categoryName={
                                                    (categories as Category[]).find((c) => c.id === product.categoryId)
                                                        ?.name || "Unknown"
                                                }
                                                subcategoryName={
                                                    (subcategories as Subcategory[]).find(
                                                        (s) => s.id === product.subcategoryId
                                                    )?.name
                                                }
                                                onEdit={() =>
                                                    setProductModal({ open: true, mode: 'edit', data: product })
                                                }
                                                onDelete={() =>
                                                    setDeleteModal({
                                                        open: true,
                                                        type: 'product',
                                                        id: product.id,
                                                        name: product.name,
                                                        isOffer: product.isOffer,
                                                        variantGroupId: product.variantGroupId || undefined,
                                                        variantGroupName: product.variantGroupName || undefined,
                                                        variantGroupCount: product.variantGroupId
                                                            ? filteredProducts.filter(
                                                                  (p) =>
                                                                      p.variantGroupId === product.variantGroupId
                                                              ).length
                                                            : 0,
                                                    })
                                                }
                                                onToggleSale={() => toggleSale(product)}
                                                onToggleAvailability={() => toggleAvailability(product)}
                                                sortMode={sortMode}
                                            />
                                        ))}
                                    </tbody>
                                </SortableContext>
                            </table>
                        </div>
                    )}
                </div>
            </DndContext>

            {/* Modals */}
            <CategoryModal
                modal={categoryModal}
                onClose={() => setCategoryModal({ open: false, mode: 'create' })}
                onCreate={async (name) => {
                    const result = await createCategory({ businessId, name });
                    if (result.success) {
                        await refetchCategories();
                        setCategoryModal({ open: false, mode: 'create' });
                    }
                    return result;
                }}
                onUpdate={async (id, name, isActive) => {
                    const result = await updateCategory(id, { name, isActive });
                    if (result.success) {
                        await refetchCategories();
                        setCategoryModal({ open: false, mode: 'create' });
                    }
                    return result;
                }}
            />

            <SubcategoryModal
                modal={subcategoryModal}
                categories={categories as Category[]}
                onClose={() => setSubcategoryModal({ open: false, mode: 'create' })}
                onCreate={async (categoryId, name) => {
                    const result = await createSubcategory({ categoryId, name });
                    if (result.success) {
                        await refetchSubcategories();
                        setSubcategoryModal({ open: false, mode: 'create' });
                    }
                    return result;
                }}
                onUpdate={async (id, name) => {
                    const result = await updateSubcategory(id, { name });
                    if (result.success) {
                        await refetchSubcategories();
                        setSubcategoryModal({ open: false, mode: 'create' });
                    }
                    return result;
                }}
            />

            <ProductModal
                modal={productModal}
                businessId={businessId}
                categories={categories as Category[]}
                subcategories={subcategories as Subcategory[]}
                variantGroups={variantGroups}
                onClose={() => setProductModal({ open: false, mode: 'create' })}
                onCreate={async (input) => {
                    const result = await createProduct(input);
                    if (result.success) {
                        await refetchProducts();
                        setProductModal({ open: false, mode: 'create' });
                    }
                    return result;
                }}
                onUpdate={async (id, input) => {
                    const result = await updateProduct(id, input);
                    if (result.success) {
                        await refetchProducts();
                        setProductModal({ open: false, mode: 'create' });
                    }
                    return result;
                }}
                onCreateVariantGroup={async (name) => {
                    const result = await createVariantGroup({ businessId, name });
                    if (result.success) await refetchProducts();
                    return result;
                }}
            />

            <MarketDeleteModal
                modal={deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={async ({ deleteWholeVariantGroup }) => {
                    if (!deleteModal) return { success: false };

                    let result;
                    if (deleteModal.type === 'category') {
                        result = await deleteCategory(deleteModal.id);
                        if (result.success) await refetchCategories();
                    } else if (deleteModal.type === 'subcategory') {
                        result = await deleteSubcategory(deleteModal.id);
                        if (result.success) await refetchSubcategories();
                    } else {
                        if (deleteWholeVariantGroup && deleteModal.variantGroupId) {
                            result = await deleteVariantGroup(deleteModal.variantGroupId);
                        } else {
                            result = await deleteProduct(deleteModal.id);
                        }
                        if (result.success) await refetchProducts();
                    }

                    if (result.success) setDeleteModal(null);
                    return result;
                }}
            />
        </div>
    );
}
