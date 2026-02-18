'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CREATE_PROMOTION, UPDATE_PROMOTION } from '@/graphql/operations/promotions/mutations';

interface PromotionFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export function PromotionForm({ initialData, isEdit = false }: PromotionFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState(initialData || {
        name: '',
        description: '',
        code: '',
        type: 'FIXED_AMOUNT',
        target: 'ALL_USERS',
        discountValue: '',
        maxDiscountCap: '',
        minOrderAmount: '',
        maxGlobalUsage: '',
        maxUsagePerUser: '',
        isStackable: false,
        priority: 0,
        isActive: true,
        startsAt: '',
        endsAt: '',
    });

    const [createPromotion, { loading: createLoading }] = useMutation(CREATE_PROMOTION, {
        onCompleted: () => {
            router.push('/admin/promos');
            router.refresh();
        },
        onError: (error) => alert(`Error: ${error.message}`),
    });

    const [updatePromotion, { loading: updateLoading }] = useMutation(UPDATE_PROMOTION, {
        onCompleted: () => {
            router.push('/admin/promos');
            router.refresh();
        },
        onError: (error) => alert(`Error: ${error.message}`),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const input = {
            ...formData,
            discountValue: formData.discountValue ? parseFloat(formData.discountValue) : null,
            maxDiscountCap: formData.maxDiscountCap ? parseFloat(formData.maxDiscountCap) : null,
            minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
            maxGlobalUsage: formData.maxGlobalUsage ? parseInt(formData.maxGlobalUsage) : null,
            maxUsagePerUser: formData.maxUsagePerUser ? parseInt(formData.maxUsagePerUser) : null,
        };

        if (isEdit) {
            await updatePromotion({
                variables: { input: { id: initialData.id, ...input } },
            });
        } else {
            await createPromotion({ variables: { input } });
        }
    };

    const loading = createLoading || updateLoading;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            {/* Basic Info */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                
                <div>
                    <label className="block text-sm font-medium mb-1">Code (Optional)</label>
                    <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., SAVE20"
                        disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for auto-apply promo</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Summer Sale 20%"
                        required
                        disabled={loading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your promotion"
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Discount Configuration */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Discount Configuration</h2>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Type *</label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                            <SelectTrigger disabled={loading}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                                <SelectItem value="WALLET_CREDIT">Wallet Credit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Discount Value {formData.type === 'PERCENTAGE' ? '(%)' : '(€)'} *
                        </label>
                        <Input
                            type="number"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            step={formData.type === 'PERCENTAGE' ? '1' : '0.01'}
                            min="0"
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                {formData.type === 'PERCENTAGE' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Max Discount Cap (€)</label>
                        <Input
                            type="number"
                            value={formData.maxDiscountCap}
                            onChange={(e) => setFormData({ ...formData, maxDiscountCap: e.target.value })}
                            step="0.01"
                            placeholder="e.g., 50 (max discount is €50)"
                            disabled={loading}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1">Minimum Order Amount (€)</label>
                    <Input
                        type="number"
                        value={formData.minOrderAmount}
                        onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                        step="0.01"
                        placeholder="e.g., 15"
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Targeting */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Targeting</h2>

                <div>
                    <label className="block text-sm font-medium mb-1">Target *</label>
                    <Select value={formData.target} onValueChange={(value) => setFormData({ ...formData, target: value })}>
                        <SelectTrigger disabled={loading}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL_USERS">All Users</SelectItem>
                            <SelectItem value="SPECIFIC_USERS">Specific Users</SelectItem>
                            <SelectItem value="FIRST_ORDER">First Order Only</SelectItem>
                            <SelectItem value="CONDITIONAL">Conditional (Spend X)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Priority</label>
                        <Input
                            type="number"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                            placeholder="0"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">Higher = applied first</p>
                    </div>

                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={formData.isStackable}
                                onCheckedChange={(checked) => setFormData({ ...formData, isStackable: !!checked })}
                                disabled={loading}
                            />
                            <span className="text-sm font-medium">Stackable</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Usage Limits */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Usage Limits</h2>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Max Global Uses</label>
                        <Input
                            type="number"
                            value={formData.maxGlobalUsage}
                            onChange={(e) => setFormData({ ...formData, maxGlobalUsage: e.target.value })}
                            placeholder="Leave empty for unlimited"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Max Per User</label>
                        <Input
                            type="number"
                            value={formData.maxUsagePerUser}
                            onChange={(e) => setFormData({ ...formData, maxUsagePerUser: e.target.value })}
                            placeholder="Leave empty for unlimited"
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Timing</h2>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date</label>
                        <Input
                            type="datetime-local"
                            value={formData.startsAt}
                            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">End Date</label>
                        <Input
                            type="datetime-local"
                            value={formData.endsAt}
                            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Status</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                        disabled={loading}
                    />
                    <span className="text-sm font-medium">Active</span>
                </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Saving...' : isEdit ? 'Update Promotion' : 'Create Promotion'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/promos')}
                    disabled={loading}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
