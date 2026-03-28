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
    FIXED_AMOUNT: "Fixed Amount",
    PERCENTAGE: "Percentage",
    FREE_DELIVERY: "Free Delivery",
    SPEND_X_FIXED: "Spend X, Get €Y Off",
    SPEND_X_PERCENT: "Spend X, Get Y% Off",
    SPEND_X_GET_FREE: "Spend X, Get Free Delivery",
};

/** Which fields are relevant per promotion type */
const typeFieldVisibility = {
    FIXED_AMOUNT:     { discountValue: true,  maxDiscountCap: false, spendThreshold: false, thresholdReward: false },
    PERCENTAGE:       { discountValue: true,  maxDiscountCap: true,  spendThreshold: false, thresholdReward: false },
    FREE_DELIVERY:    { discountValue: false, maxDiscountCap: false, spendThreshold: false, thresholdReward: false },
    SPEND_X_FIXED:    { discountValue: true,  maxDiscountCap: false, spendThreshold: true,  thresholdReward: false },
    SPEND_X_PERCENT:  { discountValue: true,  maxDiscountCap: true,  spendThreshold: true,  thresholdReward: false },
    SPEND_X_GET_FREE: { discountValue: false, maxDiscountCap: false, spendThreshold: true,  thresholdReward: true  },
} as const;

