'use client';

import { useState, useEffect } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import {
    BusinessType,
    SettlementAmountType,
    SettlementDirection,
    SettlementEntityType,
    SettlementRuleScope,
    SettlementRuleType,
} from '@/gql/graphql';
import { toast } from 'sonner';
import {
    CREATE_SETTLEMENT_RULE,
    GET_SETTLEMENT_RULES,
    UPDATE_SETTLEMENT_RULE,
} from '@/graphql/operations/settlements/settlementRules';

const DIRECT_DISPATCH_ONLY_RULE_MARKER = '[DIRECT_DISPATCH_ONLY]';

interface Business {
    id: string;
    name: string;
    phoneNumber?: string | null;
    imageUrl?: string | null;
    businessType: string;
    category?: string | null;
    isActive: boolean;
    minOrderAmount?: number | null;
    directDispatchEnabled?: boolean;
    directDispatchFixedAmount?: number | null;
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
        directDispatchEnabled: boolean;
        directDispatchFixedAmount: number;
    }) => Promise<void>;
}

export default function EditBusinessDetailModal({
    isOpen,
    business,
    onClose,
    onSave,
}: EditBusinessDetailModalProps) {
    const apolloClient = useApolloClient();
    const [createSettlementRule] = useMutation(CREATE_SETTLEMENT_RULE);
    const [updateSettlementRule] = useMutation(UPDATE_SETTLEMENT_RULE);

    const [form, setForm] = useState({
        name: '',
        phoneNumber: '',
        businessType: BusinessType.Restaurant,
        category: '',
        imageUrl: '',
        minOrderAmount: 0,
        directDispatchEnabled: false,
        directDispatchFixedAmount: 0,
        directDispatchCommissionPercent: 0,
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
                directDispatchEnabled: business.directDispatchEnabled ?? false,
                directDispatchFixedAmount: business.directDispatchFixedAmount ?? 0,
                directDispatchCommissionPercent: 0,
            });
        }
    }, [isOpen, business]);

    useEffect(() => {
        if (!isOpen || !business?.id) return;

        let cancelled = false;
        (async () => {
            const { data } = await apolloClient.query({
                query: GET_SETTLEMENT_RULES,
                variables: {
                    filter: {
                        businessIds: [business.id],
                        entityTypes: [SettlementEntityType.Driver],
                        scopes: [SettlementRuleScope.Business],
                        type: SettlementRuleType.DeliveryPrice,
                    },
                    limit: 50,
                    offset: 0,
                },
                fetchPolicy: 'network-only',
            });

            if (cancelled) return;

            const existingRule = (data?.settlementRules ?? [])
                .filter((rule) => (rule.notes ?? '').includes(DIRECT_DISPATCH_ONLY_RULE_MARKER))
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

            setForm((prev) => ({
                ...prev,
                directDispatchCommissionPercent: Number(existingRule?.amount ?? 0),
            }));
        })();

        return () => {
            cancelled = true;
        };
    }, [apolloClient, business?.id, isOpen]);

    async function syncDirectDispatchCommissionRule(businessId: string) {
        const { data } = await apolloClient.query({
            query: GET_SETTLEMENT_RULES,
            variables: {
                filter: {
                    businessIds: [businessId],
                    entityTypes: [SettlementEntityType.Driver],
                    scopes: [SettlementRuleScope.Business],
                    type: SettlementRuleType.DeliveryPrice,
                },
                limit: 50,
                offset: 0,
            },
            fetchPolicy: 'network-only',
        });

        const existingRule = (data?.settlementRules ?? [])
            .filter((rule) => (rule.notes ?? '').includes(DIRECT_DISPATCH_ONLY_RULE_MARKER))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        const shouldEnableRule = form.directDispatchEnabled && form.directDispatchCommissionPercent > 0;

        if (!shouldEnableRule) {
            if (existingRule?.isActive) {
                await updateSettlementRule({
                    variables: {
                        id: existingRule.id,
                        input: { isActive: false },
                    },
                });
            }
            return;
        }

        const commonInput = {
            name: 'Direct Dispatch Driver Commission',
            type: SettlementRuleType.DeliveryPrice,
            entityType: SettlementEntityType.Driver,
            direction: SettlementDirection.Receivable,
            amountType: SettlementAmountType.Percent,
            amount: form.directDispatchCommissionPercent,
            businessId,
            notes: `${DIRECT_DISPATCH_ONLY_RULE_MARKER} Applied only to DIRECT_DISPATCH delivery fee settlements.`,
        };

        if (existingRule) {
            await updateSettlementRule({
                variables: {
                    id: existingRule.id,
                    input: {
                        name: commonInput.name,
                        type: commonInput.type,
                        direction: commonInput.direction,
                        amountType: commonInput.amountType,
                        amount: commonInput.amount,
                        isActive: true,
                        notes: commonInput.notes,
                    },
                },
            });
            return;
        }

        await createSettlementRule({
            variables: {
                input: commonInput,
            },
        });
    }

    async function handleSave() {
        try {
            await onSave({
                name: form.name,
                phoneNumber: form.phoneNumber.trim() || null,
                businessType: form.businessType,
                category: form.category.trim() || null,
                imageUrl: form.imageUrl || null,
                minOrderAmount: form.minOrderAmount,
                directDispatchEnabled: form.directDispatchEnabled,
                directDispatchFixedAmount: form.directDispatchFixedAmount,
            });
            if (business?.id) {
                await syncDirectDispatchCommissionRule(business.id);
            }
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

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Direct Dispatch Fixed Amount (€)</label>
                    <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={form.directDispatchFixedAmount}
                        onChange={(e) => setForm({ ...form, directDispatchFixedAmount: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-zinc-600 mt-1">Per-business fixed fee for direct call orders</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Direct Dispatch Platform Commission (%)</label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.directDispatchCommissionPercent}
                        onChange={(e) =>
                            setForm({ ...form, directDispatchCommissionPercent: parseFloat(e.target.value) || 0 })
                        }
                    />
                    <p className="text-xs text-zinc-600 mt-1">
                        Applied only to direct call delivery fee settlements, not to normal platform or promo delivery rules.
                    </p>
                </div>

                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.directDispatchEnabled}
                            onChange={(e) => setForm({ ...form, directDispatchEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/30"
                        />
                        <div>
                            <span className="text-sm font-medium text-zinc-300">Direct Dispatch</span>
                            <p className="text-xs text-zinc-600">Allow this business to request drivers for call-in orders</p>
                        </div>
                    </label>
                </div>

                <Button variant="primary" className="w-full mt-2" onClick={handleSave}>
                    Save Changes
                </Button>
            </div>
        </Modal>
    );
}
