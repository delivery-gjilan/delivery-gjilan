"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SET_BUSINESS_SCHEDULE } from "@/graphql/operations/businesses/mutations";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySlot {
    enabled: boolean;
    opensAt: string;
    closesAt: string;
}

interface ScheduleEntry {
    id: string;
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
}

interface Props {
    businessId: string;
    schedule: ScheduleEntry[];
    /** Called after a successful save so the parent can refetch */
    onSaved?: () => void;
}

function buildInitialState(schedule: ScheduleEntry[]): DaySlot[] {
    const days: DaySlot[] = Array.from({ length: 7 }, () => ({
        enabled: false,
        opensAt: "08:00",
        closesAt: "23:00",
    }));

    for (const s of schedule) {
        if (s.dayOfWeek >= 0 && s.dayOfWeek <= 6) {
            days[s.dayOfWeek] = {
                enabled: true,
                opensAt: s.opensAt,
                closesAt: s.closesAt,
            };
        }
    }
    return days;
}

export default function ScheduleEditor({ businessId, schedule, onSaved }: Props) {
    const [days, setDays] = useState<DaySlot[]>(() => buildInitialState(schedule));
    const [saving, setSaving] = useState(false);

    const [setScheduleMutation] = useMutation(SET_BUSINESS_SCHEDULE);

    // Re-sync if the schedule prop changes (e.g. after refetch)
    useEffect(() => {
        setDays(buildInitialState(schedule));
    }, [schedule]);

    function updateDay(index: number, patch: Partial<DaySlot>) {
        setDays((prev) =>
            prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
        );
    }

    function applyToAll() {
        // Copy Monday's hours to all other enabled days
        const monday = days[1];
        if (!monday) return;
        setDays((prev) =>
            prev.map((d, i) =>
                i === 0
                    ? d
                    : { ...d, opensAt: monday.opensAt, closesAt: monday.closesAt, enabled: true },
            ),
        );
    }

    async function handleSave() {
        setSaving(true);
        try {
            const slots = days
                .map((d, i) =>
                    d.enabled
                        ? { dayOfWeek: i, opensAt: d.opensAt, closesAt: d.closesAt }
                        : null,
                )
                .filter((slot): slot is { dayOfWeek: number; opensAt: string; closesAt: string } => slot !== null);

            await setScheduleMutation({
                variables: { businessId, schedule: slots },
            });

            onSaved?.();
        } catch (err) {
            console.error("Failed to save schedule", err);
            alert("Failed to save schedule");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <label className="block text-base font-semibold text-gray-200">
                        Weekly Schedule
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Set business hours for each day of the week</p>
                </div>
                <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-md bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors border border-purple-600/30"
                    onClick={applyToAll}
                >
                    Copy Mon → All
                </button>
            </div>

            <div className="space-y-2">
                {days.map((day, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                            day.enabled
                                ? "border-gray-600 bg-gray-800/80"
                                : "border-gray-800 bg-gray-900/40 opacity-60"
                        }`}
                    >
                        {/* Toggle */}
                        <label className="flex items-center gap-3 min-w-[110px] cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={day.enabled}
                                onChange={(e) => updateDay(idx, { enabled: e.target.checked })}
                                className="accent-purple-500 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-200">{DAY_LABELS[idx]}</span>
                        </label>

                        {/* Time pickers */}
                        {day.enabled ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input
                                    type="time"
                                    value={day.opensAt}
                                    onChange={(e) => updateDay(idx, { opensAt: e.target.value })}
                                    className="!py-2 text-sm"
                                />
                                <span className="text-gray-500 text-sm font-medium">to</span>
                                <Input
                                    type="time"
                                    value={day.closesAt}
                                    onChange={(e) => updateDay(idx, { closesAt: e.target.value })}
                                    className="!py-2 text-sm"
                                />
                            </div>
                        ) : (
                            <span className="text-sm text-gray-500 italic ml-auto">Closed</span>
                        )}
                    </div>
                ))}
            </div>

            <Button
                variant="primary"
                className="w-full mt-4"
                onClick={handleSave}
                disabled={saving}
            >
                {saving ? "Saving Schedule..." : "Save Schedule"}
            </Button>
        </div>
    );
}
