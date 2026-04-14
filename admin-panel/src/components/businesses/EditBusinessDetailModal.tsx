'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { BusinessType } from '@/gql/graphql';
import { toast } from 'sonner';

interface Business {
    id: string;
    name: string;
    phoneNumber?: string | null;
    imageUrl?: string | null;
    businessType: string;
    category?: string | null;
    isActive: boolean;
    minOrderAmount?: number | null;
}

interface EditBusinessDetailModalProps {
    isOpen: boolean;
    business: Business | null;
    onClose: () => void;
    onSave: (input: {
        name: string;
        phoneNumber: string | null;
        businessType: BusinessType;
        category: string | null;
        imageUrl: string | null;
        minOrderAmount: number;
    }) => Promise<void>;
}

export default function EditBusinessDetailModal({
    isOpen,
    business,
    onClose,
    onSave,
}: EditBusinessDetailModalProps) {
    const [form, setForm] = useState({
        name: '',
        phoneNumber: '',
        businessType: BusinessType.Restaurant,
        category: '',
        imageUrl: '',
        minOrderAmount: 0,
    });

    useEffect(() => {
        if (isOpen && business) {
            setForm({
                name: business.name,
                phoneNumber: business.phoneNumber || '',
                businessType: (business.businessType as BusinessType) ?? BusinessType.Restaurant,
                category: business.category || '',
                imageUrl: business.imageUrl || '',
                minOrderAmount: business.minOrderAmount ?? 0,
            });
        }
    }, [isOpen, business]);

    async function handleSave() {
        try {
            await onSave({
                name: form.name,
                phoneNumber: form.phoneNumber.trim() || null,
                businessType: form.businessType,
                category: form.category.trim() || null,
                imageUrl: form.imageUrl || null,
                minOrderAmount: form.minOrderAmount,
            });
            onClose();
            toast.success('Business updated');
        } catch {
            toast.error('Failed to update business');
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Business">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Business Name</label>
                    <Input
                        placeholder="Business name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Phone Number</label>
                    <Input
                        placeholder="e.g., +383 44 123 456"
                        value={form.phoneNumber}
                        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                    <Input
                        placeholder="e.g., Restorant, Kafene, Fast Food, Pizza"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                    <p className="text-xs text-zinc-600 mt-1">Used for filtering in the customer app</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Business Type</label>
                    <Select
                        value={form.businessType}
                        onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}
                    >
                        <option value={BusinessType.Restaurant}>Restaurant</option>
                        <option value={BusinessType.Market}>Market</option>
                        <option value={BusinessType.Pharmacy}>Pharmacy</option>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Image URL</label>
                    <Input
                        placeholder="https://..."
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Minimum Order Amount (€)</label>
                    <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={form.minOrderAmount}
                        onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-zinc-600 mt-1">Set to 0 to disable</p>
                </div>

                <Button variant="primary" className="w-full mt-2" onClick={handleSave}>
                    Save Changes
                </Button>
            </div>
        </Modal>
    );
}
