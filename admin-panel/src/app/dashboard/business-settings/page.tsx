"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { GET_BUSINESS } from "@/graphql/operations/businesses/queries";
import { UPDATE_BUSINESS, SET_BUSINESS_SCHEDULE } from "@/graphql/operations/businesses/mutations";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySchedule {
    enabled: boolean;
    opensAt: string;
    closesAt: string;
}

function timeInputProps(value: string, onChange: (v: string) => void) {
    return {
        type: "text" as const,
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        placeholder: "HH:MM",
        pattern: "([0-1]?[0-9]|2[0-3]):[0-5][0-9]",
        className:
            "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm w-28 focus:outline-none focus:border-violet-500",
    };
}

export default function BusinessSettingsPage() {
    const { admin } = useAuth();
    const businessId = admin?.businessId;

    const { data, loading } = useQuery(GET_BUSINESS, {
        variables: { id: businessId! },
        skip: !businessId,
    });

    const [updateBusiness, { loading: savingHours }] = useMutation(UPDATE_BUSINESS);
    const [setSchedule, { loading: savingSchedule }] = useMutation(SET_BUSINESS_SCHEDULE);

    // General working hours
    const [opensAt, setOpensAt] = useState("");
    const [closesAt, setClosesAt] = useState("");

    // Per-day schedule
    const [schedule, setSchedule_] = useState<DaySchedule[]>(
        DAYS.map(() => ({ enabled: false, opensAt: "09:00", closesAt: "22:00" }))
    );

    useEffect(() => {
        const b = data?.business;
        if (!b) return;

        setOpensAt(b.workingHours?.opensAt ?? "");
        setClosesAt(b.workingHours?.closesAt ?? "");

        if (b.schedule && b.schedule.length > 0) {
            const next = DAYS.map((_, i) => {
                const existing = b.schedule!.find((s: { dayOfWeek: number; opensAt: string; closesAt: string }) => s.dayOfWeek === i);
                return existing
                    ? { enabled: true, opensAt: existing.opensAt, closesAt: existing.closesAt }
                    : { enabled: false, opensAt: "09:00", closesAt: "22:00" };
            });
            setSchedule_(next);
        }
    }, [data]);

    async function handleSaveWorkingHours() {
        if (!businessId) return;
        try {
            await updateBusiness({
                variables: {
                    id: businessId,
                    input: { workingHours: { opensAt, closesAt } },
                },
            });
            toast.success("Working hours saved");
        } catch {
            toast.error("Failed to save working hours");
        }
    }

    async function handleSaveSchedule() {
        if (!businessId) return;
        const entries = schedule
            .map((d, i) => ({ dayOfWeek: i, opensAt: d.opensAt, closesAt: d.closesAt, enabled: d.enabled }))
            .filter((d) => d.enabled);
        try {
            await setSchedule({
                variables: {
                    businessId,
                    schedule: entries.map(({ dayOfWeek, opensAt, closesAt }) => ({ dayOfWeek, opensAt, closesAt })),
                },
            });
            toast.success("Schedule saved");
        } catch {
            toast.error("Failed to save schedule");
        }
    }

    function updateDay(index: number, patch: Partial<DaySchedule>) {
        setSchedule_((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    }

    if (!businessId) {
        return <p className="text-zinc-400 p-6">No business linked to your account.</p>;
    }

    if (loading) {
        return <p className="text-zinc-400 p-6">Loading...</p>;
    }

    const b = data?.business;
    if (!b) {
        return <p className="text-red-400 p-6">Business not found.</p>;
    }

    return (
        <div className="text-white p-6 space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-semibold">Business Settings</h1>
                <p className="text-zinc-400 text-sm mt-1">{b.name}</p>
            </div>

            {/* General Working Hours */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-violet-400" />
                    <h2 className="text-lg font-semibold">General Working Hours</h2>
                </div>
                <p className="text-zinc-400 text-sm">Default open/close times shown to customers when no day-specific schedule is set.</p>

                <div className="flex flex-wrap gap-6 items-end">
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400 uppercase tracking-wide">Opens At</label>
                        <input {...timeInputProps(opensAt, setOpensAt)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400 uppercase tracking-wide">Closes At</label>
                        <input {...timeInputProps(closesAt, setClosesAt)} />
                    </div>
                    <button
                        onClick={handleSaveWorkingHours}
                        disabled={savingHours}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Save size={14} />
                        {savingHours ? "Saving…" : "Save"}
                    </button>
                </div>
            </section>

            {/* Per-Day Schedule */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-violet-400" />
                    <h2 className="text-lg font-semibold">Weekly Schedule</h2>
                </div>
                <p className="text-zinc-400 text-sm">
                    Toggle days you are open and set hours per day. Disabled days are treated as closed.
                </p>

                <div className="space-y-2">
                    {DAYS.map((day, i) => {
                        const d = schedule[i];
                        return (
                            <div
                                key={day}
                                className={`flex flex-wrap items-center gap-4 rounded-lg px-4 py-3 transition-colors ${
                                    d.enabled ? "bg-zinc-800" : "bg-zinc-800/40"
                                }`}
                            >
                                {/* Toggle */}
                                <button
                                    onClick={() => updateDay(i, { enabled: !d.enabled })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                        d.enabled ? "bg-violet-600" : "bg-zinc-600"
                                    }`}
                                    aria-label={`Toggle ${day}`}
                                >
                                    <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                            d.enabled ? "translate-x-5" : "translate-x-1"
                                        }`}
                                    />
                                </button>

                                {/* Day name */}
                                <span className={`w-24 text-sm font-medium ${d.enabled ? "text-white" : "text-zinc-500"}`}>
                                    {day}
                                </span>

                                {/* Time inputs */}
                                {d.enabled ? (
                                    <div className="flex items-center gap-3">
                                        <input {...timeInputProps(d.opensAt, (v) => updateDay(i, { opensAt: v }))} />
                                        <span className="text-zinc-400 text-sm">–</span>
                                        <input {...timeInputProps(d.closesAt, (v) => updateDay(i, { closesAt: v }))} />
                                    </div>
                                ) : (
                                    <span className="text-zinc-500 text-sm italic">Closed</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={handleSaveSchedule}
                    disabled={savingSchedule}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                    <Save size={14} />
                    {savingSchedule ? "Saving…" : "Save Schedule"}
                </button>
            </section>
        </div>
    );
}
