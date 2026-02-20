"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Tag, Plus, Edit, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_PROMOTIONS } from "@/graphql/operations/promotions/queries";
import { CREATE_PROMOTION, UPDATE_PROMOTION, DELETE_PROMOTION } from "@/graphql/operations/promotions/mutations";
import type { PromotionType, PromotionTarget, GetPromotionsQuery } from "@/gql/graphql";

const promotionTypeLabels: Record<PromotionType, string> = {
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
    type: PromotionType;
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
    eligibleBusinessIds: string[];
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
    eligibleBusinessIds: [],
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
    const { data, loading, error, refetch } = useQuery<GetPromotionsQuery>(GET_PROMOTIONS);
    const [createPromotion, { loading: creating }] = useMutation(CREATE_PROMOTION, {
        onCompleted: () => refetch(),
    });
    const [updatePromotion, { loading: updating }] = useMutation(UPDATE_PROMOTION, {
        onCompleted: () => refetch(),
    });
    const [deletePromotion, { loading: deleting }] = useMutation(DELETE_PROMOTION, {
        onCompleted: () => refetch(),
    });

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<GetPromotionsQuery["getAllPromotions"][number] | null>(null);
    const [promotionToDelete, setPromotionToDelete] = useState<GetPromotionsQuery["getAllPromotions"][number] | null>(null);
    const [formData, setFormData] = useState<PromotionFormState>(emptyForm);
    const [searchTerm, setSearchTerm] = useState("");
    const [wizardStep, setWizardStep] = useState(1);

    const { data: businessesData, loading: businessesLoading } = useQuery(GET_BUSINESSES);
    const businesses = businessesData?.businesses || [];
    const filteredBusinesses = businesses.filter((b: any) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const promotions = useMemo(() => data?.getAllPromotions ?? [], [data?.getAllPromotions]);

    const handleOpenCreate = () => {
        setEditingPromotion(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const handleOpenEdit = (promotion: GetPromotionsQuery["getAllPromotions"][number]) => {
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
            eligibleBusinessIds: (promotion as any).eligibleBusinessIds || [],
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPromotion(null);
        setFormData(emptyForm);
        setWizardStep(1);
    };

    const handleDeleteRequest = (promotion: GetPromotionsQuery["getAllPromotions"][number]) => {
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
            eligibleBusinessIds: (formData.eligibleBusinessIds || []).length ? formData.eligibleBusinessIds : undefined,
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
                        Promotions
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

            {/* Create/Edit Modal - Wizard */}
            <Modal isOpen={showModal} onClose={handleCloseModal} title={editingPromotion ? "Edit Promotion" : "Create Promotion"}>
                <div className="space-y-6">
                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between mb-6">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center flex-1">
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                        step === wizardStep
                                            ? "bg-cyan-500 border-cyan-500 text-white"
                                            : step < wizardStep
                                                ? "bg-green-500 border-green-500 text-white"
                                                : "bg-gray-800 border-gray-600 text-gray-400"
                                    }`}
                                >
                                    {step < wizardStep ? "✓" : step}
                                </div>
                                {step < 3 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 ${
                                            step < wizardStep ? "bg-green-500" : "bg-gray-700"
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step Titles */}
                    <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-white">
                            {wizardStep === 1 && "Step 1: Basic Information"}
                            {wizardStep === 2 && "Step 2: Discount & Conditions"}
                            {wizardStep === 3 && "Step 3: Advanced Settings"}
                        </h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            {wizardStep === 1 && "Set up the basic details of your promotion"}
                            {wizardStep === 2 && "Configure discount values and eligibility"}
                            {wizardStep === 3 && "Configure priority, schedule, and status"}
                        </p>
                    </div>

                    {/* Form Content */}
                    <div className="max-h-[50vh] overflow-y-auto pr-2">
                        {/* STEP 1: Basic Information */}
                        {wizardStep === 1 && (
                            <div className="space-y-4">
                                <Input
                                    label="Promotion Name *"
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
                                    Leave empty for auto-applied promotions. Enter a code for manual entry by customers.
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div>
                                        <Select
                                            label="Promotion Type *"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as PromotionType })}
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
                                            label="Target Audience *"
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
                        )}

                        {/* STEP 2: Discount & Conditions */}
                        {wizardStep === 2 && (
                            <div className="space-y-6">
                                {/* Discount Settings */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                                        💸 Discount Configuration
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Input
                                                label={formData.type === "PERCENTAGE" ? "Discount Percentage *" : "Discount Amount *"}
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
                                                Maximum discount amount (optional)
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
                                        Order must be at least this amount to qualify (optional)
                                    </div>
                                </div>

                                {/* Spend Threshold Progress Bar (for ALL_USERS and CONDITIONAL) */}
                                {(formData.target === "ALL_USERS" || formData.target === "CONDITIONAL") && (
                                    <div className="space-y-4 bg-blue-900/10 border border-blue-700/30 rounded-lg p-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-blue-700/30 pb-2">
                                            📊 Progress Bar Threshold (Optional)
                                        </h3>
                                        <div className="bg-blue-900/20 border border-blue-700/20 rounded p-3 text-xs text-blue-200">
                                            <strong>💡 Progress Bar:</strong> If you set a spend threshold, customers will see a progress bar showing how close they are to unlocking this promotion.
                                            {formData.target === "ALL_USERS" && " Perfect for \"Spend €20, get free delivery\" type promotions for all users!"}
                                        </div>
                                        
                                        <Input
                                            label="Spend Threshold (Optional)"
                                            type="number"
                                            step="0.01"
                                            value={formData.spendThreshold}
                                            onChange={(e) => setFormData({ ...formData, spendThreshold: e.target.value })}
                                            placeholder="20.00"
                                        />
                                        <div className="text-xs text-neutral-500 -mt-2">
                                            The amount customers need to spend to unlock this promotion (e.g., €20)
                                        </div>
                                    </div>
                                )}

                                {/* Conditional Promotion: Reward Configuration */}
                                {formData.target === "CONDITIONAL" && formData.spendThreshold.trim() && (
                                    <div className="space-y-4 bg-purple-900/10 border border-purple-700/30 rounded-lg p-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-purple-700/30 pb-2">
                                            🎁 Threshold Reward
                                        </h3>
                                        <div className="bg-purple-900/20 border border-purple-700/20 rounded p-3 text-xs text-purple-200">
                                            <strong>How it works:</strong> When user spends the threshold amount, they automatically receive the reward you configure below.
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Select
                                                    label="Reward Type *"
                                                    value={formData.thresholdRewardType}
                                                    onChange={(e) => setFormData({ ...formData, thresholdRewardType: e.target.value as "FIXED_AMOUNT" | "PERCENTAGE" | "FREE_DELIVERY" })}
                                                >
                                                    <option value="FIXED_AMOUNT">💵 Fixed Amount Off</option>
                                                    <option value="PERCENTAGE">📊 Percentage Off</option>
                                                    <option value="FREE_DELIVERY">🚚 Free Delivery</option>
                                                </Select>
                                            </div>
                                            {formData.thresholdRewardType !== "FREE_DELIVERY" && (
                                                <div>
                                                    <Input
                                                        label="Reward Value *"
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.thresholdRewardValue}
                                                        onChange={(e) => setFormData({ ...formData, thresholdRewardValue: e.target.value })}
                                                        placeholder={formData.thresholdRewardType === "PERCENTAGE" ? "10" : "5.00"}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Eligible Businesses */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-neutral-800 pb-2">
                                        🏬 Eligible Businesses (Optional)
                                    </h3>
                                    <div className="text-xs text-neutral-500">
                                        Select which businesses this promotion applies to. Leave empty for all businesses.
                                    </div>

                                    <div>
                                        <Input
                                            label="Search businesses"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Filter by name..."
                                        />
                                    </div>

                                    <div className="max-h-40 overflow-auto border border-neutral-800 rounded p-2 bg-gray-900">
                                        {businessesLoading ? (
                                            <div className="text-sm text-neutral-400">Loading businesses...</div>
                                        ) : filteredBusinesses.length === 0 ? (
                                            <div className="text-sm text-neutral-400">No businesses found</div>
                                        ) : (
                                            filteredBusinesses.map((b: any) => (
                                                <label key={b.id} className="flex items-center gap-2 py-1 hover:bg-gray-800 rounded px-1">
                                                    <Checkbox
                                                        checked={(formData.eligibleBusinessIds || []).includes(b.id)}
                                                        onChange={() => {
                                                            const current = formData.eligibleBusinessIds || [];
                                                            if (current.includes(b.id)) {
                                                                setFormData({ ...formData, eligibleBusinessIds: current.filter((x) => x !== b.id) });
                                                            } else {
                                                                setFormData({ ...formData, eligibleBusinessIds: [...current, b.id] });
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm">{b.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                        Selected: {(formData.eligibleBusinessIds || []).length} {(formData.eligibleBusinessIds || []).length === 0 && "(applies to all businesses)"}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Advanced Settings */}
                        {wizardStep === 3 && (
                            <div className="space-y-6">
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
                                                When this promotion becomes active (optional)
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
                                                When this promotion expires (optional)
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

                                {/* Summary Preview */}
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
                                    <h4 className="text-white font-semibold text-sm mb-3">📋 Promotion Summary</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-neutral-400">Name:</div>
                                        <div className="text-white">{formData.name || "-"}</div>
                                        
                                        <div className="text-neutral-400">Type:</div>
                                        <div className="text-white">{promotionTypeLabels[formData.type]}</div>
                                        
                                        <div className="text-neutral-400">Target:</div>
                                        <div className="text-white">{promotionTargetLabels[formData.target]}</div>
                                        
                                        <div className="text-neutral-400">Discount:</div>
                                        <div className="text-white">
                                            {formData.type === "PERCENTAGE" 
                                                ? `${formData.discountValue || "0"}%` 
                                                : `€${formData.discountValue || "0"}`}
                                        </div>
                                        
                                        {formData.spendThreshold && (
                                            <>
                                                <div className="text-neutral-400">Spend Threshold:</div>
                                                <div className="text-cyan-400">€{formData.spendThreshold}</div>
                                            </>
                                        )}
                                        
                                        <div className="text-neutral-400">Businesses:</div>
                                        <div className="text-white">
                                            {(formData.eligibleBusinessIds || []).length > 0 
                                                ? `${formData.eligibleBusinessIds.length} selected` 
                                                : "All businesses"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                if (wizardStep === 1) {
                                    handleCloseModal();
                                } else {
                                    setWizardStep(wizardStep - 1);
                                }
                            }}
                        >
                            {wizardStep === 1 ? "Cancel" : "← Back"}
                        </Button>
                        
                        <div className="text-xs text-neutral-400">
                            Step {wizardStep} of 3
                        </div>
                        
                        {wizardStep < 3 ? (
                            <Button 
                                onClick={() => setWizardStep(wizardStep + 1)}
                                disabled={
                                    (wizardStep === 1 && !formData.name.trim()) ||
                                    (wizardStep === 2 && !formData.discountValue.trim())
                                }
                            >
                                Next →
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleSave} 
                                disabled={creating || updating || !formData.name.trim()}
                            >
                                {creating || updating ? "Saving..." : editingPromotion ? "Update Promotion" : "Create Promotion"}
                            </Button>
                        )}
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
