"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import {
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
} from "@/lib/hooks/useProductCategories";
import { toast } from 'sonner';

/* --------------------------
   Types
--------------------------- */

interface ProductCategory {
    id: string;
    name: string;
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

    /* =============================================
     Local UI State
    ============================================== */

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [createForm, setCreateForm] = useState({ name: "" });
    const [editForm, setEditForm] = useState({
        id: "",
        name: "",
        isActive: true,
    });

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

    /* =============================================
     Render
    ============================================== */

    if (loading) return <p className="text-gray-400">Loading categories...</p>;
    if (error) return <p className="text-red-400">Error: {error}</p>;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Categories</h2>
                <Button 
                    variant="primary" 
                    onClick={() => setCreateOpen(true)}
                    disabled={createLoading}
                >
                    {createLoading ? "Adding..." : "+ Add Category"}
                </Button>
            </div>

            {/* Table */}
            <Table>
                <thead>
                    <tr>
                        <Th>Name</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                    </tr>
                </thead>

                <tbody>
                    {categories.map((c) => (
                        <tr key={c.id}>
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
                        </tr>
                    ))}
                </tbody>
            </Table>

            {categories.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                    No categories yet.
                </p>
            )}

            {/* =============================================
             MODALS
            ============================================== */}

            {/* CREATE */}
            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Create Category"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
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
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Category"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
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
                open={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete Category"
            >
                <p className="text-gray-300 mb-4">
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
