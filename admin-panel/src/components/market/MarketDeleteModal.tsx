'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface DeleteModalData {
    type: 'category' | 'subcategory' | 'product';
    id: string;
    name: string;
    isOffer?: boolean;
    variantGroupId?: string;
    variantGroupName?: string;
    variantGroupCount?: number;
}

interface MarketDeleteModalProps {
    modal: DeleteModalData | null;
    onClose: () => void;
    onConfirm: (options: { deleteWholeVariantGroup: boolean }) => Promise<{ success: boolean; error?: string }>;
}

export default function MarketDeleteModal({ modal, onClose, onConfirm }: MarketDeleteModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteWholeVariantGroup, setDeleteWholeVariantGroup] = useState(false);

    useEffect(() => {
        if (!modal) return;
        setDeleteWholeVariantGroup(false);
        setError('');
    }, [modal]);

    const handleConfirm = async () => {
        setLoading(true);
        setError('');

        const result = await onConfirm({ deleteWholeVariantGroup });

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'An error occurred');
        }
    };

    if (!modal) return null;

    return (
        <Modal isOpen={!!modal} onClose={onClose} title={`Delete ${modal.type}`}>
            <div className="space-y-4">
                <p className="text-zinc-300">
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
                {modal.type === 'product' && modal.isOffer && (
                    <p className="text-sm text-amber-300">This item is currently marked as an offer/deal.</p>
                )}
                {modal.type === 'product' && modal.variantGroupId && (
                    <div className="space-y-2 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3">
                        <p className="text-sm text-violet-200">
                            This item belongs to variant group{' '}
                            <strong>{modal.variantGroupName || modal.variantGroupId}</strong>
                            {modal.variantGroupCount
                                ? ` (${modal.variantGroupCount} variant${modal.variantGroupCount === 1 ? '' : 's'})`
                                : ''}
                            .
                        </p>
                        <label className="flex items-center gap-2 text-sm text-violet-100">
                            <input
                                type="checkbox"
                                checked={deleteWholeVariantGroup}
                                onChange={(e) => setDeleteWholeVariantGroup(e.target.checked)}
                            />
                            Delete entire variant group instead of just this variant
                        </label>
                    </div>
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

export type { DeleteModalData };
