"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { ChefHat } from "lucide-react";
import type { Order } from "./types";

interface PrepTimeModalProps {
    order: Order | null;
    minutes: string;
    loading: boolean;
    onMinutesChange: (v: string) => void;
    onConfirm: () => void;
    onClose: () => void;
}

const PRESETS = [10, 15, 20, 30, 45, 60];

export default function PrepTimeModal({ order, minutes, loading, onMinutesChange, onConfirm, onClose }: PrepTimeModalProps) {
    return (
        <Modal isOpen={!!order} onClose={onClose} title="Start Preparing">
            {order && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                        <ChefHat size={24} />
                        <div>
                            <div className="font-medium">Order {order.displayId}</div>
                            <div className="text-sm text-zinc-500 mt-1">How long will it take to prepare?</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-zinc-500 mb-2">Preparation Time (minutes)</label>
                        <Input
                            type="number"
                            min="1"
                            max="180"
                            value={minutes}
                            onChange={(e) => onMinutesChange(e.target.value)}
                            className="text-center text-lg"
                            placeholder="20"
                        />
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {PRESETS.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => onMinutesChange(String(m))}
                                    className={`px-3 py-1 rounded text-xs border transition-colors ${
                                        minutes === String(m)
                                            ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                    }`}
                                >
                                    {m} min
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button className="flex-1" onClick={onConfirm} disabled={loading}>
                            {loading ? "Starting..." : "Start Preparing"}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
