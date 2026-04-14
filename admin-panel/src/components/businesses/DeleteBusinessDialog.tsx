'use client';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface DeleteBusinessDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function DeleteBusinessDialog({ isOpen, onClose, onConfirm }: DeleteBusinessDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Business">
            <p className="text-gray-300 mb-4">Are you sure you want to delete this business?</p>
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={onConfirm}>
                    Delete
                </Button>
            </div>
        </Modal>
    );
}
