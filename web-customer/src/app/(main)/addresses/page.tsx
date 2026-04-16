"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import {
    MapPin,
    Plus,
    Trash2,
    Edit2,
    Star,
    Loader2,
    ArrowLeft,
    X,
} from "lucide-react";
import {
    GET_MY_ADDRESSES,
    ADD_USER_ADDRESS,
    UPDATE_USER_ADDRESS,
    DELETE_USER_ADDRESS,
    SET_DEFAULT_ADDRESS,
} from "@/graphql/operations/addresses";
import dynamic from "next/dynamic";
const AddressPickerMap = dynamic(() => import("@/components/checkout/AddressPickerMap"), { ssr: false });
import type { GqlAddress } from "@/types/graphql";

export default function AddressesPage() {
    const { user } = useAuth();
    const { t } = useTranslations();

    const { data, loading, refetch } = useQuery(GET_MY_ADDRESSES, {
        skip: !user,
        fetchPolicy: "cache-and-network",
    });

    const [addAddress, { loading: adding }] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });
    const [updateAddress, { loading: updating }] = useMutation(UPDATE_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });
    const [deleteAddress, { loading: deleting }] = useMutation(DELETE_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });
    const [setDefault] = useMutation(SET_DEFAULT_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [addressName, setAddressName] = useState("");
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
        address: string;
    } | null>(null);

    const addresses = ((data as { myAddresses?: GqlAddress[] } | undefined)?.myAddresses ?? []);

    if (!user) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <p className="text-[var(--foreground-secondary)]">{t("auth.login_required")}</p>
                <Link href="/login">
                    <Button>{t("auth.login")}</Button>
                </Link>
            </div>
        );
    }

    const handleSave = async () => {
        if (!selectedLocation || !addressName.trim()) return;

        const input = {
            addressName: addressName.trim(),
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            displayName: selectedLocation.address,
        };

        if (editingId) {
            await updateAddress({ variables: { id: editingId, input } });
        } else {
            await addAddress({ variables: { input } });
        }

        resetForm();
    };

    const handleEdit = (addr: GqlAddress) => {
        setEditingId(addr.id);
        setAddressName(addr.addressName ?? "");
        setSelectedLocation({
            latitude: addr.latitude,
            longitude: addr.longitude,
            address: addr.displayName ?? "",
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("address.delete_confirm"))) return;
        await deleteAddress({ variables: { id } });
    };

    const handleSetDefault = async (id: string) => {
        await setDefault({ variables: { id } });
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setAddressName("");
        setSelectedLocation(null);
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("address.title")}</h1>
                {!showForm && (
                    <Button size="sm" onClick={() => setShowForm(true)}>
                        <Plus size={14} className="mr-1.5" />
                        {t("address.add_new")}
                    </Button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                            {editingId ? t("address.edit_address") : t("address.add_new")}
                        </h3>
                        <button onClick={resetForm} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                            <X size={16} />
                        </button>
                    </div>
                    <Input
                        placeholder={t("address.name_placeholder")}
                        value={addressName}
                        onChange={(e) => setAddressName(e.target.value)}
                    />
                    <AddressPickerMap
                        onSelect={(loc) => setSelectedLocation(loc)}
                        initialLocation={selectedLocation}
                    />
                    <Button
                        className="w-full"
                        onClick={handleSave}
                        disabled={adding || updating || !selectedLocation || !addressName.trim()}
                    >
                        {adding || updating ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : editingId ? (
                            t("address.save_changes")
                        ) : (
                            t("address.save_address")
                        )}
                    </Button>
                </div>
            )}

            {/* Address List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-20 rounded-[var(--radius)] bg-[var(--background-secondary)] animate-pulse" />
                    ))}
                </div>
            ) : addresses.length === 0 && !showForm ? (
                <div className="py-16 text-center space-y-3">
                    <MapPin size={40} className="mx-auto text-[var(--muted)]" />
                    <p className="text-sm text-[var(--foreground-secondary)]">{t("address.no_addresses")}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {addresses.map((addr: GqlAddress) => (
                        <div
                            key={addr.id}
                            className={cn(
                                "flex items-center gap-3 rounded-[var(--radius)] border bg-[var(--card)] p-4",
                                addr.priority === 1 ? "border-[var(--primary)]/50" : "border-[var(--border)]"
                            )}
                        >
                            <MapPin size={16} className="shrink-0 text-[var(--primary)]" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{addr.addressName ?? t("address.unnamed")}</p>
                                    {addr.priority === 1 && (
                                        <Star size={12} className="fill-yellow-400 text-yellow-400 shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-[var(--muted)] truncate">{addr.displayName}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {addr.priority !== 1 && (
                                    <button
                                        onClick={() => handleSetDefault(addr.id)}
                                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--background-secondary)] text-[var(--muted)]"
                                        title={t("address.set_default")}
                                    >
                                        <Star size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEdit(addr)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--background-secondary)] text-[var(--muted)]"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(addr.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--danger)]/10 text-[var(--danger)]"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
