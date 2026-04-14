"use client";

import { useEffect, useMemo, useState } from "react";
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
import { GripVertical } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import {
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
    useUpdateCategoriesOrder,
} from "@/lib/hooks/useProductCategories";
import { toast } from 'sonner';

/* --------------------------
   Types
--------------------------- */

interface ProductCategory {
    id: string;
    name: string;
    sortOrder?: number;
    isActive: boolean;
}

export default function CategoriesBlock({
    businessId,
}: {
    businessId: string;
}) {
    /* =============================================
     Hooks
    ============================================== */

    const { categories, loading, error, refetch } = useCategories(businessId);
    const { create: createCategory, loading: createLoading, error: createError } = useCreateCategory();
    const { update: updateCategory, loading: updateLoading, error: updateError } = useUpdateCategory();
    const { delete: deleteCategory, loading: deleteLoading, error: deleteError } = useDeleteCategory();
    const { updateOrder: updateCategoriesOrder } = useUpdateCategoriesOrder();

    /* =============================================
     Local UI State
    ============================================== */

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState(false);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

    const [createForm, setCreateForm] = useState({ name: "" });
    const [editForm, setEditForm] = useState({
        id: "",
        name: "",
        isActive: true,
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        const initial = [...categories]
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((c) => c.id);
        setCategoryOrder(initial);
    }, [categories]);

    const orderedCategories = useMemo(() => {
        if (categoryOrder.length === 0) return categories;
        const orderMap = new Map(categoryOrder.map((id, index) => [id, index]));
        return [...categories].sort((a, b) => {
            const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return aIndex - bIndex;
        });
    }, [categories, categoryOrder]);

    /* =============================================
     Handlers
    ============================================== */

    const handleCreate = async () => {
        if (!createForm.name.trim()) {
            toast.warning("Please enter a category name");
            return;
        }

        const { success, error } = await createCategory({
            businessId,
            name: createForm.name,
        });

        if (success) {
            await refetch();
            setCreateOpen(false);
            setCreateForm({ name: "" });
        } else {
            toast.error(`Error creating category: ${error}`);
        }
    };

    const openEditModal = (cat: ProductCategory) => {
        setEditForm({
            id: cat.id,
            name: cat.name,
            isActive: cat.isActive,
        });
        setEditOpen(true);
    };

    const handleEdit = async () => {
        if (!editForm.name.trim()) {
            toast.warning("Please enter a category name");
            return;
        }

        const { success, error } = await updateCategory(editForm.id, {
            name: editForm.name,
            isActive: editForm.isActive,
        });

        if (success) {
            await refetch();
            setEditOpen(false);
        } else {
            toast.error(`Error updating category: ${error}`);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        const { success, error } = await deleteCategory(deleteId);

        if (success) {
            await refetch();
            setDeleteId(null);
        } else {
            toast.error(`Error deleting category: ${error}`);
        }
    };

    const handleCategoryDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categoryOrder.indexOf(String(active.id));
        const newIndex = categoryOrder.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;

        const nextOrder = arrayMove(categoryOrder, oldIndex, newIndex);
        setCategoryOrder(nextOrder);

        const { success, error } = await updateCategoriesOrder(
            businessId,
            nextOrder.map((id, index) => ({
                id,
                sortOrder: index,
            }))
        );

        if (!success) {
            toast.error(error || "Failed to save category order");
            await refetch();
            return;
        }

        await refetch();
    };

    /* =============================================
     Render
    ============================================== */

    if (loading) return <p className="text-zinc-400">Loading categories...</p>;
    if (error) return <p className="text-red-400">Error: {error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Categories</h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant={sortMode ? "primary" : "outline"}
                        onClick={() => setSortMode((prev) => !prev)}
                    >
                        {sortMode ? "Done Sorting" : "Sort Categories"}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setCreateOpen(true)}
                        disabled={createLoading}
                    >
                        {createLoading ? "Adding..." : "+ Add Category"}
                    </Button>
                </div>
            </div>

            {/* Table */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
            >
                <Table>
                    <thead>
                        <tr>
                            {sortMode && <Th></Th>}
                            <Th>Name</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>

                    <SortableContext
                        items={orderedCategories.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                        disabled={!sortMode}
                    >
                    <tbody>
                    {orderedCategories.map((c) => (
                        <SortableCategoryRow key={c.id} id={c.id} sortMode={sortMode}>
                            <Td>{c.name}</Td>
                            <Td>
                                {c.isActive ? (
                                    <span className="text-green-400">
                                        Active
                                    </span>
                                ) : (
                                    <span className="text-red-400">
                                        Inactive
                                    </span>
                                )}
                            </Td>
                            <Td>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => openEditModal(c)}
                                        disabled={updateLoading}
                                    >
                                        Edit
                                    </Button>

                                    <Button
                                        variant="danger"
                                        onClick={() => setDeleteId(c.id)}
                                        disabled={deleteLoading}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </Td>
                        </SortableCategoryRow>
                    ))}
                    </tbody>
                    </SortableContext>
                </Table>
            </DndContext>

            {orderedCategories.length === 0 && (
                <p className="text-zinc-500 text-center py-4">
                    No categories yet.
                </p>
            )}

            {/* =============================================
             MODALS
            ============================================== */}

            {/* CREATE */}
            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Create Category"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Category Name
                        </label>
                        <Input
                            placeholder="Category name"
                            value={createForm.name}
                            onChange={(e) =>
                                setCreateForm({ name: e.target.value })
                            }
                        />
                    </div>

                    {createError && (
                        <p className="text-red-400 text-sm">{createError}</p>
                    )}

                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleCreate}
                        disabled={createLoading}
                    >
                        {createLoading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </Modal>

            {/* EDIT */}
            <Modal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Category"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Category Name
                        </label>
                        <Input
                            placeholder="Category name"
                            value={editForm.name}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    {updateError && (
                        <p className="text-red-400 text-sm">{updateError}</p>
                    )}

                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleEdit}
                        disabled={updateLoading}
                    >
                        {updateLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Modal>

            {/* DELETE */}
            <Modal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete Category"
            >
                <p className="text-zinc-300 mb-4">
                    Are you sure you want to delete this category?
                </p>

                {deleteError && (
                    <p className="text-red-400 text-sm mb-4">{deleteError}</p>
                )}

                <div className="flex justify-end gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => setDeleteId(null)}
                        disabled={deleteLoading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleDelete}
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

function SortableCategoryRow({
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
        <tr ref={setNodeRef} style={style} className={isDragging ? "opacity-60" : ""}>
            {sortMode && (
                <Td>
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="inline-flex items-center justify-center rounded border border-violet-500/30 bg-violet-500/10 p-1 text-violet-300 hover:bg-violet-500/20"
                        aria-label="Reorder category"
                    >
                        <GripVertical size={14} />
                    </button>
                </Td>
            )}
            {children}
        </tr>
    );
}
