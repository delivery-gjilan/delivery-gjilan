"use client";

import { Settings as SettingsIcon, Save, Clock, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { useBusiness, useUpdateBusiness } from "@/lib/hooks/useBusinesses";

export default function SettingsPage() {
  const { admin } = useAuth();
  const businessId = admin?.businessId ?? "";
  const { business, loading } = useBusiness(businessId);
  const { update, loading: updateLoading } = useUpdateBusiness();

  const [avgPrepTime, setAvgPrepTime] = useState<string>("");
  const [overridePrepTime, setOverridePrepTime] = useState<string>("");

  useEffect(() => {
    if (business) {
      setAvgPrepTime(String(business.avgPrepTimeMinutes ?? 20));
      setOverridePrepTime(
        business.prepTimeOverrideMinutes !== null && business.prepTimeOverrideMinutes !== undefined
          ? String(business.prepTimeOverrideMinutes)
          : ""
      );
    }
  }, [business]);

  const effectivePrepTime = useMemo(() => {
    const override = parseInt(overridePrepTime, 10);
    if (!Number.isNaN(override) && override > 0) return override;
    const base = parseInt(avgPrepTime, 10);
    return Number.isNaN(base) ? 0 : base;
  }, [avgPrepTime, overridePrepTime]);

  const handleSave = async () => {
    if (!businessId) return;

    const avg = parseInt(avgPrepTime, 10);
    const override = parseInt(overridePrepTime, 10);

    if (Number.isNaN(avg) || avg <= 0) {
      alert("Please enter a valid average prep time.");
      return;
    }

    const input: Record<string, any> = {
      avgPrepTimeMinutes: avg,
    };

    if (overridePrepTime.trim().length === 0) {
      input.prepTimeOverrideMinutes = null;
    } else if (!Number.isNaN(override) && override > 0) {
      input.prepTimeOverrideMinutes = override;
    } else {
      alert("Please enter a valid override prep time or clear it.");
      return;
    }

    const result = await update(businessId, input);
    if (!result.success) {
      alert(result.error || "Failed to update preparation time.");
    }
  };

  const handleClearOverride = async () => {
    if (!businessId) return;
    setOverridePrepTime("");
    await update(businessId, { prepTimeOverrideMinutes: null });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          <SettingsIcon size={28} />
          Settings
        </h1>
        <p className="text-zinc-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Business Settings */}
      <div className="bg-[#111113] border border-zinc-800 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} /> Preparation Time
        </h3>

        {!businessId ? (
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <AlertCircle size={16} /> Business admin profile is missing a business ID.
          </div>
        ) : loading ? (
          <div className="text-zinc-500">Loading business settings...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Average Preparation Time (minutes)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={avgPrepTime}
                  onChange={(e) => setAvgPrepTime(e.target.value)}
                  placeholder="20"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Default prep time shown to customers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Busy Hours Override (minutes)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={overridePrepTime}
                  onChange={(e) => setOverridePrepTime(e.target.value)}
                  placeholder="Leave empty to disable"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-zinc-600">
                    Temporary override for peak hours
                  </p>
                  {overridePrepTime.trim().length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-amber-300 hover:text-amber-200"
                      onClick={handleClearOverride}
                    >
                      Clear override
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-lg p-4 text-sm">
              <div className="text-zinc-500">Effective prep time shown to customers</div>
              <div className="text-white text-lg font-semibold mt-1">{effectivePrepTime} min</div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={!businessId || updateLoading}>
        <Save size={18} className="mr-2" />
        {updateLoading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