const isSpendType = (t: string) => t.startsWith("SPEND_X_");
const isPercentType = (t: string) => t === "PERCENTAGE" || t === "SPEND_X_PERCENT";

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
    maxGlobalUsage: string;
    maxUsagePerUser: string;
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
    type: "FIXED_AMOUNT" as PromotionType,
    target: "ALL_USERS" as PromotionTarget,
    discountValue: "",
    maxDiscountCap: "",
    minOrderAmount: "",
    spendThreshold: "",
    thresholdRewardType: "FIXED_AMOUNT",
    thresholdRewardValue: "",
    maxGlobalUsage: "",
    maxUsagePerUser: "",
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
            maxGlobalUsage: promotion.maxGlobalUsage ? String(promotion.maxGlobalUsage) : "",
            maxUsagePerUser: promotion.maxUsagePerUser ? String(promotion.maxUsagePerUser) : "",
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
        // Construct thresholdReward JSON for types/targets that need it
        let thresholdReward: string | undefined = undefined;

        if (formData.type === "SPEND_X_GET_FREE") {
            // Always free delivery for this type
            thresholdReward = JSON.stringify({ type: "FREE_DELIVERY" });
        } else if (formData.target === "CONDITIONAL" && formData.spendThreshold.trim()) {
            const rewardObj: { type: string; value?: number } = {
                type: formData.thresholdRewardType,
            };
            if (formData.thresholdRewardType !== "FREE_DELIVERY" && formData.thresholdRewardValue.trim()) {
                rewardObj.value = Number(formData.thresholdRewardValue);
            }
            thresholdReward = JSON.stringify(rewardObj);
        }

        const vis = typeFieldVisibility[formData.type];
        
        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            code: formData.code.trim().toUpperCase() || undefined,
            type: formData.type,
            target: formData.target,
            discountValue: vis.discountValue ? toOptionalNumber(formData.discountValue) : undefined,
            maxDiscountCap: vis.maxDiscountCap ? toOptionalNumber(formData.maxDiscountCap) : undefined,
            minOrderAmount: toOptionalNumber(formData.minOrderAmount),
            spendThreshold: vis.spendThreshold ? toOptionalNumber(formData.spendThreshold) : undefined,
            thresholdReward: thresholdReward,
            maxGlobalUsage: toOptionalNumber(formData.maxGlobalUsage) ? Math.round(Number(formData.maxGlobalUsage)) : undefined,
            maxUsagePerUser: toOptionalNumber(formData.maxUsagePerUser) ? Math.round(Number(formData.maxUsagePerUser)) : undefined,
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
            : "bg-neutral-500/10 text-zinc-500 border-neutral-500/30";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        <Tag size={26} />
                        Promotions
                    </h1>
                    <p className="text-zinc-500 mt-1">
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
                    <div className="p-6 text-zinc-500">Loading promotions...</div>
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
                                        <div className="text-center py-10 text-zinc-500">
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
                                                <div className="text-xs text-violet-400 font-mono">{promotion.code}</div>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-zinc-400">
                                                {promotionTypeLabels[promotion.type]}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-zinc-400">
                                                {promotionTargetLabels[promotion.target]}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-white">
                                                {promotion.type === "PERCENTAGE"
                                                    ? `${promotion.discountValue}%`
                                                    : promotion.type === "FREE_DELIVERY"
                                                        ? "Free delivery"
                                                        : promotion.type === "SPEND_X_GET_FREE"
                                                            ? `Spend €${promotion.spendThreshold?.toFixed(2) || "?"} → free delivery`
                                                            : promotion.type === "SPEND_X_PERCENT"
                                                                ? `Spend €${promotion.spendThreshold?.toFixed(2) || "?"} → ${promotion.discountValue}% off`
                                                                : promotion.type === "SPEND_X_FIXED"
                                                                    ? `Spend €${promotion.spendThreshold?.toFixed(2) || "?"} → €${promotion.discountValue?.toFixed(2) || "0"} off`
                                                                    : `€${promotion.discountValue?.toFixed(2) || "0.00"}`}
                                            </div>
                                            {promotion.maxDiscountCap && (
                                                <div className="text-xs text-zinc-500">
                                                    Cap: â‚¬{promotion.maxDiscountCap.toFixed(2)}
                                                </div>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-zinc-400">{promotion.priority}</div>
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
                                            ? "bg-violet-500 border-violet-500 text-white"
                                            : step < wizardStep
                                                ? "bg-green-500 border-green-500 text-white"
                                                : "bg-gray-800 border-gray-600 text-gray-400"
                                    }`}
                                >
                                    {step < wizardStep ? "âœ“" : step}
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
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                            {wizardStep === 1 && "Step 1: Basic Information"}
                            {wizardStep === 2 && "Step 2: Configure the Deal"}
                            {wizardStep === 3 && "Step 3: Limits, Schedule & Review"}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            {wizardStep === 1 && "Set up the basic details of your promotion"}
                            {wizardStep === 2 && "Configure discount values and business eligibility"}
                            {wizardStep === 3 && "Set usage limits, schedule, and review your promotion"}
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
                                <div className="text-xs text-zinc-600 -mt-2">
                                    Internal name for this promotion (visible to admins only)
                                </div>
                                
                                <Input
                                    label="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Get 20% off your first order!"
                                />
                                <div className="text-xs text-zinc-600 -mt-2">
                                    Customer-facing description shown in the app
                                </div>

                                <Input
                                    label="Promo Code (Optional)"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="SUMMER20"
                                />
                                <div className="text-xs text-zinc-600 -mt-2">
                                    Leave empty for auto-applied promotions. Enter a code for manual entry by customers.
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div>
                                        <Select
                                            label="Promotion Type *"
                                            value={formData.type}
                                            onChange={(e) => {
                                                const newType = e.target.value as PromotionType;
                                                const updates: Partial<PromotionFormState> = { type: newType };
                                                const vis = typeFieldVisibility[newType];
                                                if (!vis.discountValue) { updates.discountValue = ""; }
                                                if (!vis.maxDiscountCap) { updates.maxDiscountCap = ""; }
                                                if (!vis.spendThreshold) { updates.spendThreshold = ""; updates.thresholdRewardValue = ""; }
                                                if (newType === "SPEND_X_GET_FREE") { updates.thresholdRewardType = "FREE_DELIVERY"; updates.thresholdRewardValue = ""; }
                                                setFormData((prev) => ({ ...prev, ...updates }));
                                            }}
                                        >
                                            <optgroup label="Simple Discounts">
                                                <option value="FIXED_AMOUNT">Fixed Amount (e.g., &euro;5 off)</option>
                                                <option value="PERCENTAGE">Percentage (e.g., 20% off)</option>
                                                <option value="FREE_DELIVERY">Free Delivery</option>
                                            </optgroup>
                                            <optgroup label="Spend Threshold Deals">
                                                <option value="SPEND_X_FIXED">Spend &euro;X, Get &euro;Y Off</option>
                                                <option value="SPEND_X_PERCENT">Spend &euro;X, Get Y% Off</option>
                                                <option value="SPEND_X_GET_FREE">Spend &euro;X, Get Free Delivery</option>
                                            </optgroup>
                                        </Select>
                                        <div className="text-xs text-zinc-600 mt-1">
                                            {formData.type === "FIXED_AMOUNT" && "Subtract a fixed euro amount from the order"}
                                            {formData.type === "PERCENTAGE" && "Discount by percentage of order subtotal"}
                                            {formData.type === "FREE_DELIVERY" && "Waive the delivery fee entirely"}
                                            {formData.type === "SPEND_X_FIXED" && "Customer spends a minimum, gets a fixed discount"}
                                            {formData.type === "SPEND_X_PERCENT" && "Customer spends a minimum, gets a percentage discount"}
                                            {formData.type === "SPEND_X_GET_FREE" && "Customer spends a minimum, gets free delivery"}
                                        </div>
                                    </div>
                                    <div>
                                        <Select
                                            label="Target Audience *"
                                            value={formData.target}
                                            onChange={(e) => setFormData({ ...formData, target: e.target.value as PromotionTarget })}
                                        >
                                            <option value="ALL_USERS">All Users</option>
                                            <option value="SPECIFIC_USERS">Specific Users</option>
                                            <option value="FIRST_ORDER">First Order Only</option>
                                            <option value="CONDITIONAL">Conditional (Spend Threshold)</option>
                                        </Select>
                                        <div className="text-xs text-zinc-600 mt-1">
                                            {formData.target === "ALL_USERS" && "Anyone can use this promo"}
                                            {formData.target === "SPECIFIC_USERS" && "Manually assign to specific users"}
                                            {formData.target === "FIRST_ORDER" && "Auto-applies to user's first order"}
                                            {formData.target === "CONDITIONAL" && "Requires minimum spend threshold"}
                                        </div>
                                    </div>
                                </div>

                                {/* Type-specific info banner */}
                                {isSpendType(formData.type) && (
                                    <div className="bg-violet-900/15 border border-violet-700/30 rounded-lg p-3 text-xs text-violet-200 mt-4">
                                        <strong>How it works:</strong>{" "}
                                        {formData.type === "SPEND_X_FIXED" && "Customer sees a progress bar in the cart. When their subtotal reaches the threshold, a fixed euro discount is automatically applied."}
                                        {formData.type === "SPEND_X_PERCENT" && "Customer sees a progress bar in the cart. When their subtotal reaches the threshold, a percentage discount is automatically applied."}
                                        {formData.type === "SPEND_X_GET_FREE" && "Customer sees a progress bar in the cart. When their subtotal reaches the threshold, delivery becomes free automatically."}
                                    </div>
                                )}
                                {formData.type === "FREE_DELIVERY" && (
                                    <div className="bg-green-900/15 border border-green-700/30 rounded-lg p-3 text-xs text-green-200 mt-4">
                                        <strong>Free Delivery:</strong> The delivery fee will be waived entirely. No discount amount needed.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 2: Configure the Deal */}
                        {wizardStep === 2 && (
                            <div className="space-y-6">
                                {/* --- Spend Threshold (SPEND_X_* types) --- */}
                                {typeFieldVisibility[formData.type].spendThreshold && (
                                    <div className="space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                            Spend Threshold
                                        </h3>
                                        <Input
                                            label="Minimum Spend to Unlock *"
                                            type="number"
                                            step="0.01"
                                            value={formData.spendThreshold}
                                            onChange={(e) => setFormData({ ...formData, spendThreshold: e.target.value })}
                                            placeholder="20.00"
                                        />
                                        <div className="text-xs text-zinc-600 -mt-2">
                                            Customers must spend at least &euro;{formData.spendThreshold || "?"} to unlock this deal. A progress bar is shown in the cart.
                                        </div>
                                    </div>
                                )}

                                {/* --- Discount Value (not for FREE_DELIVERY / SPEND_X_GET_FREE) --- */}
                                {typeFieldVisibility[formData.type].discountValue && (
                                    <div className="space-y-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                            Discount Configuration
                                        </h3>
                                        <div className={`grid gap-4 ${typeFieldVisibility[formData.type].maxDiscountCap ? "grid-cols-2" : "grid-cols-1"}`}>
                                            <div>
                                                <Input
                                                    label={isPercentType(formData.type) ? "Discount Percentage (%) *" : "Discount Amount (\u20ac) *"}
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.discountValue}
                                                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                                    placeholder={isPercentType(formData.type) ? "20" : "5.00"}
                                                />
                                                <div className="text-xs text-zinc-600 mt-1">
                                                    {isPercentType(formData.type)
                                                        ? "Enter as a number (e.g., 20 for 20% off)"
                                                        : "Enter euro amount (e.g., 5 for \u20ac5 off)"}
                                                </div>
                                            </div>
                                            {/* Max discount cap — only for percentage types */}
                                            {typeFieldVisibility[formData.type].maxDiscountCap && (
                                                <div>
                                                    <Input
                                                        label="Max Discount Cap (\u20ac)"
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.maxDiscountCap}
                                                        onChange={(e) => setFormData({ ...formData, maxDiscountCap: e.target.value })}
                                                        placeholder="50.00"
                                                    />
                                                    <div className="text-xs text-zinc-600 mt-1">
                                                        Maximum discount (e.g., 20% off but never more than &euro;50)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* --- FREE_DELIVERY / SPEND_X_GET_FREE — no discount fields, just a note --- */}
                                {formData.type === "FREE_DELIVERY" && (
                                    <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4 text-sm text-green-200">
                                        No discount amount needed &mdash; the delivery fee will be set to &euro;0.
                                    </div>
                                )}
                                {formData.type === "SPEND_X_GET_FREE" && (
                                    <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4 text-sm text-green-200">
                                        When customers spend &euro;{formData.spendThreshold || "?"}, delivery becomes free automatically.
                                    </div>
                                )}

                                {/* --- Min Order Amount (simple types only — SPEND_X uses threshold instead) --- */}
                                {!isSpendType(formData.type) && (
                                    <div className="space-y-2">
                                        <Input
                                            label="Minimum Order Amount (\u20ac)"
                                            type="number"
                                            step="0.01"
                                            value={formData.minOrderAmount}
                                            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                            placeholder="10.00"
                                        />
                                        <div className="text-xs text-zinc-600">
                                            Order subtotal must be at least this amount to qualify (optional)
                                        </div>
                                    </div>
                                )}

                                {/* --- Spend Threshold for Progress Bar (non-SPEND_X types but CONDITIONAL/ALL_USERS target) --- */}
                                {!isSpendType(formData.type) && (formData.target === "ALL_USERS" || formData.target === "CONDITIONAL") && (
                                    <div className="space-y-4 bg-blue-900/10 border border-blue-700/30 rounded-lg p-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-blue-700/30 pb-2">
                                            Progress Bar Threshold (Optional)
                                        </h3>
                                        <div className="bg-blue-900/20 border border-blue-700/20 rounded p-3 text-xs text-blue-200">
                                            If you set a spend threshold, customers will see a progress bar in the cart showing how close they are to unlocking this promotion.
                                        </div>
                                        <Input
                                            label="Spend Threshold (\u20ac)"
                                            type="number"
                                            step="0.01"
                                            value={formData.spendThreshold}
                                            onChange={(e) => setFormData({ ...formData, spendThreshold: e.target.value })}
                                            placeholder="20.00"
                                        />
                                    </div>
                                )}

                                {/* --- Conditional Threshold Reward (non-SPEND_X types with CONDITIONAL target) --- */}
                                {!isSpendType(formData.type) && formData.target === "CONDITIONAL" && formData.spendThreshold.trim() && (
                                    <div className="space-y-4 bg-purple-900/10 border border-purple-700/30 rounded-lg p-4">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-purple-700/30 pb-2">
                                            Threshold Reward
                                        </h3>
                                        <div className="bg-purple-900/20 border border-purple-700/20 rounded p-3 text-xs text-purple-200">
                                            When a user spends the threshold amount, they automatically receive this reward.
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Select
                                                    label="Reward Type *"
                                                    value={formData.thresholdRewardType}
                                                    onChange={(e) => setFormData({ ...formData, thresholdRewardType: e.target.value as "FIXED_AMOUNT" | "PERCENTAGE" | "FREE_DELIVERY" })}
                                                >
                                                    <option value="FIXED_AMOUNT">Fixed Amount Off</option>
                                                    <option value="PERCENTAGE">Percentage Off</option>
                                                    <option value="FREE_DELIVERY">Free Delivery</option>
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

                                {/* --- Eligible Businesses --- */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                        Eligible Businesses (Optional)
                                    </h3>
                                    <div className="text-xs text-zinc-600">
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

                                    <div className="max-h-40 overflow-auto border border-zinc-800 rounded p-2 bg-gray-900">
                                        {businessesLoading ? (
                                            <div className="text-sm text-zinc-500">Loading businesses...</div>
                                        ) : filteredBusinesses.length === 0 ? (
                                            <div className="text-sm text-zinc-500">No businesses found</div>
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
                                    <div className="text-xs text-zinc-600">
                                        Selected: {(formData.eligibleBusinessIds || []).length} {(formData.eligibleBusinessIds || []).length === 0 && "(applies to all businesses)"}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Limits, Schedule & Review */}
                        {wizardStep === 3 && (
                            <div className="space-y-6">
                                {/* Usage Limits */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                        Usage Limits
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Input
                                                label="Max Total Uses"
                                                type="number"
                                                value={formData.maxGlobalUsage}
                                                onChange={(e) => setFormData({ ...formData, maxGlobalUsage: e.target.value })}
                                                placeholder="Unlimited"
                                            />
                                            <div className="text-xs text-zinc-600 mt-1">
                                                How many times this promo can be used in total (leave empty for unlimited)
                                            </div>
                                        </div>
                                        <div>
                                            <Input
                                                label="Max Uses Per User"
                                                type="number"
                                                value={formData.maxUsagePerUser}
                                                onChange={(e) => setFormData({ ...formData, maxUsagePerUser: e.target.value })}
                                                placeholder="Unlimited"
                                            />
                                            <div className="text-xs text-zinc-600 mt-1">
                                                How many times each user can use it (leave empty for unlimited)
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Priority & Stacking */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                        Priority &amp; Stacking
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
                                            <div className="text-xs text-zinc-600 mt-1">
                                                Higher priority = applied first (0-100, default: 50)
                                            </div>
                                        </div>
                                        <div>
                                            <Select
                                                label="Can Stack with Others?"
                                                value={formData.isStackable}
                                                onChange={(e) => setFormData({ ...formData, isStackable: e.target.value })}
                                            >
                                                <option value="false">No &mdash; Exclusive</option>
                                                <option value="true">Yes &mdash; Stackable</option>
                                            </Select>
                                            <div className="text-xs text-zinc-600 mt-1">
                                                Allow combining with other promotions
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Schedule & Status */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                        Schedule &amp; Status
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Input
                                                label="Start Date & Time"
                                                type="datetime-local"
                                                value={formData.startsAt}
                                                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                            />
                                            <div className="text-xs text-zinc-600 mt-1">
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
                                            <div className="text-xs text-zinc-600 mt-1">
                                                When this promotion expires (optional)
                                            </div>
                                        </div>
                                    </div>

                                    <Select
                                        label="Status"
                                        value={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </Select>
                                    <div className="text-xs text-zinc-600 -mt-2">
                                        Inactive promotions won&apos;t be applied even if dates are valid
                                    </div>
                                </div>

                                {/* Summary Preview */}
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
                                    <h4 className="text-white font-semibold text-sm mb-3">Promotion Summary</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-zinc-500">Name:</div>
                                        <div className="text-white">{formData.name || "-"}</div>
                                        
                                        <div className="text-zinc-500">Type:</div>
                                        <div className="text-white">{promotionTypeLabels[formData.type]}</div>
                                        
                                        <div className="text-zinc-500">Target:</div>
                                        <div className="text-white">{promotionTargetLabels[formData.target]}</div>
                                        
                                        <div className="text-zinc-500">Deal:</div>
                                        <div className="text-white">
                                            {formData.type === "FIXED_AMOUNT" && `\u20ac${formData.discountValue || "0"} off`}
                                            {formData.type === "PERCENTAGE" && `${formData.discountValue || "0"}% off${formData.maxDiscountCap ? ` (max \u20ac${formData.maxDiscountCap})` : ""}`}
                                            {formData.type === "FREE_DELIVERY" && "Free delivery"}
                                            {formData.type === "SPEND_X_FIXED" && `Spend \u20ac${formData.spendThreshold || "?"}, get \u20ac${formData.discountValue || "?"} off`}
                                            {formData.type === "SPEND_X_PERCENT" && `Spend \u20ac${formData.spendThreshold || "?"}, get ${formData.discountValue || "?"}% off${formData.maxDiscountCap ? ` (max \u20ac${formData.maxDiscountCap})` : ""}`}
                                            {formData.type === "SPEND_X_GET_FREE" && `Spend \u20ac${formData.spendThreshold || "?"}, get free delivery`}
                                        </div>
                                        
                                        {formData.code && (
                                            <>
                                                <div className="text-zinc-500">Code:</div>
                                                <div className="text-violet-400 font-mono">{formData.code.toUpperCase()}</div>
                                            </>
                                        )}
                                        
                                        {!isSpendType(formData.type) && formData.minOrderAmount && (
                                            <>
                                                <div className="text-zinc-500">Min Order:</div>
                                                <div className="text-white">&euro;{formData.minOrderAmount}</div>
                                            </>
                                        )}
                                        
                                        <div className="text-zinc-500">Businesses:</div>
                                        <div className="text-white">
                                            {(formData.eligibleBusinessIds || []).length > 0 
                                                ? `${formData.eligibleBusinessIds.length} selected` 
                                                : "All businesses"}
                                        </div>

                                        {(formData.maxGlobalUsage || formData.maxUsagePerUser) && (
                                            <>
                                                <div className="text-zinc-500">Limits:</div>
                                                <div className="text-white">
                                                    {formData.maxGlobalUsage ? `${formData.maxGlobalUsage} total` : "Unlimited"}
                                                    {" / "}
                                                    {formData.maxUsagePerUser ? `${formData.maxUsagePerUser} per user` : "Unlimited per user"}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
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
                            {wizardStep === 1 ? "Cancel" : "\u2190 Back"}
                        </Button>
                        
                        <div className="text-xs text-zinc-500">
                            Step {wizardStep} of 3
                        </div>
                        
                        {wizardStep < 3 ? (
                            <Button 
                                onClick={() => setWizardStep(wizardStep + 1)}
                                disabled={
                                    (wizardStep === 1 && !formData.name.trim()) ||
                                    (wizardStep === 2 && typeFieldVisibility[formData.type].discountValue && !formData.discountValue.trim()) ||
                                    (wizardStep === 2 && typeFieldVisibility[formData.type].spendThreshold && !formData.spendThreshold.trim())
                                }
                            >
                                Next &rarr;
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
                    <p className="text-zinc-400">
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
