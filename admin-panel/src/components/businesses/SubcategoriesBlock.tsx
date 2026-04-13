"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { useCategories } from "@/lib/hooks/useProductCategories";
import {
    useProductSubcategories,
    useCreateProductSubcategory,
    useUpdateProductSubcategory,
    useDeleteProductSubcategory,
} from "@/lib/hooks/useProductSubcategories";
import { toast } from 'sonner';

interface ProductSubcategory {
    id: string;
    categoryId: string;
    name: string;
}

export default function SubcategoriesBlock({ businessId }: { businessId: string }) {
    const { categories, loading: categoriesLoading, error: categoriesError } = useCategories(businessId);
    const { subcategories, loading, error, refetch } = useProductSubcategories(businessId);
    const { create: createSubcategory, loading: createLoading, error: createError } = useCreateProductSubcategory();
    const { update: updateSubcategory, loading: updateLoading, error: updateError } = useUpdateProductSubcategory();
    const { delete: deleteSubcategory, loading: deleteLoading, error: deleteError } = useDeleteProductSubcategory();

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

    const [createForm, setCreateForm] = useState({
        categoryId: "",
        name: "",
    });
    const [editForm, setEditForm] = useState({
        id: "",
        categoryId: "",
        name: "",
    });

    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach((category) => map.set(category.id, category.name));
        return map;
    }, [categories]);

    const filteredSubcategories = useMemo(() => {
        if (!selectedCategoryId) return subcategories;
        return subcategories.filter((subcategory: ProductSubcategory) => subcategory.categoryId === selectedCategoryId);
    }, [subcategories, selectedCategoryId]);

    const handleCreate = async () => {
        if (!createForm.categoryId || !createForm.name.trim()) {
            toast.warning("Please select a category and enter a name");
            return;
        }

        const { success, error: createErr } = await createSubcategory({
            categoryId: createForm.categoryId,
            name: createForm.name,
        });

        if (success) {
            await refetch();
            setCreateOpen(false);
            setCreateForm({ categoryId: "", name: "" });
        } else {
            toast.error(`Error creating subcategory: ${createErr}`);
        }
    };

    const openEditModal = (subcategory: ProductSubcategory) => {
        setEditForm({
            id: subcategory.id,
            categoryId: subcategory.categoryId,
            name: subcategory.name,
        });
        setEditOpen(true);
    };

    const handleEdit = async () => {
        if (!editForm.name.trim()) {
            toast.warning("Please enter a name");
            return;
        }

        const { success, error: updateErr } = await updateSubcategory(editForm.id, {
            name: editForm.name,
        });

        if (success) {
            await refetch();
            setEditOpen(false);
        } else {
            toast.error(`Error updating subcategory: ${updateErr}`);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        const { success, error: deleteErr } = await deleteSubcategory(deleteId);

        if (success) {
            await refetch();
            setDeleteId(null);
        } else {
            toast.error(`Error deleting subcategory: ${deleteErr}`);
        }
    };

    if (loading || categoriesLoading) return <div className="h-24 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />;
    if (error || categoriesError) return <p className="text-red-400">Error: {error || categoriesError}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Subcategories</h2>
                <div className="flex items-center gap-2">
                    {categories.length > 0 && (
                        <Select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                            <option value="">All categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </Select>
                    )}
                    <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} disabled={createLoading || categories.length === 0}>
                        + Add Subcategory
                    </Button>
                </div>
            </div>
            {categories.length === 0 && (
                <p className="text-sm text-zinc-500 py-4">Create at least one category first before adding subcategories.</p>
            )}

            <Table>
                <thead>
                    <tr>
                        <Th>Name</Th>
                        <Th>Category</Th>
                        <Th className="text-right">Actions</Th>
                    </tr>
                </thead>

                <tbody>
                    {filteredSubcategories.length === 0 ? (
                        <tr>
                            <Td colSpan={3}>
                                <div className="text-center text-zinc-500 py-4">No subcategories yet.</div>
                            </Td>
                        </tr>
                    ) : (
                        filteredSubcategories.map((subcategory: ProductSubcategory) => (
                            <tr key={subcategory.id}>
                                <Td>{subcategory.name}</Td>
                                <Td><span className="text-zinc-400">{categoryMap.get(subcategory.categoryId) || "Unknown"}</span></Td>
                                <Td className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEditModal(subcategory)} disabled={updateLoading}>Edit</Button>
                                        <Button variant="danger" size="sm" onClick={() => setDeleteId(subcategory.id)} disabled={deleteLoading}>Delete</Button>
                                    </div>
                                </Td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>



            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Subcategory">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                        <Select
                            value={createForm.categoryId}
                            onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}
                        >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                        <Input
                            placeholder="Subcategory name"
                            value={createForm.name}
                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        />
                    </div>

                    {createError && <p className="text-red-400 text-sm">{createError}</p>}

                    <Button variant="primary" className="w-full" onClick={handleCreate} disabled={createLoading}>
                        {createLoading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </Modal>

            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Subcategory">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                        <Select
                            value={editForm.categoryId}
                            onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                        >
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                        <Input
                            placeholder="Subcategory name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>

                    {updateError && <p className="text-red-400 text-sm">{updateError}</p>}

                    <Button variant="primary" className="w-full" onClick={handleEdit} disabled={updateLoading}>
                        {updateLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Modal>

            <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Subcategory">
                <p className="text-zinc-300 text-sm mb-4">Are you sure you want to delete this subcategory? Products assigned to it will lose their subcategory assignment.</p>
                {deleteError && <p className="text-red-400 text-sm mb-4">{deleteError}</p>}
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)} disabled={deleteLoading}>Cancel</Button>
                    <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleteLoading}>{deleteLoading ? "Deleting..." : "Delete"}</Button>
                </div>
            </Modal>
        </div>
    );
}
