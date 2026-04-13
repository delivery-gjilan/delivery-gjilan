// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Tag, Plus, Edit, Trash2, HeartHandshake, CheckCircle2, Clock, Users, Search, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import { USERS_QUERY } from "@/graphql/operations/users/queries";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_PROMOTIONS, GET_RECOVERY_PROMOTIONS } from "@/graphql/operations/promotions/queries";
import { CREATE_PROMOTION, UPDATE_PROMOTION, DELETE_PROMOTION } from "@/graphql/operations/promotions/mutations";
import { ASSIGN_PROMOTION_TO_USERS } from "@/graphql/operations/notifications";
import type { PromotionType, PromotionTarget, GetPromotionsQuery, GetRecoveryPromotionsQuery } from "@/gql/graphql";

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

    // Creator
    creatorType: "PLATFORM" | "BUSINESS";
    creatorId: string;

    // Required for delivery-fee promotions (FREE_DELIVERY / SPEND_X_GET_FREE)
    // Fixed euro amount per order.
    driverPayoutAmount: string;
};

type PromoAssignUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
};

type QuickCodePromoFormState = {
    name: string;
    code: string;
    description: string;
    type: PromotionType;
    discountValue: string;
    maxDiscountCap: string;
    minOrderAmount: string;
    spendThreshold: string;
    maxUsagePerUser: string;
    maxGlobalUsage: string;
    isStackable: string;
    priority: string;
    driverPayoutAmount: string;
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
    creatorType: "PLATFORM",
    creatorId: "",
    driverPayoutAmount: "",
};

