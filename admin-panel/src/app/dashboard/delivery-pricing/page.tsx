"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Truck,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  Info,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  GET_DELIVERY_PRICING_TIERS,
  SET_DELIVERY_PRICING_TIERS,
} from "@/graphql/operations/deliveryPricing";

interface TierRow {
  key: string; // local key for React
  minDistanceKm: string;
  maxDistanceKm: string; // "" means unlimited
  price: string;
}

let nextKey = 0;
function newKey() {
  return `tier-${++nextKey}`;
}

function defaultTiers(): TierRow[] {
  return [
    { key: newKey(), minDistanceKm: "0", maxDistanceKm: "3", price: "1.00" },
    { key: newKey(), minDistanceKm: "3", maxDistanceKm: "6", price: "1.50" },
    { key: newKey(), minDistanceKm: "6", maxDistanceKm: "10", price: "2.00" },
    { key: newKey(), minDistanceKm: "10", maxDistanceKm: "", price: "3.00" },
  ];
}

export default function DeliveryPricingPage() {
  const { data, loading, refetch } = useQuery(GET_DELIVERY_PRICING_TIERS);
  const [setTiers, { loading: saving }] = useMutation(
    SET_DELIVERY_PRICING_TIERS,
    { refetchQueries: [{ query: GET_DELIVERY_PRICING_TIERS }] }
  );

  const [rows, setRows] = useState<TierRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Populate from server
  useEffect(() => {
    if (data?.deliveryPricingTiers) {
      if (data.deliveryPricingTiers.length === 0) {
        setRows(defaultTiers());
        setDirty(true);
      } else {
        setRows(
          data.deliveryPricingTiers.map((t) => ({
            key: newKey(),
            minDistanceKm: String(t.minDistanceKm),
            maxDistanceKm: t.maxDistanceKm != null ? String(t.maxDistanceKm) : "",
            price: String(t.price),
          }))
        );
        setDirty(false);
      }
    }
  }, [data]);

  // ─── helpers ───

  const updateRow = (index: number, field: keyof Omit<TierRow, "key">, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // auto-chain: when maxDistanceKm changes, update next row's minDistanceKm
      if (field === "maxDistanceKm" && value !== "" && index < next.length - 1) {
        next[index + 1] = { ...next[index + 1], minDistanceKm: value };
      }
      return next;
    });
    setDirty(true);
    setSuccess(false);
  };

  const addRow = () => {
    setRows((prev) => {
      const lastMax = prev.length > 0 ? prev[prev.length - 1].maxDistanceKm : "0";
      const newMin = lastMax || String(Number(prev[prev.length - 1]?.minDistanceKm || 0) + 5);

      // If the last row was open-ended, give it a max first
      if (prev.length > 0 && prev[prev.length - 1].maxDistanceKm === "") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          maxDistanceKm: newMin,
        };
        return [
          ...updated,
          { key: newKey(), minDistanceKm: newMin, maxDistanceKm: "", price: "2.00" },
        ];
      }

      return [
        ...prev,
        { key: newKey(), minDistanceKm: newMin, maxDistanceKm: "", price: "2.00" },
      ];
    });
    setDirty(true);
    setSuccess(false);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
    setSuccess(false);
  };

  const validate = (): string | null => {
    if (rows.length === 0) return "Add at least one pricing tier.";

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const min = parseFloat(r.minDistanceKm);
      const max = r.maxDistanceKm !== "" ? parseFloat(r.maxDistanceKm) : null;
      const price = parseFloat(r.price);

      if (isNaN(min) || min < 0) return `Row ${i + 1}: invalid Min Distance.`;
      if (max !== null && (isNaN(max) || max <= min))
        return `Row ${i + 1}: Max Distance must be greater than Min Distance.`;
      if (isNaN(price) || price < 0) return `Row ${i + 1}: invalid Price.`;

      // Check for gap/overlap with next
      if (i < rows.length - 1 && max !== null) {
        const nextMin = parseFloat(rows[i + 1].minDistanceKm);
        if (Math.abs(max - nextMin) > 0.001)
          return `Gap or overlap between row ${i + 1} and ${i + 2}. Max of row ${i + 1} must equal Min of row ${i + 2}.`;
      }
    }

    // First tier should start at 0
    if (parseFloat(rows[0].minDistanceKm) !== 0)
      return "First tier must start at 0 km.";

    return null;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await setTiers({
        variables: {
          input: {
            tiers: rows.map((r, i) => ({
              minDistanceKm: parseFloat(r.minDistanceKm),
              maxDistanceKm: r.maxDistanceKm !== "" ? parseFloat(r.maxDistanceKm) : null,
              price: parseFloat(r.price),
              sortOrder: i,
            })),
          },
        },
      });
      setDirty(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save pricing tiers.");
    }
  };

  // ─── render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading delivery pricing…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Truck size={22} />
          Delivery Pricing
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Configure distance-based delivery fees. Each tier defines a distance range and its corresponding price.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4 flex gap-3 items-start">
        <Info size={18} className="text-violet-400 mt-0.5 shrink-0" />
        <div className="text-sm text-violet-300/90 space-y-1">
          <p>
            Distance is calculated from the <strong>business location</strong> to the
            customer&apos;s <strong>drop-off address</strong> using straight-line distance.
          </p>
          <p>
            The last tier can have an empty &quot;Max&quot; to cover all distances beyond its minimum.
          </p>
        </div>
      </div>

      {/* Tier table */}
      <div className="bg-[#111113] border border-zinc-800 rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <ArrowUpDown size={12} />
            Min Distance (km)
          </div>
          <div>Max Distance (km)</div>
          <div>Price (€)</div>
          <div className="w-9" />
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">
            No pricing tiers configured. Click &quot;Add Tier&quot; to get started.
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-zinc-800/50 last:border-0 items-center hover:bg-zinc-800/20 transition-colors"
            >
              <Input
                type="number"
                step="0.5"
                min="0"
                value={row.minDistanceKm}
                onChange={(e) => updateRow(index, "minDistanceKm", e.target.value)}
                placeholder="0"
              />
              <Input
                type="number"
                step="0.5"
                min="0"
                value={row.maxDistanceKm}
                onChange={(e) => updateRow(index, "maxDistanceKm", e.target.value)}
                placeholder="∞ (unlimited)"
              />
              <Input
                type="number"
                step="0.10"
                min="0"
                value={row.price}
                onChange={(e) => updateRow(index, "price", e.target.value)}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remove tier"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}

        {/* Add row */}
        <div className="px-5 py-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Plus size={16} />
            Add Tier
          </button>
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
          <Save size={16} />
          Pricing tiers saved successfully!
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={16} />
              Save Pricing Tiers
            </>
          )}
        </Button>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="bg-[#111113] border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Preview</h3>
          <div className="space-y-1.5">
            {rows.map((row, i) => {
              const min = row.minDistanceKm || "0";
              const max = row.maxDistanceKm;
              const price = row.price || "0";
              const label = max
                ? `${min} – ${max} km`
                : `${min}+ km`;

              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between text-sm py-1.5 px-3 rounded bg-zinc-800/30"
                >
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-white font-medium">€{parseFloat(price).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
