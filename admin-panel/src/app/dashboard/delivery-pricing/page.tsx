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
  Info,
  CheckCircle2,
  Eye,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  GET_DELIVERY_PRICING_TIERS,
  SET_DELIVERY_PRICING_TIERS,
} from "@/graphql/operations/deliveryPricing";

interface TierRow {
  key: string;
  minDistanceKm: string;
  maxDistanceKm: string;
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
  const { data, loading } = useQuery(GET_DELIVERY_PRICING_TIERS);
  const [setTiers, { loading: saving }] = useMutation(
    SET_DELIVERY_PRICING_TIERS,
    { refetchQueries: [{ query: GET_DELIVERY_PRICING_TIERS }] }
  );

  const [rows, setRows] = useState<TierRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const updateRow = (index: number, field: keyof Omit<TierRow, "key">, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

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

      if (i < rows.length - 1 && max !== null) {
        const nextMin = parseFloat(rows[i + 1].minDistanceKm);
        if (Math.abs(max - nextMin) > 0.001)
          return `Gap or overlap between row ${i + 1} and ${i + 2}. Max of row ${i + 1} must equal Min of row ${i + 2}.`;
      }
    }

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save pricing tiers.";
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading delivery pricing…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <Truck size={22} />
            Delivery Pricing
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Configure distance-based delivery fees for all orders.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0" />
          Pricing tiers saved successfully.
        </div>
      )}

      {/* Info banner */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex gap-3 items-start">
        <Info size={18} className="text-violet-400 mt-0.5 shrink-0" />
        <div className="text-sm text-violet-300/90 leading-relaxed">
          Distance is calculated from the <strong>business location</strong> to the
          customer&apos;s <strong>drop-off address</strong> (straight-line).
          The last tier can leave &quot;Max&quot; empty to cover all distances beyond its minimum.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier table — main column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Pricing Tiers</CardTitle>
                  <CardDescription className="mt-1">
                    {rows.length} {rows.length === 1 ? "tier" : "tiers"} configured
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus size={14} />
                  Add Tier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3">
                    <Truck size={20} className="text-zinc-500" />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">No pricing tiers</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Click &quot;Add Tier&quot; to configure distance-based pricing.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Min (km)</TableHead>
                      <TableHead>Max (km)</TableHead>
                      <TableHead>Price (€)</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.key}>
                        <TableCell className="text-center text-zinc-500 tabular-nums text-xs font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={row.minDistanceKm}
                            onChange={(e) => updateRow(index, "minDistanceKm", e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={row.maxDistanceKm}
                            onChange={(e) => updateRow(index, "maxDistanceKm", e.target.value)}
                            placeholder="∞"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.10"
                            min="0"
                            value={row.price}
                            onChange={(e) => updateRow(index, "price", e.target.value)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove tier"
                          >
                            <Trash2 size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye size={16} className="text-zinc-400" />
                Preview
              </CardTitle>
              <CardDescription>
                How customers see delivery fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No tiers to preview.</p>
              ) : (
                <div className="space-y-2">
                  {rows.map((row) => {
                    const min = row.minDistanceKm || "0";
                    const max = row.maxDistanceKm;
                    const price = row.price || "0";
                    const label = max ? `${min} – ${max} km` : `${min}+ km`;

                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-[#09090b] border border-zinc-800/50"
                      >
                        <span className="text-zinc-400">{label}</span>
                        <span className="text-white font-semibold tabular-nums">
                          €{parseFloat(price).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