const emptyQuickCodePromoForm: QuickCodePromoFormState = {
    name: "",
    code: "",
    description: "",
    type: "FIXED_AMOUNT",
    discountValue: "",
    maxDiscountCap: "",
    minOrderAmount: "",
    spendThreshold: "",
    maxUsagePerUser: "1",
    maxGlobalUsage: "",
    isStackable: "false",
    priority: "50",
    driverPayoutAmount: "",
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
        onCompleted: () => { refetch(); refetchRecovery(); },
    });

    const [activeTab, setActiveTab] = useState<"promotions" | "promoCodes" | "compensations">("promotions");
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<GetPromotionsQuery["getAllPromotions"][number] | null>(null);
    const [promotionToDelete, setPromotionToDelete] = useState<GetPromotionsQuery["getAllPromotions"][number] | null>(null);
    const [formData, setFormData] = useState<PromotionFormState>(emptyForm);
    const [searchTerm, setSearchTerm] = useState("");
    const [wizardStep, setWizardStep] = useState(1);
    const [selectedCodePromotionId, setSelectedCodePromotionId] = useState("");
    const [promoGroupName, setPromoGroupName] = useState("Friends");
    const [promoUserSearch, setPromoUserSearch] = useState("");
    const [promoUsers, setPromoUsers] = useState<PromoAssignUser[]>([]);
    const [promoAssignResult, setPromoAssignResult] = useState<{ success: boolean; message: string } | null>(null);
    const [quickCodePromoForm, setQuickCodePromoForm] = useState<QuickCodePromoFormState>(emptyQuickCodePromoForm);

    const { data: recoveryData, loading: recoveryLoading, refetch: refetchRecovery } = useQuery<GetRecoveryPromotionsQuery>(GET_RECOVERY_PROMOTIONS, {
        fetchPolicy: "cache-and-network",
    });
    const recoveryPromotions = useMemo(() => (recoveryData as any)?.getRecoveryPromotions ?? [], [recoveryData]);

    const { data: businessesData, loading: businessesLoading } = useQuery(GET_BUSINESSES);
    const { data: usersData } = useQuery(USERS_QUERY);
    const [assignPromotionToUsers, { loading: assigningPromo }] = useMutation(ASSIGN_PROMOTION_TO_USERS, {
        onCompleted: () => refetch(),
    });
    const businesses = businessesData?.businesses || [];
    const filteredBusinesses = businesses.filter((b: any) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const promotions = useMemo(() => data?.getAllPromotions ?? [], [data?.getAllPromotions]);
    const codePromotions = useMemo(() => promotions.filter((promotion) => Boolean(promotion.code)), [promotions]);
    const quickCodeVis = typeFieldVisibility[quickCodePromoForm.type];
    const allUsers = useMemo(() => ((usersData as any)?.users ?? []) as PromoAssignUser[], [usersData]);
    const promoFilteredUsers = useMemo(() => {
        if (!promoUserSearch.trim()) return [];
        const term = promoUserSearch.toLowerCase();
        return allUsers
            .filter(
                (user) =>
                    !promoUsers.some((selected) => selected.id === user.id) &&
                    (user.firstName.toLowerCase().includes(term) ||
                        user.lastName.toLowerCase().includes(term) ||
                        user.email.toLowerCase().includes(term)),
            )
            .slice(0, 12);
    }, [allUsers, promoUserSearch, promoUsers]);
    const stackingGuidance = useMemo(() => {
        const isDeliveryType = formData.type === "FREE_DELIVERY" || formData.type === "SPEND_X_GET_FREE";
        const isPriceType = !isDeliveryType;
        const canStack = formData.isStackable === "true";

        const canStackWith: string[] = [];
        const cannotStackWith: string[] = [];
        const notes: string[] = [];

        if (!canStack) {
            cannotStackWith.push("All promotions (exclusive)");
            notes.push("This promotion is treated as exclusive and blocks other promotions at checkout.");
        } else {
            if (isPriceType) {
                canStackWith.push("Stackable free-delivery promotions");
                canStackWith.push("Other stackable price promotions");
            }
            if (isDeliveryType) {
                canStackWith.push("Stackable order-discount promotions (fixed/percentage)");
                cannotStackWith.push("Another free-delivery promotion in the same order");
            }

            if (formData.target === "FIRST_ORDER") {
                notes.push("First-order targeting still applies; stacking does not bypass target eligibility.");
            }
            if (formData.target === "SPECIFIC_USERS") {
                notes.push("User assignment and usage limits still gate eligibility before stacking.");
            }
            notes.push("Higher priority promotions are evaluated first.");
        }

        return { canStack, canStackWith, cannotStackWith, notes };
    }, [formData.type, formData.isStackable, formData.target]);

    const handleOpenCreate = () => {
        setEditingPromotion(null);
        setWizardStep(1);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const handleOpenEdit = (promotion: GetPromotionsQuery["getAllPromotions"][number]) => {
        // Editing supports name, description, and code
        setEditingPromotion(promotion);
        setWizardStep(1);
        setFormData({
            ...emptyForm,
            name: promotion.name,
            description: promotion.description ?? "",
            code: promotion.code ?? "",
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

    const handleAssignPromoCodeToGroup = async () => {
        if (!selectedCodePromotionId || promoUsers.length === 0) {
            return;
        }

        const result = await assignPromotionToUsers({
            variables: {
                input: {
                    promotionId: selectedCodePromotionId,
                    userIds: promoUsers.map((user) => user.id),
                },
            },
        });

        const assignedCount = ((result.data as any)?.assignPromotionToUsers ?? []).length;
        const selectedPromo = codePromotions.find((promotion) => promotion.id === selectedCodePromotionId);
        const groupLabel = promoGroupName.trim() || "selected group";
        setPromoAssignResult({
            success: true,
            message: `Assigned ${selectedPromo?.code ?? "promo code"} to ${assignedCount} users (${groupLabel}).`,
        });
        setPromoUsers([]);
        setPromoUserSearch("");
    };

    const handleCreateAndAssignPromoCode = async () => {
        if (!quickCodePromoForm.name.trim() || !quickCodePromoForm.code.trim() || promoUsers.length === 0) {
            return;
        }

        const isDeliveryFeePromotion = quickCodePromoForm.type === "FREE_DELIVERY" || quickCodePromoForm.type === "SPEND_X_GET_FREE";
        const driverPayoutAmount = isDeliveryFeePromotion ? toOptionalNumber(quickCodePromoForm.driverPayoutAmount) : undefined;
        if (isDeliveryFeePromotion && !driverPayoutAmount) {
            return;
        }

        const createPayload: any = {
            name: quickCodePromoForm.name.trim(),
            description: quickCodePromoForm.description.trim() || undefined,
            code: quickCodePromoForm.code.trim().toUpperCase(),
            type: quickCodePromoForm.type,
            target: "SPECIFIC_USERS",
            discountValue: quickCodeVis.discountValue ? toOptionalNumber(quickCodePromoForm.discountValue) : undefined,
            maxDiscountCap: quickCodeVis.maxDiscountCap ? toOptionalNumber(quickCodePromoForm.maxDiscountCap) : undefined,
            minOrderAmount: toOptionalNumber(quickCodePromoForm.minOrderAmount),
            spendThreshold: quickCodeVis.spendThreshold ? toOptionalNumber(quickCodePromoForm.spendThreshold) : undefined,
            maxGlobalUsage: toOptionalNumber(quickCodePromoForm.maxGlobalUsage)
                ? Math.round(Number(quickCodePromoForm.maxGlobalUsage))
                : undefined,
            maxUsagePerUser: toOptionalNumber(quickCodePromoForm.maxUsagePerUser)
                ? Math.round(Number(quickCodePromoForm.maxUsagePerUser))
                : 1,
            isStackable: quickCodePromoForm.isStackable === "true",
            priority: Number(quickCodePromoForm.priority || "50"),
            isActive: true,
            creatorType: "PLATFORM",
            driverPayoutAmount,
        };

        if (quickCodePromoForm.type === "SPEND_X_GET_FREE") {
            createPayload.thresholdReward = JSON.stringify({ type: "FREE_DELIVERY" });
        }

        const createRes = await createPromotion({ variables: { input: createPayload } });
        const createdPromotionId = (createRes.data as any)?.createPromotion?.id;

        if (!createdPromotionId) {
            return;
        }

        const assignRes = await assignPromotionToUsers({
            variables: {
                input: {
                    promotionId: createdPromotionId,
                    userIds: promoUsers.map((user) => user.id),
                },
            },
        });

        const assignedCount = ((assignRes.data as any)?.assignPromotionToUsers ?? []).length;
        const groupLabel = promoGroupName.trim() || "selected group";
        setPromoAssignResult({
            success: true,
            message: `Created ${quickCodePromoForm.code.trim().toUpperCase()} and assigned it to ${assignedCount} users (${groupLabel}).`,
        });
        setSelectedCodePromotionId(createdPromotionId);
        setPromoUsers([]);
        setPromoUserSearch("");
        setQuickCodePromoForm(emptyQuickCodePromoForm);
    };

    const handleSave = async () => {
        if (editingPromotion) {
            const code = formData.code.trim() ? formData.code.trim().toUpperCase() : null;
            await updatePromotion({
                variables: {
                    input: {
                        id: editingPromotion.id,
                        name: formData.name.trim(),
                        description: formData.description.trim() || null,
                        code,
                    } as any,
                },
            });
            handleCloseModal();
            return;
        }

        const isDeliveryFeePromotion = formData.type === "FREE_DELIVERY" || formData.type === "SPEND_X_GET_FREE";
        const driverPayoutAmount = isDeliveryFeePromotion ? toOptionalNumber(formData.driverPayoutAmount) : undefined;
        if (isDeliveryFeePromotion && !driverPayoutAmount) {
            return;
        }

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
            code: formData.code.trim() ? formData.code.trim().toUpperCase() : undefined,
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
            eligibleBusinessIds:
                formData.creatorType === "PLATFORM" && (formData.eligibleBusinessIds || []).length
                    ? formData.eligibleBusinessIds
                    : undefined,
            startsAt: formData.startsAt || undefined,
            endsAt: formData.endsAt || undefined,
            creatorType: formData.creatorType,
            creatorId: formData.creatorType === "BUSINESS" && formData.creatorId ? formData.creatorId : undefined,
            driverPayoutAmount,
        };

        await createPromotion({ variables: { input: payload } });
        handleCloseModal();
    };

    const getStatusBadge = (isActive: boolean) => {
        return isActive
            ? "bg-green-500/10 text-green-400 border-green-500/30"
            : "bg-neutral-500/10 text-zinc-500 border-neutral-500/30";
    };

    const formatCompensationValue = (promo: GetRecoveryPromotionsQuery["getRecoveryPromotions"][number]) => {
        if (promo.type === "FREE_DELIVERY") return "Free Delivery";
        if (promo.type === "PERCENTAGE") return `${promo.discountValue}% off`;
        if (promo.discountValue != null) return `€${promo.discountValue.toFixed(2)} off`;
        return "-";
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
                {activeTab === "promotions" && (
                    <Button onClick={handleOpenCreate}>
                        <Plus size={18} className="mr-2" />
                        Create Promotion
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-zinc-800">
                <button
                    onClick={() => setActiveTab("promotions")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeTab === "promotions"
                            ? "border-violet-500 text-violet-300"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <span className="flex items-center gap-2"><Tag size={14} /> Promotions</span>
                </button>
                <button
                    onClick={() => setActiveTab("compensations")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeTab === "compensations"
                            ? "border-violet-500 text-violet-300"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <HeartHandshake size={14} /> Compensations
                        {recoveryPromotions.length > 0 && (
                            <span className="ml-1 bg-violet-900/60 text-violet-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-violet-700/50">
                                {recoveryPromotions.length}
                            </span>
                        )}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("promoCodes")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeTab === "promoCodes"
                            ? "border-violet-500 text-violet-300"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    <span className="flex items-center gap-2"><Users size={14} /> Promo Codes</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
                    {error.message}
                </div>
            )}

            {/* ── Promotions Tab ── */}
            {activeTab === "promotions" && (
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
                                            {promotion.code ? (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div className="text-xs text-violet-400 font-mono">{promotion.code}</div>
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-500/40 bg-amber-500/10 text-amber-300">
                                                        Manual code
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="mt-1">
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border border-green-500/40 bg-green-500/10 text-green-300">
                                                        Auto-applied
                                                    </span>
                                                </div>
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
                                                    Cap: EUR {promotion.maxDiscountCap.toFixed(2)}
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
            )} {/* end promotions tab */}

            {/* ── Promo Codes Tab ── */}
            {activeTab === "promoCodes" && (
                <div className="space-y-4">
                    <div className="bg-violet-950/30 border border-violet-800/40 rounded-lg p-4 text-sm text-violet-200 flex gap-3">
                        <Users size={16} className="mt-0.5 shrink-0 text-violet-400" />
                        <div>
                            <div className="font-medium mb-1">Friend group promo codes</div>
                            <div className="text-violet-300/80">
                                Use this tab to assign a code-based promotion to a selected user group (friends, VIPs, partners). 
                                Users still need to enter the code in checkout, but only assigned users can redeem targeted promos.
                            </div>
                        </div>
                    </div>

                    {promoAssignResult && (
                        <div className="rounded-lg border border-green-700/40 bg-green-900/10 p-3 text-sm text-green-300">
                            {promoAssignResult.message}
                        </div>
                    )}

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                        <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4 space-y-4">
                            <div className="text-sm font-medium text-white">Create new code promo for this group</div>
                            <div className="text-xs text-zinc-400">
                                Set the promo kind and rules, then create and assign it directly to selected users.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Input
                                    label="Promo Name *"
                                    value={quickCodePromoForm.name}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Friends Spring Drop"
                                />
                                <Input
                                    label="Promo Code *"
                                    value={quickCodePromoForm.code}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="FRIENDS15"
                                />
                                <Select
                                    label="Promo Kind *"
                                    value={quickCodePromoForm.type}
                                    onChange={(e) => {
                                        const nextType = e.target.value as PromotionType;
                                        setQuickCodePromoForm((prev) => ({
                                            ...prev,
                                            type: nextType,
                                            discountValue: typeFieldVisibility[nextType].discountValue ? prev.discountValue : "",
                                            maxDiscountCap: typeFieldVisibility[nextType].maxDiscountCap ? prev.maxDiscountCap : "",
                                            spendThreshold: typeFieldVisibility[nextType].spendThreshold ? prev.spendThreshold : "",
                                            driverPayoutAmount: nextType === "FREE_DELIVERY" || nextType === "SPEND_X_GET_FREE" ? prev.driverPayoutAmount : "",
                                        }));
                                    }}
                                >
                                    <option value="FIXED_AMOUNT">Fixed amount off</option>
                                    <option value="PERCENTAGE">Percentage off</option>
                                    <option value="FREE_DELIVERY">Free delivery</option>
                                    <option value="SPEND_X_FIXED">Spend X, get fixed off</option>
                                    <option value="SPEND_X_PERCENT">Spend X, get percent off</option>
                                    <option value="SPEND_X_GET_FREE">Spend X, get free delivery</option>
                                </Select>
                            </div>

                            <Input
                                label="Description"
                                value={quickCodePromoForm.description}
                                onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Private promo code for friends"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {quickCodeVis.discountValue && (
                                    <Input
                                        label={isPercentType(quickCodePromoForm.type) ? "Discount % *" : "Discount € *"}
                                        type="number"
                                        step="0.01"
                                        value={quickCodePromoForm.discountValue}
                                        onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                                        placeholder={isPercentType(quickCodePromoForm.type) ? "15" : "5.00"}
                                    />
                                )}
                                {quickCodeVis.maxDiscountCap && (
                                    <Input
                                        label="Max cap (€)"
                                        type="number"
                                        step="0.01"
                                        value={quickCodePromoForm.maxDiscountCap}
                                        onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, maxDiscountCap: e.target.value }))}
                                        placeholder="30.00"
                                    />
                                )}
                                {quickCodeVis.spendThreshold && (
                                    <Input
                                        label="Spend threshold (€) *"
                                        type="number"
                                        step="0.01"
                                        value={quickCodePromoForm.spendThreshold}
                                        onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, spendThreshold: e.target.value }))}
                                        placeholder="20.00"
                                    />
                                )}
                                <Input
                                    label="Min order (€)"
                                    type="number"
                                    step="0.01"
                                    value={quickCodePromoForm.minOrderAmount}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                                    placeholder="Optional"
                                />
                                {(quickCodePromoForm.type === "FREE_DELIVERY" || quickCodePromoForm.type === "SPEND_X_GET_FREE") && (
                                    <Input
                                        label="Driver payout (€) *"
                                        type="number"
                                        step="0.01"
                                        value={quickCodePromoForm.driverPayoutAmount}
                                        onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, driverPayoutAmount: e.target.value }))}
                                        placeholder="2.50"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input
                                    label="Max uses per user"
                                    type="number"
                                    value={quickCodePromoForm.maxUsagePerUser}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, maxUsagePerUser: e.target.value }))}
                                    placeholder="1"
                                />
                                <Input
                                    label="Max uses total"
                                    type="number"
                                    value={quickCodePromoForm.maxGlobalUsage}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, maxGlobalUsage: e.target.value }))}
                                    placeholder="Unlimited"
                                />
                                <Input
                                    label="Priority"
                                    type="number"
                                    value={quickCodePromoForm.priority}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, priority: e.target.value }))}
                                    placeholder="50"
                                />
                                <Select
                                    label="Stackable"
                                    value={quickCodePromoForm.isStackable}
                                    onChange={(e) => setQuickCodePromoForm((prev) => ({ ...prev, isStackable: e.target.value }))}
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Promo Code *"
                                value={selectedCodePromotionId}
                                onChange={(e) => setSelectedCodePromotionId(e.target.value)}
                            >
                                <option value="">Select a code-based promotion...</option>
                                {codePromotions.map((promotion) => (
                                    <option key={promotion.id} value={promotion.id}>
                                        {promotion.code} - {promotion.name}
                                    </option>
                                ))}
                            </Select>
                            <Input
                                label="Group Label"
                                value={promoGroupName}
                                onChange={(e) => setPromoGroupName(e.target.value)}
                                placeholder="Friends"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400">Select users for this group</label>
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                <input
                                    type="text"
                                    value={promoUserSearch}
                                    onChange={(e) => setPromoUserSearch(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600"
                                />
                            </div>

                            {promoFilteredUsers.length > 0 && (
                                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                                    {promoFilteredUsers.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                setPromoUsers((prev) => [...prev, user]);
                                                setPromoUserSearch("");
                                            }}
                                            className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-900 last:border-0"
                                        >
                                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 flex-shrink-0 font-medium">
                                                {user.firstName[0]}{user.lastName[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{user.firstName} {user.lastName}</p>
                                                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {promoUsers.length > 0 && (
                                <div>
                                    <p className="text-xs text-zinc-500 mb-2">{promoUsers.length} user{promoUsers.length !== 1 ? "s" : ""} selected</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {promoUsers.map((user) => (
                                            <span
                                                key={user.id}
                                                className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full pl-2.5 pr-1.5 py-1 text-xs text-zinc-300"
                                            >
                                                {user.firstName} {user.lastName}
                                                <button
                                                    onClick={() => setPromoUsers((prev) => prev.filter((item) => item.id !== user.id))}
                                                    className="p-0.5 rounded-full hover:bg-zinc-700 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleAssignPromoCodeToGroup}
                                    disabled={assigningPromo || !selectedCodePromotionId || promoUsers.length === 0}
                                >
                                    {assigningPromo ? "Assigning..." : "Assign Existing Code"}
                                </Button>
                                <Button
                                    onClick={handleCreateAndAssignPromoCode}
                                    disabled={creating || assigningPromo || !quickCodePromoForm.name.trim() || !quickCodePromoForm.code.trim() || promoUsers.length === 0}
                                >
                                    {creating || assigningPromo ? "Working..." : "Create & Assign New Code"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )} {/* end promo codes tab */}

            {/* ── Compensations Tab ── */}
            {activeTab === "compensations" && (
                <div className="space-y-4">
                    <div className="bg-violet-950/30 border border-violet-800/40 rounded-lg p-4 text-sm text-violet-200 flex gap-3">
                        <HeartHandshake size={16} className="mt-0.5 shrink-0 text-violet-400" />
                        <div>
                            <div className="font-medium mb-1">How compensation promotions work</div>
                            <div className="text-violet-300/80">
                                When you issue a compensation from the Cancelled Orders page, a one-time hidden promotion is created
                                for that specific user. It has <code className="text-violet-300 bg-violet-900/40 px-1 rounded">target: SPECIFIC_USERS</code> and{" "}
                                <code className="text-violet-300 bg-violet-900/40 px-1 rounded">maxUsagePerUser: 1</code>, so it can
                                only be used once. It <strong>auto-applies at checkout</strong> — the customer never needs to enter a code.
                                Recovery promotions are excluded from the regular Promotions list.
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        {recoveryLoading ? (
                            <div className="p-6 text-zinc-500">Loading compensations...</div>
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Reason</Th>
                                        <Th>Value</Th>
                                        <Th>Assigned To</Th>
                                        <Th>Status</Th>
                                        <Th>Usage</Th>
                                        <Th>Expires</Th>
                                        <Th></Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recoveryPromotions.length === 0 ? (
                                        <tr>
                                            <Td colSpan={6}>
                                                <div className="text-center py-10 text-zinc-500">
                                                    No compensation promotions issued yet.
                                                </div>
                                            </Td>
                                        </tr>
                                    ) : (
                                        recoveryPromotions.map((promo: GetRecoveryPromotionsQuery["getRecoveryPromotions"][number]) => {
                                            const assignments = promo.assignedUsers ?? [];
                                            const usedCount = assignments.filter((a) => a.usageCount > 0).length;
                                            return (
                                                <tr key={promo.id}>
                                                    <Td>
                                                        <div className="text-white font-semibold text-sm">{promo.name}</div>
                                                        {promo.description && (
                                                            <div className="text-xs text-zinc-400 mt-0.5 max-w-[220px]">{promo.description}</div>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        <div className="text-sm text-white">{formatCompensationValue(promo)}</div>
                                                    </Td>
                                                    <Td>
                                                        {assignments.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {assignments.map((a) => (
                                                                    <div key={a.userId} className="text-sm">
                                                                        {a.user ? (
                                                                            <>
                                                                                <div className="text-white font-medium">{a.user.firstName} {a.user.lastName}</div>
                                                                                {a.user.phoneNumber && (
                                                                                    <div className="text-xs text-zinc-500">{a.user.phoneNumber}</div>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <div className="text-zinc-500 text-xs font-mono">{a.userId}</div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-zinc-600 text-sm">—</span>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${promo.isActive ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-neutral-500/10 text-zinc-500 border-neutral-500/30"}`}>
                                                            {promo.isActive ? <><CheckCircle2 size={10} /> Active</> : "Inactive"}
                                                        </span>
                                                    </Td>
                                                    <Td>
                                                        {assignments.length > 0 ? (
                                                            <div className="text-sm">
                                                                {usedCount > 0 ? (
                                                                    <span className="text-green-400">{usedCount} used</span>
                                                                ) : (
                                                                    <span className="text-zinc-500 flex items-center gap-1"><Clock size={11} /> Pending</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-zinc-600 text-sm">—</span>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        {assignments[0]?.expiresAt ? (
                                                            <span className="text-xs text-zinc-400">{formatDate(assignments[0].expiresAt)}</span>
                                                        ) : (
                                                            <span className="text-zinc-600 text-sm">No expiry</span>
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteRequest(promo)}
                                                            className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                                            title="Delete compensation"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </Td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </div>
                </div>
            )} {/* end compensations tab */}

            {/* Create/Edit Modal - Wizard */}
            <Modal isOpen={showModal} onClose={handleCloseModal} title={editingPromotion ? "Edit Promotion" : "Create Promotion"}>
                <div className="space-y-6">
                    {!editingPromotion && (
                        <>
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
                        </>
                    )}

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
                                    Customer-facing description shown in the app and promo details modal
                                </div>

                                <Input
                                    label="Promo Code (Optional)"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="SUMMER20"
                                />
                                <div className="text-xs text-zinc-600 -mt-2">
                                    Leave empty for auto-applied promotions. Enter a code when the customer must type it in checkout.
                                </div>
                                <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-xs text-zinc-300">
                                    <strong>Application mode:</strong>{" "}
                                    {formData.code.trim()
                                        ? "Manual code entry (only users who enter this code can activate it)."
                                        : "Automatic eligibility (promotion is considered automatically when checkout rules match)."}
                                </div>

                                {!editingPromotion && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <div>
                                                <Select
                                                    label="Promotion Type *"
                                                    value={formData.type}
                                                    onChange={(e) => {
                                                        const newType = e.target.value as PromotionType;
                                                        const updates: Partial<PromotionFormState> = { type: newType };
                                                        const vis = typeFieldVisibility[newType];
                                                        const isDeliveryFeePromotion = newType === "FREE_DELIVERY" || newType === "SPEND_X_GET_FREE";
                                                        if (!vis.discountValue) { updates.discountValue = ""; }
                                                        if (!vis.maxDiscountCap) { updates.maxDiscountCap = ""; }
                                                        if (!vis.spendThreshold) { updates.spendThreshold = ""; updates.thresholdRewardValue = ""; }
                                                        if (newType === "SPEND_X_GET_FREE") { updates.thresholdRewardType = "FREE_DELIVERY"; updates.thresholdRewardValue = ""; }
                                                        if (!isDeliveryFeePromotion) { updates.driverPayoutAmount = ""; }
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

                                        {/* Creator Type */}
                                        <div className="space-y-2 pt-2">
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, creatorType: "PLATFORM", creatorId: "" })}
                                                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.creatorType === "PLATFORM" ? "bg-violet-600 border-violet-500 text-white" : "bg-gray-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                                                >
                                                    Platform Promotion
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, creatorType: "BUSINESS" })}
                                                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.creatorType === "BUSINESS" ? "bg-orange-600 border-orange-500 text-white" : "bg-gray-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                                                >
                                                    Business Promotion
                                                </button>
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {formData.creatorType === "PLATFORM"
                                                    ? "Promotion is funded by the platform. Settlement rules will be created automatically."
                                                    : "Promotion is funded by a business. For item discounts, no settlement rules are created — the business price is adjusted instead."}
                                            </div>
                                            {formData.creatorType === "BUSINESS" && (
                                                <div className="pt-1">
                                                    <Select
                                                        label="Business *"
                                                        value={formData.creatorId}
                                                        onChange={(e) => setFormData({ ...formData, creatorId: e.target.value })}
                                                    >
                                                        <option value="">Select a business...</option>
                                                        {businesses.map((b: any) => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </Select>
                                                    <div className="text-xs text-zinc-600 mt-1">
                                                        The business that is sponsoring this promotion
                                                    </div>
                                                </div>
                                            )}
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
                                    </>
                                )}
                            </div>
                        )}

                        {/* STEP 2: Configure the Deal */}
                        {wizardStep === 2 && !editingPromotion && (
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

                                {(formData.type === "FREE_DELIVERY" || formData.type === "SPEND_X_GET_FREE") && (
                                    <div className="space-y-2">
                                        <Input
                                            label="Driver payout per order (\u20ac) *"
                                            type="number"
                                            step="0.01"
                                            value={formData.driverPayoutAmount}
                                            onChange={(e) => setFormData({ ...formData, driverPayoutAmount: e.target.value })}
                                            placeholder="2.50"
                                        />
                                        <div className="text-xs text-zinc-600">
                                            Fixed euro amount that the driver should receive for orders using this promotion. Settlement rules are created automatically.
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {formData.creatorType === "BUSINESS"
                                                ? "Business-created delivery promotion: business owes platform this amount; platform owes driver the same amount."
                                                : "Platform-created delivery promotion: platform owes driver this amount."}
                                        </div>
                                    </div>
                                )}

                                {/* --- Min Order Amount (simple types only — SPEND_X uses threshold instead) --- */}
                                {!isSpendType(formData.type) && formData.type !== "FREE_DELIVERY" && (
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
                                {formData.creatorType === "BUSINESS" ? (
                                    <div className="space-y-2">
                                        <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                            Business
                                        </h3>
                                        <div className="rounded-lg border border-orange-700/40 bg-orange-900/10 p-3 text-sm text-orange-200">
                                            This promotion is restricted to: <strong>{businesses.find((b: any) => b.id === formData.creatorId)?.name ?? formData.creatorId}</strong>.
                                            To change the business, go back to Step 1.
                                        </div>
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        )}

                        {/* STEP 3: Limits, Schedule & Review */}
                        {wizardStep === 3 && !editingPromotion && (
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
                                
                                {/* Settlement Rules (automatic) */}
                                {formData.creatorType === "BUSINESS" && formData.type !== "FREE_DELIVERY" && formData.type !== "SPEND_X_GET_FREE" ? (
                                    <div className="bg-orange-900/10 border border-orange-700/30 rounded-lg p-4 text-sm text-orange-200">
                                        <strong>Business-funded item discount</strong> — no settlement rules will be created.
                                    </div>
                                ) : (
                                    <div className="bg-zinc-800/20 border border-zinc-700/30 rounded-lg p-4 text-sm text-zinc-200">
                                        <strong>Settlement rules:</strong> created automatically based on creator type and promotion type.
                                        {(formData.type === "FREE_DELIVERY" || formData.type === "SPEND_X_GET_FREE") && (
                                            <div className="text-xs text-zinc-400 mt-2">
                                                Driver payout: &euro;{formData.driverPayoutAmount || "?"} (fixed)
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Priority & Stacking */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
                                        Priority &amp; Stacking
                                    </h3>
                                    <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-lg p-4 space-y-3">
                                        <div className="text-sm text-zinc-200 font-medium">Compatibility guidance</div>
                                        <div className="text-xs text-zinc-400">
                                            Use this preview to understand what this promotion can combine with once created.
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                            <div className="rounded-md border border-emerald-700/30 bg-emerald-900/10 p-3">
                                                <div className="text-emerald-300 font-medium mb-1">Can stack with</div>
                                                {stackingGuidance.canStackWith.length === 0 ? (
                                                    <div className="text-zinc-500">No combinations</div>
                                                ) : (
                                                    <div className="space-y-1 text-zinc-300">
                                                        {stackingGuidance.canStackWith.map((item) => (
                                                            <div key={item}>• {item}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="rounded-md border border-rose-700/30 bg-rose-900/10 p-3">
                                                <div className="text-rose-300 font-medium mb-1">Cannot stack with</div>
                                                {stackingGuidance.cannotStackWith.length === 0 ? (
                                                    <div className="text-zinc-500">No explicit restrictions from this setup</div>
                                                ) : (
                                                    <div className="space-y-1 text-zinc-300">
                                                        {stackingGuidance.cannotStackWith.map((item) => (
                                                            <div key={item}>• {item}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {stackingGuidance.notes.length > 0 && (
                                            <div className="text-xs text-zinc-400 space-y-1">
                                                {stackingGuidance.notes.map((note) => (
                                                    <div key={note}>• {note}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                                            {formData.creatorType === "BUSINESS"
                                                ? businesses.find((b: any) => b.id === formData.creatorId)?.name ?? "1 selected"
                                                : (formData.eligibleBusinessIds || []).length > 0
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
                    {editingPromotion ? (
                        <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                            <Button variant="outline" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={updating || !formData.name.trim()}>
                                {updating ? "Saving..." : "Update Promotion"}
                            </Button>
                        </div>
                    ) : (
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
                                        (wizardStep === 1 && formData.creatorType === "BUSINESS" && !formData.creatorId) ||
                                        (wizardStep === 2 && typeFieldVisibility[formData.type].discountValue && !formData.discountValue.trim()) ||
                                        (wizardStep === 2 && typeFieldVisibility[formData.type].spendThreshold && !formData.spendThreshold.trim()) ||
                                        (wizardStep === 2 && (formData.type === "FREE_DELIVERY" || formData.type === "SPEND_X_GET_FREE") && !toOptionalNumber(formData.driverPayoutAmount))
                                    }
                                >
                                    Next &rarr;
                                </Button>
                            ) : (
                                <Button onClick={handleSave} disabled={creating || !formData.name.trim()}>
                                    {creating ? "Saving..." : "Create Promotion"}
                                </Button>
                            )}
                        </div>
                    )}
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
