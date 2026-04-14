'use client';

import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';

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

type SubcategoryModalState = { open: boolean; mode: 'create' | 'edit'; categoryId?: string; data?: Subcategory };

interface SubcategoryModalProps {
    modal: SubcategoryModalState;
    categories: Category[];
    onClose: () => void;
    onCreate: (categoryId: string, name: string) => Promise<{ success: boolean; error?: string }>;
    onUpdate: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
}

export default function SubcategoryModal({ modal, categories, onClose, onCreate, onUpdate }: SubcategoryModalProps) {
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
                : await onUpdate(modal.data!.id, name);

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
                        <label className="block text-sm font-medium text-gray-400 mb-1">Category *</label>
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
                    <label className="block text-sm font-medium text-gray-400 mb-1">Subcategory Name *</label>
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

export type { SubcategoryModalState };
