"use client";

import { useState, FormEvent } from "react";
import { useMutation } from "@apollo/client/react";
import { ADMIN_BULK_UPDATE_DRIVER_COMMISSIONS_MUTATION } from "@/graphql/operations/users/mutations";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Percent, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DriverItem {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    commissionPercentage?: number | null;
}

interface BulkCommissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    drivers: DriverItem[];
    onSuccess?: () => void;
}

export default function BulkCommissionModal({
    isOpen,
    onClose,
    drivers,
    onSuccess,
}: BulkCommissionModalProps) {
    const [commissionPercentage, setCommissionPercentage] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(
        new Set(drivers.map((d) => d.id))
    );

    const [bulkUpdateCommissions] = useMutation(
        ADMIN_BULK_UPDATE_DRIVER_COMMISSIONS_MUTATION,
        {
            onCompleted: () => {
                toast.success(
                    `Updated commission for ${selectedDriverIds.size} drivers`
                );
                setCommissionPercentage("");
                setError("");
                setSuccess("");
                setSelectedDriverIds(new Set(drivers.map((d) => d.id)));
                onSuccess?.();
                onClose();
            },
            onError: (err) => {
                setError(err.message);
            },
        }
    );

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (selectedDriverIds.size === 0) {
            setError("Select at least one driver");
            return;
        }

        const commission = parseFloat(commissionPercentage);
        if (isNaN(commission) || commission < 0 || commission > 100) {
            setError("Commission must be between 0 and 100");
            return;
        }

        try {
            await bulkUpdateCommissions({
                variables: {
                    driverIds: Array.from(selectedDriverIds),
                    commissionPercentage: commission,
                },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update");
        }
    };

    const toggleDriver = (driverId: string) => {
        const newSelected = new Set(selectedDriverIds);
        if (newSelected.has(driverId)) {
            newSelected.delete(driverId);
        } else {
            newSelected.add(driverId);
        }
        setSelectedDriverIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedDriverIds.size === drivers.length) {
            setSelectedDriverIds(new Set());
        } else {
            setSelectedDriverIds(new Set(drivers.map((d) => d.id)));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Set Commission for Multiple Drivers"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-1.5">
                        <Percent size={13} className="text-zinc-500" />
                        Commission Percentage
                    </label>
                    <p className="text-xs text-zinc-500 mb-2">
                        Apply this commission rate to all selected drivers
                    </p>
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={commissionPercentage}
                        onChange={(e) => setCommissionPercentage(e.target.value)}
                        placeholder="e.g. 25"
                        autoFocus
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-zinc-300">
                            Select Drivers ({selectedDriverIds.size}/{drivers.length})
                        </label>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="text-xs text-violet-400 hover:text-violet-300 underline"
                        >
                            {selectedDriverIds.size === drivers.length
                                ? "Deselect All"
                                : "Select All"}
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50">
                        {drivers.map((driver) => (
                            <button
                                key={driver.id}
                                type="button"
                                onClick={() => toggleDriver(driver.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/60 border-b border-zinc-800/50 last:border-b-0 transition-colors text-left"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedDriverIds.has(driver.id)}
                                    onChange={() => {}}
                                    className="h-4 w-4 accent-violet-500 rounded cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-zinc-100">
                                        {driver.firstName} {driver.lastName}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {driver.email}
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-400 flex-shrink-0">
                                    {driver.commissionPercentage ?? 0}%
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <Button type="submit" className="flex-1">
                        Update {selectedDriverIds.size} Driver
                        {selectedDriverIds.size !== 1 ? "s" : ""}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
