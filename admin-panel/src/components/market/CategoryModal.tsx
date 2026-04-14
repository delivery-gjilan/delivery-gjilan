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

type CategoryModalState = { open: boolean; mode: 'create' | 'edit'; data?: Category };

interface CategoryModalProps {
    modal: CategoryModalState;
    onClose: () => void;
    onCreate: (name: string) => Promise<{ success: boolean; error?: string }>;
    onUpdate: (id: string, name: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
}

export default function CategoryModal({ modal, onClose, onCreate, onUpdate }: CategoryModalProps) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                : await onUpdate(modal.data!.id, name, isActive);

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
                    <label className="block text-sm font-medium text-gray-400 mb-1">Category Name *</label>
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

export type { CategoryModalState };
