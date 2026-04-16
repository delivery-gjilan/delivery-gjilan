'use client';

import { useState, useEffect } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ScheduleEditor from '@/components/businesses/ScheduleEditor';
import {
    BusinessType,
    BusinessesQuery,
    SettlementAmountType,
    SettlementDirection,
    SettlementEntityType,
    SettlementRuleScope,
    SettlementRuleType,
} from '@/gql/graphql';
import { uploadImage, deleteImage } from '@/lib/utils/image-upload';
import { toast } from 'sonner';
import {
    CREATE_SETTLEMENT_RULE,
    GET_SETTLEMENT_RULES,
    UPDATE_SETTLEMENT_RULE,
} from '@/graphql/operations/settlements/settlementRules';

type Business = BusinessesQuery['businesses'][number];
const DIRECT_DISPATCH_ONLY_RULE_MARKER = '[DIRECT_DISPATCH_ONLY]';

interface EditBusinessModalProps {
    isOpen: boolean;
    business: Business | null;
    onClose: () => void;
    onSaved: (freshBusiness?: Business) => void;
    updateBusiness: (vars: { variables: { id: string; input: any } }) => Promise<any>;
    refetch: () => Promise<any>;
}

export default function EditBusinessModal({
    isOpen,
    business,
    onClose,
    onSaved,
    updateBusiness,
    refetch,
}: EditBusinessModalProps) {
    const apolloClient = useApolloClient();
    const [createSettlementRule] = useMutation(CREATE_SETTLEMENT_RULE);
    const [updateSettlementRule] = useMutation(UPDATE_SETTLEMENT_RULE);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        phoneNumber: '',
        businessType: 'RESTAURANT' as BusinessType,
        imageUrl: '',
        location: { latitude: 0, longitude: 0, address: '' },
        workingHours: { opensAt: '08:00', closesAt: '23:00' },
        minOrderAmount: 0,
        directDispatchEnabled: false,
        directDispatchFixedAmount: 0,
        directDispatchCommissionPercent: 0,
    });

    // Sync form when modal opens with a business
    useEffect(() => {
        if (isOpen && business) {
            setForm({
                name: business.name,
                phoneNumber: business.phoneNumber || '',
                businessType: business.businessType,
                imageUrl: business.imageUrl || '',
                location: {
                    latitude: business.location?.latitude || 0,
                    longitude: business.location?.longitude || 0,
                    address: business.location?.address || '',
                },
                workingHours: {
                    opensAt: business.workingHours?.opensAt || '08:00',
                    closesAt: business.workingHours?.closesAt || '23:00',
                },
                minOrderAmount: business.minOrderAmount ?? 0,
                directDispatchEnabled: business.directDispatchEnabled ?? false,
                directDispatchFixedAmount: business.directDispatchFixedAmount ?? 0,
                directDispatchCommissionPercent: 0,
            });
            setEditImageFile(null);
            setEditImagePreview(business.imageUrl || null);
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

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setEditImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setEditImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    async function handleEdit() {
        if (!business) return;
        if (!form.name.trim() || !form.location.address.trim()) {
            toast.warning('Please fill in all required fields');
            return;
        }

        setUploadingImage(true);
        let imageUrl = form.imageUrl;

        if (editImageFile) {
            if (form.imageUrl) await deleteImage(form.imageUrl);
            const uploadedUrl = await uploadImage(editImageFile, 'businesses');
            if (uploadedUrl) imageUrl = uploadedUrl;
        }
        setUploadingImage(false);

        await updateBusiness({
            variables: {
                id: business.id,
                input: {
                    name: form.name,
                    phoneNumber: form.phoneNumber.trim() || null,
                    businessType: form.businessType,
                    imageUrl: imageUrl || null,
                    location: form.location,
                    workingHours: form.workingHours,
                    minOrderAmount: form.minOrderAmount,
                    directDispatchEnabled: form.directDispatchEnabled,
                    directDispatchFixedAmount: form.directDispatchFixedAmount,
                },
            },
        });

        await syncDirectDispatchCommissionRule(business.id);

        const result = await refetch();
        const freshBusiness = result.data?.businesses?.find((b: Business) => b.id === business.id);
        onSaved(freshBusiness);
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Business">
            <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Basic Information</h3>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name *</label>
                        <Input
                            placeholder="e.g., My Restaurant"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone Number</label>
                            <Input
                                placeholder="e.g., +383 44 123 456"
                                value={form.phoneNumber}
                                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Type *</label>
                            <Select
                                value={form.businessType}
                                onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}
                            >
                                <option value="RESTAURANT">Restaurant</option>
                                <option value="MARKET">Market</option>
                                <option value="PHARMACY">Pharmacy</option>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Image (optional)</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
                        />
                        {editImagePreview && (
                            <div className="mt-2">
                                <img src={editImagePreview} alt="Preview" className="h-32 w-32 object-cover rounded" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Location</h3>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address *</label>
                        <Input
                            placeholder="e.g., 123 Main Street, City"
                            value={form.location.address}
                            onChange={(e) =>
                                setForm({ ...form, location: { ...form.location, address: e.target.value } })
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Latitude</label>
                            <Input
                                placeholder="e.g., 41.3874"
                                type="number"
                                step="0.000001"
                                value={form.location.latitude}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        location: { ...form.location, latitude: parseFloat(e.target.value) || 0 },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Longitude</label>
                            <Input
                                placeholder="e.g., 21.1432"
                                type="number"
                                step="0.000001"
                                value={form.location.longitude}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        location: { ...form.location, longitude: parseFloat(e.target.value) || 0 },
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Operating Hours */}
                <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Default Hours</h3>
                    <p className="text-xs text-zinc-500">Fallback hours when no daily schedule is set</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Opens At</label>
                            <Input
                                type="time"
                                value={form.workingHours.opensAt}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        workingHours: { ...form.workingHours, opensAt: e.target.value },
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Closes At</label>
                            <Input
                                type="time"
                                value={form.workingHours.closesAt}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        workingHours: { ...form.workingHours, closesAt: e.target.value },
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Minimum Order */}
                <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Ordering Rules</h3>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Minimum Order Amount (€)</label>
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={form.minOrderAmount}
                            onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            Set to 0 to disable. Customers cannot place an order below this subtotal.
                        </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.directDispatchEnabled}
                            onChange={(e) => setForm({ ...form, directDispatchEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/30"
                        />
                        <div>
                            <span className="text-sm font-medium text-zinc-300">Direct Dispatch</span>
                            <p className="text-xs text-zinc-500">Allow this business to request drivers for call-in orders.</p>
                        </div>
                    </label>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Direct Dispatch Fixed Amount (€)</label>
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={form.directDispatchFixedAmount}
                            onChange={(e) => setForm({ ...form, directDispatchFixedAmount: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            Per-business fixed delivery fee used for direct call orders.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Direct Dispatch Platform Commission (%)</label>
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
                        <p className="text-xs text-zinc-500 mt-1">
                            Applied only to direct call delivery fee settlements, not to normal platform or promo delivery rules.
                        </p>
                    </div>
                </div>

                {/* Per-day Schedule Editor */}
                <div className="border-t border-zinc-800 pt-6">
                    {business && (
                        <ScheduleEditor
                            businessId={business.id}
                            schedule={business.schedule ?? []}
                            onSaved={async () => {
                                const result = await refetch();
                                const freshBusiness = result.data?.businesses?.find(
                                    (b: Business) => b.id === business.id,
                                );
                                if (freshBusiness) onSaved(freshBusiness);
                            }}
                        />
                    )}
                </div>

                <Button variant="primary" className="w-full" onClick={handleEdit} disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading...' : 'Save Changes'}
                </Button>
            </div>
        </Modal>
    );
}
