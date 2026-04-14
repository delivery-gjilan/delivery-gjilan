'use client';

import Button from '@/components/ui/Button';
import { Edit2, Trash2, Plus, Grid3x3, X } from 'lucide-react';

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

export default function ManageCategoriesPanel({
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
        <div className="bg-[#111113] border border-[#1e1e22] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Grid3x3 size={16} className="text-violet-400" />
                    Categories & Subcategories
                </h2>
                <Button variant="outline" size="sm" onClick={onClose}>
                    <X size={16} />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-zinc-200">Categories</h3>
                        <Button variant="primary" size="sm" onClick={onAddCategory}>
                            <Plus size={14} className="mr-1" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {categories.length === 0 ? (
                            <p className="text-zinc-600 text-sm text-center py-8">No categories yet</p>
                        ) : (
                            categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="bg-[#09090b] border border-[#1e1e22] rounded-lg p-3 flex items-center justify-between hover:border-zinc-700 transition-colors"
                                >
                                    <div>
                                        <div className="font-medium text-zinc-100 text-sm">{cat.name}</div>
                                        <div className="text-xs text-zinc-600">
                                            {subcategories.filter((s) => s.categoryId === cat.id).length} subcategories
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => onAddSubcategory(cat.id)} className="text-xs">
                                            + Sub
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => onEditCategory(cat)}>
                                            <Edit2 size={14} />
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => onDeleteCategory(cat)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Subcategories */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-zinc-200">All Subcategories</h3>
                    </div>
                    <div className="space-y-2">
                        {subcategories.length === 0 ? (
                            <p className="text-zinc-600 text-sm text-center py-8">No subcategories yet</p>
                        ) : (
                            subcategories.map((subcat) => {
                                const category = categories.find((c) => c.id === subcat.categoryId);
                                return (
                                    <div
                                        key={subcat.id}
                                        className="bg-[#09090b] border border-[#1e1e22] rounded-lg p-3 flex items-center justify-between hover:border-zinc-700 transition-colors"
                                    >
                                        <div>
                                            <div className="font-medium text-zinc-100 text-sm">{subcat.name}</div>
                                            <div className="text-xs text-zinc-600">in {category?.name || 'Unknown'}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => onEditSubcategory(subcat)}>
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => onDeleteSubcategory(subcat)}>
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

export type { Category, Subcategory };
