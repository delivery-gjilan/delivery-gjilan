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
} from "@/lib/hooks/useProducts";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import {
    Plus,
    Edit2,
    Trash2,
    Package,
    Search,
    ShoppingBag,
    Tag,
    Grid3x3,
    LayoutGrid,
    X,
    Eye,
    EyeOff,
    GripVertical,
} from "lucide-react";
import type { CreateProductInput, UpdateProductInput } from "@/gql/graphql";
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
    useSortable,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ===============================================
   TYPES
=============================================== */

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
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    isOnSale: boolean;
    salePrice?: number | null;
    isAvailable: boolean;
    sortOrder: number;
    stock: number;
}

/* ===============================================
   MAIN COMPONENT
=============================================== */

export default function MarketPage() {
    const { businesses, loading: businessesLoading } = useBusinesses();
    const { admin } = useAuth();

    const marketBusiness = useMemo(() => {
        return businesses.find((business: any) => business.businessType === "MARKET");
    }, [businesses]);

    const effectiveBusinessId = useMemo(() => {
        if (admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE") return admin?.businessId ?? "";
        return marketBusiness?.id ?? "";
    }, [admin?.businessId, admin?.role, marketBusiness?.id]);

    if (businessesLoading) {
        return <p className="text-gray-400">Loading market...</p>;
    }

    return (
        <div className="text-white space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <ShoppingBag className="text-purple-400" size={28} />
                        Market Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Organize your market with categories, subcategories, and products
                    </p>
                </div>
                {marketBusiness && (
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Business</div>
                        <div className="text-base font-semibold text-purple-300">
                            {marketBusiness.name}
                        </div>
                    </div>
                )}
            </div>

            {effectiveBusinessId ? (
                <MarketContent businessId={effectiveBusinessId} />
            ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <ShoppingBag className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-400">
                        No market business found. Create one first.
                    </p>
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

    // Modal states
    const [categoryModal, setCategoryModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: any }>({
        open: false,
        mode: 'create',
    });
    const [subcategoryModal, setSubcategoryModal] = useState<{
        open: boolean;
        mode: 'create' | 'edit';
        categoryId?: string;
        data?: any;
    }>({ open: false, mode: 'create' });
    const [productModal, setProductModal] = useState<{
        open: boolean;
        mode: 'create' | 'edit';
        categoryId?: string;
        subcategoryId?: string;
        data?: any;
    }>({ open: false, mode: 'create' });
    const [deleteModal, setDeleteModal] = useState<{
        open: boolean;
        type: 'category' | 'subcategory' | 'product';
        id: string;
        name: string;
    } | null>(null);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Get subcategories for selected category
    const availableSubcategories = useMemo(() => {
        if (selectedCategoryId === "all") return [];
        return (subcategories as Subcategory[]).filter((s) => s.categoryId === selectedCategoryId);
    }, [selectedCategoryId, subcategories]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let filtered = [...products] as Product[];

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query)
            );
        }

        // Filter by category
        if (selectedCategoryId !== "all") {
            filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
        }

        // Filter by subcategory
        if (selectedSubcategoryId !== "all") {
            filtered = filtered.filter((p) => p.subcategoryId === selectedSubcategoryId);
        }

        // Apply custom order if in sort mode and order exists
        if (sortMode && productOrder.length > 0) {
            const orderMap = new Map(productOrder.map((id, index) => [id, index]));
            filtered.sort((a, b) => {
                const aOrder = orderMap.get(a.id) ?? 999999;
                const bOrder = orderMap.get(b.id) ?? 999999;
                return aOrder - bOrder;
            });
        } else {
            // When not in sort mode, respect the database sortOrder
            filtered.sort((a, b) => a.sortOrder - b.sortOrder);
        }

        return filtered;
    }, [products, searchQuery, selectedCategoryId, selectedSubcategoryId, sortMode, productOrder]);

    // Stable product IDs key for dependency
    const productIdsKey = useMemo(() => 
        products.map(p => p.id).sort().join(','),
        [products]
    );

    // Initialize product order
    useEffect(() => {
        if (productOrder.length === 0 && products.length > 0) {
            const initialOrder = [...products]
                .filter(p => {
                    if (selectedCategoryId !== "all" && p.categoryId !== selectedCategoryId) return false;
                    if (selectedSubcategoryId !== "all" && p.subcategoryId !== selectedSubcategoryId) return false;
                    return true;
                })
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(p => p.id);
            setProductOrder(initialOrder);
        }
    }, [productIdsKey, productOrder.length, selectedCategoryId, selectedSubcategoryId]);

    // Update product order when filters change in sort mode
    useEffect(() => {
        if (sortMode) {
            // Recalculate filtered products without depending on filteredProducts memo
            let filtered = [...products] as Product[];

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(
                    (p) =>
                        p.name.toLowerCase().includes(query) ||
                        p.description?.toLowerCase().includes(query)
                );
            }

            if (selectedCategoryId !== "all") {
                filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
            }

            if (selectedSubcategoryId !== "all") {
                filtered = filtered.filter((p) => p.subcategoryId === selectedSubcategoryId);
            }

            filtered.sort((a, b) => a.sortOrder - b.sortOrder);
            setProductOrder(filtered.map(p => p.id));
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

            // Update sortOrder for the currently filtered/visible products only
            const productsWithOrder = newOrder.map((id, index) => ({
                id,
                sortOrder: index,
            }));

            await updateProductsOrder(businessId, productsWithOrder);
            await refetchProducts();
        }
    };

    // Quick toggle sale
    const toggleSale = async (product: Product) => {
        await updateProduct(product.id, {
            isOnSale: !product.isOnSale,
            salePrice: !product.isOnSale && !product.salePrice ? product.price * 0.8 : product.salePrice,
        });
        await refetchProducts();
    };

    // Quick toggle availability
    const toggleAvailability = async (product: Product) => {
        await updateProduct(product.id, {
            isAvailable: !product.isAvailable,
        });
        await refetchProducts();
    };

    // Toggle sort mode
    const toggleSortMode = () => {
        if (!sortMode) {
            // Entering sort mode - initialize order with current filtered products
            setProductOrder(filteredProducts.map(p => p.id));
        }
        setSortMode(!sortMode);
    };

    if (categoriesLoading) {
        return <p className="text-gray-400">Loading...</p>;
    }

    return (
        <div className="space-y-4">
            {/* Top Bar: Search + Actions */}
            <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
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
                <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-3 flex items-center gap-3">
                    <GripVertical className="text-purple-400" size={20} />
                    <p className="text-purple-200 text-sm flex-1">
                        <strong>Sort Mode Active:</strong> Drag and drop to reorder products{selectedCategoryId !== "all" ? ` in ${(categories as Category[]).find(c => c.id === selectedCategoryId)?.name}` : ""}.
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
            <div className="flex gap-3 items-center bg-gray-900 border border-gray-800 rounded-xl p-4">
                <LayoutGrid className="text-purple-400" size={20} />
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
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="mx-auto mb-4 text-gray-600" size={48} />
                            <p className="text-gray-400 mb-4">
                                {searchQuery
                                    ? "No products found"
                                    : "No products yet. Add your first product!"}
                            </p>
                            {!searchQuery && (
                                <Button
                                    variant="primary"
                                    onClick={() => setProductModal({ open: true, mode: 'create', categoryId: selectedCategoryId || undefined })}
                                >
                                    <Plus size={18} className="inline mr-2" />
                                    Add Product
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-800/50 border-b border-gray-700">
                                    <tr>
                                        {sortMode && (
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-12">
                                                
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-20">
                                            Image
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Subcategory
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                            Stock
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-24">
                                            On Sale
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-24">
                                            Available
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <SortableContext
                                    items={filteredProducts.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={!sortMode}
                                >
                                    <tbody className="divide-y divide-gray-800">
                                        {filteredProducts.map((product) => (
                                            <ProductRow
                                                key={product.id}
                                                product={product}
                                                categoryName={
                                                    (categories as Category[]).find((c) => c.id === product.categoryId)?.name ||
                                                    "Unknown"
                                                }
                                                subcategoryName={
                                                    (subcategories as Subcategory[]).find(
                                                        (s) => s.id === product.subcategoryId
                                                    )?.name
                                                }
                                                onEdit={() => setProductModal({ open: true, mode: 'edit', data: product })}
                                                onDelete={() =>
                                                    setDeleteModal({
                                                        open: true,
                                                        type: 'product',
                                                        id: product.id,
                                                        name: product.name,
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
            />

            <DeleteModal
                modal={deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={async () => {
                    if (!deleteModal) return { success: false };
                    
                    let result;
                    if (deleteModal.type === 'category') {
                        result = await deleteCategory(deleteModal.id);
                        if (result.success) await refetchCategories();
                    } else if (deleteModal.type === 'subcategory') {
                        result = await deleteSubcategory(deleteModal.id);
                        if (result.success) await refetchSubcategories();
                    } else {
                        result = await deleteProduct(deleteModal.id);
                        if (result.success) await refetchProducts();
                    }
                    
                    if (result.success) {
                        setDeleteModal(null);
                    }
                    return result;
                }}
            />
        </div>
    );
}

/* ===============================================
   MANAGE CATEGORIES PANEL
=============================================== */

interface ManageCategoriesPanelProps {
    categories: Category[];
    subcategories: Subcategory[];
    onClose: () => void;
    onAddCategory: () => void;
    onEditCategory: (cat: Category) => void;
    onDeleteCategory: (cat: Category) => void;
    onAddSubcategory: (catId: string) => void;
    onEditSubcategory: (subcat: Subcategory) => void;
    onDeleteSubcategory: (subcat: Subcategory) => void;
}

function ManageCategoriesPanel({
    categories,
    subcategories,
    onClose,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    onAddSubcategory,
    onEditSubcategory,
    onDeleteSubcategory,
}: ManageCategoriesPanelProps) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Grid3x3 size={20} className="text-purple-400" />
                    Manage Categories & Subcategories
                </h2>
                <Button variant="outline" size="sm" onClick={onClose}>
                    <X size={16} />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-200">Categories</h3>
                        <Button variant="primary" size="sm" onClick={onAddCategory}>
                            <Plus size={14} className="mr-1" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {categories.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No categories yet</p>
                        ) : (
                            categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between hover:border-purple-500/50 transition-colors"
                                >
                                    <div>
                                        <div className="font-medium text-white">{cat.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {subcategories.filter((s) => s.categoryId === cat.id).length}{" "}
                                            subcategories
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onAddSubcategory(cat.id)}
                                            className="text-xs"
                                        >
                                            + Sub
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEditCategory(cat)}
                                        >
                                            <Edit2 size={14} />
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => onDeleteCategory(cat)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Subcategories Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-200">All Subcategories</h3>
                    </div>
                    <div className="space-y-2">
                        {subcategories.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">
                                No subcategories yet
                            </p>
                        ) : (
                            subcategories.map((subcat) => {
                                const category = categories.find((c) => c.id === subcat.categoryId);
                                return (
                                    <div
                                        key={subcat.id}
                                        className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between hover:border-violet-500/50 transition-colors"
                                    >
                                        <div>
                                            <div className="font-medium text-white">{subcat.name}</div>
                                            <div className="text-xs text-gray-500">
                                                in {category?.name || "Unknown"}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onEditSubcategory(subcat)}
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => onDeleteSubcategory(subcat)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ===============================================
   PRODUCT ROW (TABLE)
=============================================== */

interface ProductRowProps {
    product: Product;
    categoryName: string;
    subcategoryName?: string;
    onEdit: () => void;
    onDelete: () => void;
    onToggleSale: () => void;
    onToggleAvailability: () => void;
    sortMode: boolean;
}

function ProductRow({
    product,
    categoryName,
    subcategoryName,
    onEdit,
    onDelete,
    onToggleSale,
    onToggleAvailability,
    sortMode,
}: ProductRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`hover:bg-gray-800/50 transition-colors ${
                sortMode ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isDragging ? 'bg-gray-800' : ''}`}
        >
            {/* Drag Handle */}
            {sortMode && (
                <td className="px-4 py-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1.5 bg-purple-500/20 rounded cursor-grab active:cursor-grabbing hover:bg-purple-500/30"
                    >
                        <GripVertical size={16} className="text-purple-400" />
                    </div>
                </td>
            )}

            {/* Image */}
            <td className="px-4 py-3">
                <div className="w-12 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} className="text-gray-600" />
                        </div>
                    )}
                </div>
            </td>

            {/* Product Name & Description */}
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-medium text-white text-sm">
                        {product.name}
                    </span>
                    {product.description && (
                        <span className="text-xs text-gray-500 truncate max-w-xs" title={product.description}>
                            {product.description}
                        </span>
                    )}
                </div>
            </td>

            {/* Category */}
            <td className="px-4 py-3">
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                    {categoryName}
                </span>
            </td>

            {/* Subcategory */}
            <td className="px-4 py-3">
                {subcategoryName ? (
                    <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                        {subcategoryName}
                    </span>
                ) : (
                    <span className="text-gray-600 text-xs">â€”</span>
                )}
            </td>

            {/* Price */}
            <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                    {product.isOnSale && product.salePrice ? (
                        <>
                            <span className="font-bold text-green-400">
                                ${product.salePrice.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500 line-through">
                                ${product.price.toFixed(2)}
                            </span>
                        </>
                    ) : (
                        <span className="font-bold text-white">
                            ${product.price.toFixed(2)}
                        </span>
                    )}
                </div>
            </td>

            {/* Stock */}
            <td className="px-4 py-3">
                <div className={`flex items-center gap-2 px-2 py-1 rounded text-sm font-medium ${
                    product.stock > 0
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                }`}>
                    <Package size={14} />
                    <span>{product.stock} pcs</span>
                </div>
            </td>

            {/* On Sale Toggle */}
            <td className="px-4 py-3 text-center">
                <button
                    onClick={onToggleSale}
                    className={`p-2 rounded transition-colors ${
                        product.isOnSale
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-gray-800 text-gray-500 hover:text-gray-300"
                    }`}
                    title={product.isOnSale ? "Remove from sale" : "Put on sale"}
                >
                    <Tag size={16} />
                </button>
            </td>

            {/* Available Toggle */}
            <td className="px-4 py-3 text-center">
                <button
                    onClick={onToggleAvailability}
                    className={`p-2 rounded transition-colors ${
                        product.isAvailable
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    }`}
                    title={product.isAvailable ? "Mark as unavailable" : "Mark as available"}
                >
                    {product.isAvailable ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
            </td>

            {/* Actions */}
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="px-3 py-1.5"
                    >
                        <Edit2 size={14} />
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={onDelete}
                        className="px-3 py-1.5"
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

/* ===============================================
   OLD CATEGORY/SUBCATEGORY SECTIONS - REMOVED
=============================================== */

/* ===============================================
   CATEGORY MODAL
=============================================== */

interface CategoryModalProps {
    modal: { open: boolean; mode: 'create' | 'edit'; data?: any };
    onClose: () => void;
    onCreate: (name: string) => Promise<{ success: boolean; error?: string }>;
    onUpdate: (id: string, name: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
}

function CategoryModal({ modal, onClose, onCreate, onUpdate }: CategoryModalProps) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initialize form when modal opens
    useMemo(() => {
        if (modal.open) {
            if (modal.mode === 'edit' && modal.data) {
                setName(modal.data.name);
                setIsActive(modal.data.isActive);
            } else {
                setName('');
                setIsActive(true);
            }
            setError('');
        }
    }, [modal.open, modal.mode, modal.data]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Category name is required');
            return;
        }

        setLoading(true);
        setError('');

        const result =
            modal.mode === 'create'
                ? await onCreate(name)
                : await onUpdate(modal.data.id, name, isActive);

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'An error occurred');
        }
    };

    return (
        <Modal
            isOpen={modal.open}
            onClose={onClose}
            title={modal.mode === 'create' ? 'Create Category' : 'Edit Category'}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Category Name *
                    </label>
                    <Input
                        placeholder="e.g., Beverages, Snacks, Dairy"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                {modal.mode === 'edit' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-300">
                            Active
                        </label>
                    </div>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
            </div>
        </Modal>
    );
}

/* ===============================================
   SUBCATEGORY MODAL
=============================================== */

interface SubcategoryModalProps {
    modal: { open: boolean; mode: 'create' | 'edit'; categoryId?: string; data?: any };
    categories: Category[];
    onClose: () => void;
    onCreate: (categoryId: string, name: string) => Promise<{ success: boolean; error?: string }>;
    onUpdate: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
}

function SubcategoryModal({ modal, categories, onClose, onCreate, onUpdate }: SubcategoryModalProps) {
    const [categoryId, setCategoryId] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useMemo(() => {
        if (modal.open) {
            if (modal.mode === 'edit' && modal.data) {
                setCategoryId(modal.data.categoryId);
                setName(modal.data.name);
            } else {
                setCategoryId(modal.categoryId || '');
                setName('');
            }
            setError('');
        }
    }, [modal.open, modal.mode, modal.data, modal.categoryId]);

    const handleSubmit = async () => {
        if (!categoryId) {
            setError('Please select a category');
            return;
        }
        if (!name.trim()) {
            setError('Subcategory name is required');
            return;
        }

        setLoading(true);
        setError('');

        const result =
            modal.mode === 'create'
                ? await onCreate(categoryId, name)
                : await onUpdate(modal.data.id, name);

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'An error occurred');
        }
    };

    return (
        <Modal
            isOpen={modal.open}
            onClose={onClose}
            title={modal.mode === 'create' ? 'Create Subcategory' : 'Edit Subcategory'}
        >
            <div className="space-y-4">
                {modal.mode === 'create' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Category *
                        </label>
                        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                        <div className="text-gray-200">
                            {categories.find((c) => c.id === categoryId)?.name || 'Unknown'}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Subcategory Name *
                    </label>
                    <Input
                        placeholder="e.g., Soft Drinks, Chips, Milk"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
            </div>
        </Modal>
    );
}

/* ===============================================
   PRODUCT MODAL
=============================================== */

interface ProductModalProps {
    modal: {
        open: boolean;
        mode: 'create' | 'edit';
        categoryId?: string;
        subcategoryId?: string;
        data?: any;
    };
    businessId: string;
    categories: Category[];
    subcategories: Subcategory[];
    onClose: () => void;
    onCreate: (input: CreateProductInput) => Promise<{ success: boolean; error?: string }>;
    onUpdate: (id: string, input: UpdateProductInput) => Promise<{ success: boolean; error?: string }>;
}

function ProductModal({
    modal,
    businessId,
    categories,
    subcategories,
    onClose,
    onCreate,
    onUpdate,
}: ProductModalProps) {
    const [form, setForm] = useState({
        categoryId: '',
        subcategoryId: '',
        name: '',
        description: '',
        price: '',
        salePrice: '',
        imageUrl: '',
        isOnSale: false,
        isAvailable: true,
        stock: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filter subcategories based on selected category
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
                    name: modal.data.name,
                    description: modal.data.description || '',
                    price: modal.data.price.toString(),
                    salePrice: modal.data.salePrice?.toString() || '',
                    imageUrl: modal.data.imageUrl || '',
                    isOnSale: modal.data.isOnSale,
                    isAvailable: modal.data.isAvailable,
                    stock: modal.data.stock?.toString() || '0',
                });
                setImagePreview(modal.data.imageUrl || null);
            } else {
                setForm({
                    categoryId: modal.categoryId || '',
                    subcategoryId: modal.subcategoryId || '',
                    name: '',
                    description: '',
                    price: '',
                    salePrice: '',
                    imageUrl: '',
                    isOnSale: false,
                    isAvailable: true,
                    stock: '',
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
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'products');

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
            return null;
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
            setUploadingImage(true);
            const uploadedUrl = await uploadImage(imageFile);
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
            name: form.name,
            description: form.description || undefined,
            imageUrl: imageUrl || undefined,
            price: parseFloat(form.price),
            isOnSale: form.isOnSale,
            salePrice: form.isOnSale && form.salePrice ? parseFloat(form.salePrice) : undefined,
            isAvailable: form.isAvailable,
            stock: form.stock ? parseInt(form.stock, 10) : 0,
        };

        const result =
            modal.mode === 'create'
                ? await onCreate({ ...input, businessId } as CreateProductInput)
                : await onUpdate(modal.data.id, input as UpdateProductInput);

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
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Category *
                        </label>
                        <Select
                            value={form.categoryId}
                            onChange={(e) =>
                                setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })
                            }
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
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Subcategory
                        </label>
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
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Product Name *
                    </label>
                    <Input
                        placeholder="e.g., Coca-Cola 500ml"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Description
                    </label>
                    <textarea
                        placeholder="Product description..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Price * ($)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Sale Price ($)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={form.salePrice}
                            onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                            disabled={!form.isOnSale}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Stock (pieces)
                    </label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Product Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
                    {imagePreview && (
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="mt-2 w-32 h-32 object-cover rounded"
                        />
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isOnSale"
                            checked={form.isOnSale}
                            onChange={(e) => setForm({ ...form, isOnSale: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isOnSale" className="text-sm text-gray-300">
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
                        <label htmlFor="isAvailable" className="text-sm text-gray-300">
                            Available
                        </label>
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={loading || uploadingImage}
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
        </Modal>
    );
}

/* ===============================================
   DELETE MODAL
=============================================== */

interface DeleteModalProps {
    modal: { type: 'category' | 'subcategory' | 'product'; id: string; name: string } | null;
    onClose: () => void;
    onConfirm: () => Promise<{ success: boolean; error?: string }>;
}

function DeleteModal({ modal, onClose, onConfirm }: DeleteModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        setLoading(true);
        setError('');

        const result = await onConfirm();

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'An error occurred');
        }
    };

    if (!modal) return null;

    return (
        <Modal isOpen={!!modal} onClose={onClose} title={`Delete ${modal.type}`}>
            <div className="space-y-4">
                <p className="text-gray-300">
                    Are you sure you want to delete <strong>{modal.name}</strong>?
                </p>
                {modal.type === 'category' && (
                    <p className="text-sm text-yellow-400">
                        Warning: This will also delete all subcategories and products in this category.
                    </p>
                )}
                {modal.type === 'subcategory' && (
                    <p className="text-sm text-yellow-400">
                        Warning: This will also delete all products in this subcategory.
                    </p>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

