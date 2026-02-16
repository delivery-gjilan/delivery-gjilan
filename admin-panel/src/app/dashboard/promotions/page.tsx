"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Tag, Plus, Edit, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_PROMOTIONS_V2 } from "@/graphql/operations/promotions/queries";
import { CREATE_PROMOTION_V2, UPDATE_PROMOTION_V2, DELETE_PROMOTION_V2 } from "@/graphql/operations/promotions/mutations";
import type { PromotionTypeV2, PromotionTarget, GetPromotionsV2Query } from "@/gql/graphql";

const promotionTypeLabels: Record<PromotionTypeV2, string> = {
    FIXED_AMOUNT: "Fixed amount",
    PERCENTAGE: "Percentage",
    FREE_DELIVERY: "Free delivery",
    WALLET_CREDIT: "Wallet credit",
};

const promotionTargetLabels: Record<PromotionTarget, string> = {
    ALL_USERS: "All users",
    SPECIFIC_USERS: "Specific users",
    FIRST_ORDER: "First order",
    CONDITIONAL: "Conditional",
};

type PromotionFormState = {
    name: string;
    description: string;
    code: string;
    type: PromotionTypeV2;
    target: PromotionTarget;
    discountValue: string;
    maxDiscountCap: string;
    minOrderAmount: string;
    spendThreshold: string;
    thresholdRewardType: "FIXED_AMOUNT" | "PERCENTAGE" | "FREE_DELIVERY";
    thresholdRewardValue: string;
    isStackable: string;
    priority: string;
    isActive: string;
    startsAt: string;
    endsAt: string;
};

const emptyForm: PromotionFormState = {
    name: "",
    description: "",
    code: "",
    type: "FIXED_AMOUNT",
    target: "ALL_USERS",
    discountValue: "",
    maxDiscountCap: "",
    minOrderAmount: "",
    spendThreshold: "",
    thresholdRewardType: "FIXED_AMOUNT",
    thresholdRewardValue: "",
    isStackable: "false",
    priority: "50",
    isActive: "true",
    startsAt: "",
    endsAt: "",
};

const toDateTimeLocal = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
};

const toOptionalNumber = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

