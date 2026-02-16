"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Tag, Plus, Edit, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_PROMOTIONS } from "@/graphql/operations/promotions/queries";
import { CREATE_PROMOTION, UPDATE_PROMOTION, DELETE_PROMOTION } from "@/graphql/operations/promotions/mutations";
import type { PromotionType, PromotionsQuery } from "@/gql/graphql";

const promotionTypeLabels: Record<PromotionType, string> = {
    FIXED_DISCOUNT: "Fixed discount",
    PERCENT_DISCOUNT: "Percent discount",
    FREE_DELIVERY: "Free delivery",
    REFERRAL: "Referral",
};

type PromotionFormState = {
    code: string;
    name: string;
    description: string;
    type: PromotionType;
    value: string;
    maxRedemptions: string;
    maxRedemptionsPerUser: string;
    freeDeliveryCount: string;
    firstOrderOnly: string;
    isActive: string;
    autoApply: string;
    startsAt: string;
    endsAt: string;
    referrerUserId: string;
    targetUserEmails: string;
};

const emptyForm: PromotionFormState = {
    code: "",
    name: "",
    description: "",
    type: "FIXED_DISCOUNT",
    value: "",
    maxRedemptions: "",
    maxRedemptionsPerUser: "",
    freeDeliveryCount: "",
    firstOrderOnly: "false",
    isActive: "true",
    autoApply: "false",
    startsAt: "",
    endsAt: "",
    referrerUserId: "",
    targetUserEmails: "",
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
    const { data, loading, error, refetch } = useQuery<PromotionsQuery>(GET_PROMOTIONS);
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
    const [editingPromotion, setEditingPromotion] = useState<PromotionsQuery["promotions"][number] | null>(null);
    const [promotionToDelete, setPromotionToDelete] = useState<PromotionsQuery["promotions"][number] | null>(null);
    const [formData, setFormData] = useState<PromotionFormState>(emptyForm);

    const promotions = useMemo(() => data?.promotions ?? [], [data?.promotions]);

    const handleOpenCreate = () => {
        setEditingPromotion(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const handleOpenEdit = (promotion: PromotionsQuery["promotions"][number]) => {
        setEditingPromotion(promotion);
        setFormData({
            code: promotion.code,
            name: promotion.name,
            description: promotion.description ?? "",
            type: promotion.type,
            value: promotion.value ? String(promotion.value) : "",
            maxRedemptions: promotion.maxRedemptions ? String(promotion.maxRedemptions) : "",
            maxRedemptionsPerUser: promotion.maxRedemptionsPerUser ? String(promotion.maxRedemptionsPerUser) : "",
            freeDeliveryCount: promotion.freeDeliveryCount ? String(promotion.freeDeliveryCount) : "",
            firstOrderOnly: promotion.firstOrderOnly ? "true" : "false",
            isActive: promotion.isActive ? "true" : "false",
            autoApply: promotion.autoApply ? "true" : "false",
            startsAt: toDateTimeLocal(promotion.startsAt),
            endsAt: toDateTimeLocal(promotion.endsAt),
            referrerUserId: promotion.referrerUserId ?? "",
            targetUserEmails: (promotion.targetUserIds ?? []).join(", "),
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPromotion(null);
        setFormData(emptyForm);
    };

    const handleDeleteRequest = (promotion: PromotionsQuery["promotions"][number]) => {
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
        const targetUserIds = formData.targetUserEmails
            .split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0);

        const payload = {
            code: formData.code.trim().toUpperCase(),
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            type: formData.type,
            value: toOptionalNumber(formData.value),
            maxRedemptions: toOptionalNumber(formData.maxRedemptions),
            maxRedemptionsPerUser: toOptionalNumber(formData.maxRedemptionsPerUser),
            freeDeliveryCount: toOptionalNumber(formData.freeDeliveryCount),
            firstOrderOnly: formData.firstOrderOnly === "true",
            isActive: formData.isActive === "true",
            autoApply: formData.autoApply === "true",
            startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
            endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : null,
            referrerUserId: formData.referrerUserId.trim() || null,
            targetUserIds: targetUserIds.length > 0 ? targetUserIds : null,
        };

        if (editingPromotion) {
            await updatePromotion({ variables: { id: editingPromotion.id, input: payload } });
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
                        Create promo codes, free delivery offers, and referral campaigns.
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
                                <Th>Code</Th>
                                <Th>Type</Th>
                                <Th>Value</Th>
                                <Th>Rules</Th>
                                <Th>Status</Th>
                                <Th>Dates</Th>
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
                                            <div className="text-white font-semibold">{promotion.code}</div>
                                            <div className="text-xs text-neutral-400">{promotion.name}</div>
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-neutral-300">
                                                {promotionTypeLabels[promotion.type]}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-sm text-white">
                                                {promotion.type === "PERCENT_DISCOUNT"
                                                    ? `${promotion.value}%`
                                                    : promotion.type === "FREE_DELIVERY"
                                                        ? "Free delivery"
                                                        : `€${promotion.value.toFixed(2)}`}
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="text-xs text-neutral-400 space-y-1">
                                                {promotion.autoApply && (
                                                    <div className="text-purple-400 font-semibold">✨ Auto-apply</div>
                                                )}
                                                {promotion.targetUserIds && promotion.targetUserIds.length > 0 && (
                                                    <div className="text-cyan-400">👥 {promotion.targetUserIds.length} targeted users</div>
                                                )}
                                                {promotion.firstOrderOnly && <div>First order only</div>}
                                                {promotion.freeDeliveryCount && (
                                                    <div>{promotion.freeDeliveryCount} free deliveries</div>
                                                )}
                                                {promotion.maxRedemptions && <div>Max {promotion.maxRedemptions} uses</div>}
                                                {promotion.maxRedemptionsPerUser && (
                                                    <div>{promotion.maxRedemptionsPerUser} per user</div>
                                                )}
                                            </div>
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
                                            <div className="text-xs text-neutral-400">
                                                <div>Start: {formatDate(promotion.startsAt)}</div>
                                                <div>End: {formatDate(promotion.endsAt)}</div>
                                            </div>
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

            {showModal && (
                <Modal
                    open={showModal}
                    onClose={handleCloseModal}
                    title={editingPromotion ? "Edit Promotion" : "Create Promotion"}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Code</label>
                                <Input
                                    value={formData.code}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                                    placeholder="WELCOME2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="Welcome bonus"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-neutral-300 mb-2">Description</label>
                            <Input
                                value={formData.description}
                                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                placeholder="2 EUR off first order"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Type</label>
                                <Select
                                    value={formData.type}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value as PromotionType }))}
                                >
                                    {Object.entries(promotionTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Value</label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, value: event.target.value }))}
                                    placeholder={formData.type === "PERCENT_DISCOUNT" ? "10" : "2.00"}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    {formData.type === "PERCENT_DISCOUNT"
                                        ? "Percent discount off items"
                                        : formData.type === "FREE_DELIVERY"
                                            ? "No value needed for free delivery"
                                            : "Fixed discount in EUR"}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Max redemptions</label>
                                <Input
                                    type="number"
                                    value={formData.maxRedemptions}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, maxRedemptions: event.target.value }))}
                                    placeholder="Leave empty"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Per user limit</label>
                                <Input
                                    type="number"
                                    value={formData.maxRedemptionsPerUser}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, maxRedemptionsPerUser: event.target.value }))}
                                    placeholder="Leave empty"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Free deliveries</label>
                                <Input
                                    type="number"
                                    value={formData.freeDeliveryCount}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, freeDeliveryCount: event.target.value }))}
                                    placeholder="e.g. 2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">First order only</label>
                                <Select
                                    value={formData.firstOrderOnly}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, firstOrderOnly: event.target.value }))}
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Active</label>
                                <Select
                                    value={formData.isActive}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.value }))}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Auto-apply</label>
                                <Select
                                    value={formData.autoApply}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, autoApply: event.target.value }))}
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes - Apply automatically</option>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">Auto-applied to cart without code</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-neutral-300 mb-2">Target specific users (optional)</label>
                            <Input
                                value={formData.targetUserEmails}
                                onChange={(event) => setFormData((prev) => ({ ...prev, targetUserEmails: event.target.value }))}
                                placeholder="Leave empty for all users, or paste user IDs separated by commas"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave blank to make this promo available to everyone. Add user IDs (comma-separated) to restrict to specific users only.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Referrer user ID</label>
                                <Input
                                    value={formData.referrerUserId}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, referrerUserId: event.target.value }))}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Starts at</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.startsAt}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, startsAt: event.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-300 mb-2">Ends at</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.endsAt}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, endsAt: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={creating || updating}>
                                {creating || updating ? "Saving..." : editingPromotion ? "Update Promotion" : "Create Promotion"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {showDeleteModal && promotionToDelete && (
                <Modal
                    open={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Promotion"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-neutral-300">
                            Are you sure you want to delete <strong>{promotionToDelete.code}</strong>? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
                                {deleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