export default function PromotionsPage() {
    const { data, loading, error, refetch } = useQuery<GetPromotionsV2Query>(GET_PROMOTIONS_V2);
    const [createPromotion, { loading: creating }] = useMutation(CREATE_PROMOTION_V2, {
        onCompleted: () => refetch(),
    });
    const [updatePromotion, { loading: updating }] = useMutation(UPDATE_PROMOTION_V2, {
        onCompleted: () => refetch(),
    });
    const [deletePromotion, { loading: deleting }] = useMutation(DELETE_PROMOTION_V2, {
        onCompleted: () => refetch(),
    });

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<GetPromotionsV2Query["getAllPromotionsV2"][number] | null>(null);
    const [promotionToDelete, setPromotionToDelete] = useState<GetPromotionsV2Query["getAllPromotionsV2"][number] | null>(null);
    const [formData, setFormData] = useState<PromotionFormState>(emptyForm);

    const promotions = useMemo(() => data?.getAllPromotionsV2 ?? [], [data?.getAllPromotionsV2]);

    const handleOpenCreate = () => {
        setEditingPromotion(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const handleOpenEdit = (promotion: GetPromotionsV2Query["getAllPromotionsV2"][number]) => {
        setEditingPromotion(promotion);
        
        // Parse threshold reward if it exists
        let thresholdRewardType: "FIXED_AMOUNT" | "PERCENTAGE" | "FREE_DELIVERY" = "FIXED_AMOUNT";
        let thresholdRewardValue = "";
        if (promotion.thresholdReward) {
            try {
                const parsed = JSON.parse(promotion.thresholdReward);
                thresholdRewardType = parsed.type || "FIXED_AMOUNT";
                thresholdRewardValue = parsed.value ? String(parsed.value) : "";
            } catch (e) {
                console.error("Failed to parse thresholdReward:", e);
            }
        }
        
        setFormData({
            name: promotion.name,
            description: promotion.description ?? "",
            code: promotion.code ?? "",
            type: promotion.type,
            target: promotion.target,
            discountValue: promotion.discountValue ? String(promotion.discountValue) : "",
            maxDiscountCap: promotion.maxDiscountCap ? String(promotion.maxDiscountCap) : "",
            minOrderAmount: promotion.minOrderAmount ? String(promotion.minOrderAmount) : "",
            spendThreshold: promotion.spendThreshold ? String(promotion.spendThreshold) : "",
            thresholdRewardType,
            thresholdRewardValue,
            isStackable: promotion.isStackable ? "true" : "false",
            priority: String(promotion.priority),
            isActive: promotion.isActive ? "true" : "false",
            startsAt: toDateTimeLocal(promotion.startsAt),
            endsAt: toDateTimeLocal(promotion.endsAt),
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPromotion(null);
        setFormData(emptyForm);
    };

    const handleDeleteRequest = (promotion: GetPromotionsV2Query["getAllPromotionsV2"][number]) => {
        setPromotionToDelete(promotion);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!promotionToDelete) return;
        await deletePromotion({ variables: { id: promotionToDelete.id } });
        setShowDeleteModal(false);
        setPromotionToDelete(null);
    };

    const handleSave = async () => {
        // Construct thresholdReward JSON if target is CONDITIONAL
        let thresholdReward: string | undefined = undefined;
        if (formData.target === "CONDITIONAL" && formData.spendThreshold.trim()) {
            const rewardObj: { type: string; value?: number } = {
                type: formData.thresholdRewardType,
            };
            // Add value only if it's not FREE_DELIVERY and has a value
            if (formData.thresholdRewardType !== "FREE_DELIVERY" && formData.thresholdRewardValue.trim()) {
                rewardObj.value = Number(formData.thresholdRewardValue);
            }
            thresholdReward = JSON.stringify(rewardObj);
        }
        
        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            code: formData.code.trim().toUpperCase() || undefined,
            type: formData.type,
            target: formData.target,
            discountValue: toOptionalNumber(formData.discountValue),
            maxDiscountCap: toOptionalNumber(formData.maxDiscountCap),
            minOrderAmount: toOptionalNumber(formData.minOrderAmount),
            spendThreshold: toOptionalNumber(formData.spendThreshold),
            thresholdReward: thresholdReward,
            isStackable: formData.isStackable === "true",
            priority: Number(formData.priority),
            isActive: formData.isActive === "true",
            startsAt: formData.startsAt || undefined,
            endsAt: formData.endsAt || undefined,
        };

        if (editingPromotion) {
            await updatePromotion({ variables: { input: { id: editingPromotion.id, ...payload } } });
        } else {
            await createPromotion({ variables: { input: payload } });
        }
        handleCloseModal();
    };

    const getStatusBadge = (isActive: boolean) => {
        return isActive
            ? "bg-green-500/10 text-green-400 border-green-500/30"
            : "bg-neutral-500/10 text-neutral-400 border-neutral-500/30";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Tag size={26} />
                        Promotions V2
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        Manage promotions, wallet credits, and targeted campaigns.
                    </p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus size={18} className="mr-2" />
                    Create Promotion
                </Button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
                    {error.message}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-6 text-neutral-400">Loading promotions...</div>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Name / Code</Th>
                                <Th>Type</Th>
                                <Th>Target</Th>
                                <Th>Value</Th>
                                <Th>Priority</Th>
                                <Th>Status</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.length === 0 ? (
                                <tr>
                                    <Td colSpan={7}>
                                        <div className="text-center py-10 text-neutral-400">
                                            No promotions created yet.
                                        </div>
                                    </Td>
                                </tr>
                            ) : (
                                promotions.map((promotion) => (
                                    <tr key={promotion.id}>
                                        <Td>
                                            <div className="text-white font-semibold">{promotion.name}</div>
                                            {promotion.code && (
                                                <div className="text-xs text-cyan-400 font-mono">{promotion.code}</div>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-neutral-300">
                                                {promotionTypeLabels[promotion.type]}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-neutral-300">
                                                {promotionTargetLabels[promotion.target]}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-white">
                                                {promotion.type === "PERCENTAGE"
                                                    ? `${promotion.discountValue}%`
                                                    : promotion.type === "FREE_DELIVERY"
                                                        ? "Free delivery"
                                                        : `€${promotion.discountValue?.toFixed(2) || "0.00"}`}
                                            </div>
                                            {promotion.maxDiscountCap && (
                                                <div className="text-xs text-neutral-400">
                                                    Cap: €{promotion.maxDiscountCap.toFixed(2)}
                                                </div>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-neutral-300">{promotion.priority}</div>
                                            {promotion.isStackable && (
                                                <div className="text-xs text-purple-400">Stackable</div>
                                            )}
                                        </Td>
                                        <Td>
                                            <span
                                                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                                                    promotion.isActive,
                                                )}`}
                                            >
                                                {promotion.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </Td>
                                        <Td>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleOpenEdit(promotion)}>
                                                    <Edit size={14} />
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleDeleteRequest(promotion)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </Td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={handleCloseModal} title={editingPromotion ? "Edit Promotion" : "Create Promotion"}>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                            📝 Basic Information
                        </h3>
                        <Input
                            label="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Summer Sale 2026"
                        />
                        <div className="text-xs text-neutral-500 -mt-2">
                            Internal name for this promotion (visible to admins only)
                        </div>
                        
                        <Input
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Get 20% off your first order!"
                        />
                        <div className="text-xs text-neutral-500 -mt-2">
                            Customer-facing description shown in the app
                        </div>

                        <Input
                            label="Promo Code (Optional)"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="SUMMER20"
                        />
                        <div className="text-xs text-neutral-500 -mt-2">
                            Leave empty for auto-applied promotions (e.g., first order). Enter a code for manual entry.
                        </div>
                    </div>

                    {/* Promotion Type & Target */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                            🎯 Type & Target Audience
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Select
                                    label="Promotion Type"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PromotionTypeV2 })}
                                >
                                    <option value="FIXED_AMOUNT">💵 Fixed Amount (e.g., $5 off)</option>
                                    <option value="PERCENTAGE">📊 Percentage (e.g., 20% off)</option>
                                    <option value="FREE_DELIVERY">🚚 Free Delivery</option>
                                    <option value="WALLET_CREDIT">💳 Wallet Credit</option>
                                </Select>
                                <div className="text-xs text-neutral-500 mt-1">
                                    {formData.type === "FIXED_AMOUNT" && "Subtract a fixed dollar amount"}
                                    {formData.type === "PERCENTAGE" && "Discount by percentage of order total"}
                                    {formData.type === "FREE_DELIVERY" && "Waive delivery fees"}
                                    {formData.type === "WALLET_CREDIT" && "Add credit to user's wallet"}
                                </div>
                            </div>
                            <div>
                                <Select
                                    label="Target Audience"
                                    value={formData.target}
                                    onChange={(e) => setFormData({ ...formData, target: e.target.value as PromotionTarget })}
                                >
                                    <option value="ALL_USERS">👥 All Users</option>
                                    <option value="SPECIFIC_USERS">🎁 Specific Users</option>
                                    <option value="FIRST_ORDER">🆕 First Order Only</option>
                                    <option value="CONDITIONAL">💰 Conditional (Spend X Get Y)</option>
                                </Select>
                                <div className="text-xs text-neutral-500 mt-1">
                                    {formData.target === "ALL_USERS" && "Anyone can use this promo"}
                                    {formData.target === "SPECIFIC_USERS" && "Manually assign to specific users"}
                                    {formData.target === "FIRST_ORDER" && "Auto-applies to user's first order"}
                                    {formData.target === "CONDITIONAL" && "Requires minimum spend threshold"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conditional Promotion: Spend X Get Y */}
                    {formData.target === "CONDITIONAL" && (
                        <div className="space-y-4 bg-purple-900/10 border border-purple-700/30 rounded-lg p-4">
                            <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-purple-700/30 pb-2">
                                🎯 Spend X Get Y Configuration
                            </h3>
                            <div className="bg-purple-900/20 border border-purple-700/20 rounded p-3 text-xs text-purple-200">
                                <strong>How it works:</strong> When user spends the threshold amount, they automatically receive the reward you configure below. 
                                Example: Spend $20, get $5 off.
                            </div>
                            
                            {/* Spend Threshold */}
                            <div>
                                <Input
                                    label="Spend Threshold (Required)"
                                    type="number"
                                    step="0.01"
                                    value={formData.spendThreshold}
                                    onChange={(e) => setFormData({ ...formData, spendThreshold: e.target.value })}
                                    placeholder="20.00"
                                />
                                <div className="text-xs text-neutral-500 mt-1">
                                    The minimum amount customer must spend to unlock the reward (e.g., $20)
                                </div>
                            </div>

                            {/* Threshold Reward */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Select
                                        label="Reward Type"
                                        value={formData.thresholdRewardType}
                                        onChange={(e) => setFormData({ ...formData, thresholdRewardType: e.target.value as "FIXED_AMOUNT" | "PERCENTAGE" | "FREE_DELIVERY" })}
                                    >
                                        <option value="FIXED_AMOUNT">💵 Fixed Amount Off</option>
                                        <option value="PERCENTAGE">📊 Percentage Off</option>
                                        <option value="FREE_DELIVERY">🚚 Free Delivery</option>
                                    </Select>
                                    <div className="text-xs text-neutral-500 mt-1">
                                        What reward they get when threshold is met
                                    </div>
                                </div>
                                {formData.thresholdRewardType !== "FREE_DELIVERY" && (
                                    <div>
                                        <Input
                                            label="Reward Value"
                                            type="number"
                                            step="0.01"
                                            value={formData.thresholdRewardValue}
                                            onChange={(e) => setFormData({ ...formData, thresholdRewardValue: e.target.value })}
                                            placeholder={formData.thresholdRewardType === "PERCENTAGE" ? "10" : "5.00"}
                                        />
                                        <div className="text-xs text-neutral-500 mt-1">
                                            {formData.thresholdRewardType === "PERCENTAGE" 
                                                ? "Percentage off (e.g., 10 for 10%)" 
                                                : "Dollar amount off (e.g., 5 for $5)"}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-900/20 border border-blue-700/20 rounded p-3 text-xs text-blue-200">
                                <strong>💡 Example:</strong> Spend Threshold: $20 → Reward Type: Fixed Amount → Reward Value: $5 = "Spend $20, get $5 off"
                            </div>
                        </div>
                    )}

                    {/* Discount Settings */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                            💸 Discount Configuration
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label={formData.type === "PERCENTAGE" ? "Discount Percentage" : "Discount Amount"}
                                    type="number"
                                    step="0.01"
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                    placeholder={formData.type === "PERCENTAGE" ? "20" : "5.00"}
                                />
                                <div className="text-xs text-neutral-500 mt-1">
                                    {formData.type === "PERCENTAGE" ? "Enter value as number (e.g., 20 for 20%)" : "Enter dollar amount (e.g., 5 for $5 off)"}
                                </div>
                            </div>
                            <div>
                                <Input
                                    label="Max Discount Cap"
                                    type="number"
                                    step="0.01"
                                    value={formData.maxDiscountCap}
                                    onChange={(e) => setFormData({ ...formData, maxDiscountCap: e.target.value })}
                                    placeholder="50.00"
                                />
                                <div className="text-xs text-neutral-500 mt-1">
                                    Maximum discount amount (useful for percentage promos)
                                </div>
                            </div>
                        </div>

                        <Input
                            label="Minimum Order Amount"
                            type="number"
                            step="0.01"
                            value={formData.minOrderAmount}
                            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                            placeholder="20.00"
                        />
                        <div className="text-xs text-neutral-500 -mt-2">
                            Order must be at least this amount to qualify (leave empty for no minimum)
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                            ⚙️ Advanced Settings
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="Priority"
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    placeholder="50"
                                />
                                <div className="text-xs text-neutral-500 mt-1">
                                    Higher priority = applied first (0-100, default: 50)
                                </div>
                            </div>
                            <div>
                                <Select
                                    label="Can Stack with Others?"
                                    value={formData.isStackable}
                                    onChange={(e) => setFormData({ ...formData, isStackable: e.target.value })}
                                >
                                    <option value="false">❌ No - Exclusive</option>
                                    <option value="true">✅ Yes - Stackable</option>
                                </Select>
                                <div className="text-xs text-neutral-500 mt-1">
                                    Allow combining with other promotions
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                            📅 Schedule & Status
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="Start Date & Time"
                                    type="datetime-local"
                                    value={formData.startsAt}
                                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                />
                                <div className="text-xs text-neutral-500 mt-1">
                                    When this promotion becomes active
                                </div>
                            </div>
                            <div>
                                <Input
                                    label="End Date & Time"
                                    type="datetime-local"
                                    value={formData.endsAt}
                                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                />
                                <div className="text-xs text-neutral-500 mt-1">
                                    When this promotion expires
                                </div>
                            </div>
                        </div>

                        <Select
                            label="Status"
                            value={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
                        >
                            <option value="true">✅ Active</option>
                            <option value="false">⏸️ Inactive</option>
                        </Select>
                        <div className="text-xs text-neutral-500 -mt-2">
                            Inactive promotions won't be applied even if dates are valid
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                        <Button variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={creating || updating || !formData.name.trim()}>
                            {creating || updating ? "Saving..." : editingPromotion ? "Update Promotion" : "Create Promotion"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Promotion">
                <div className="space-y-4">
                    <p className="text-neutral-300">
                        Are you sure you want to delete &quot;{promotionToDelete?.name}&quot;?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
