"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useBusinesses } from "@/lib/hooks/useBusinesses";
import { GET_INVENTORY_EARNINGS } from "@/graphql/operations/inventory";
import type { InventoryEarningsQuery } from "@/gql/graphql";
import {
    Warehouse,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Package,
    ArrowUpDown,
    Calendar,
    BarChart3,
} from "lucide-react";
import { startOfDay, subDays, startOfMonth, format } from "date-fns";

/* ===============================================
   TYPES
=============================================== */

interface EarningsProduct {
    productId: string;
    productName: string;
    productImageUrl?: string | null;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
}

type SortField = "name" | "unitsSold" | "revenue" | "cost" | "profit" | "margin";
type SortDir = "asc" | "desc";
type DatePreset = "today" | "7days" | "30days" | "month" | "all" | "custom";
type InventoryEarningsData = InventoryEarningsQuery["inventoryEarnings"];

/* ===============================================
   MAIN PAGE
=============================================== */

export default function InventoryEarningsPage() {
    const { businesses, loading: businessesLoading } = useBusinesses();

    const marketBusiness = useMemo(() => {
        return businesses.find((b) => b.businessType === "MARKET");
    }, [businesses]);

    const businessId = marketBusiness?.id ?? "";

    if (businessesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-zinc-500">Loading...</div>
            </div>
        );
    }

    if (!businessId) {
        return (
            <div className="text-white space-y-6">
                <PageHeader />
                <div className="bg-[#111113] border border-zinc-800/50 rounded-xl p-12 text-center">
                    <Warehouse className="mx-auto mb-4 text-zinc-600" size={48} />
                    <p className="text-zinc-400">No market business found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white space-y-6">
            <PageHeader />
            <EarningsContent businessId={businessId} />
        </div>
    );
}

/* ===============================================
   HEADER
=============================================== */

function PageHeader() {
    return (
        <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2.5">
                <BarChart3 className="text-emerald-400" size={28} />
                Inventory Earnings
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
                Track revenue, costs, and profit from products sold through your personal stock.
            </p>
        </div>
    );
}

/* ===============================================
   EARNINGS CONTENT
=============================================== */

function EarningsContent({ businessId }: { businessId: string }) {
    const [datePreset, setDatePreset] = useState<DatePreset>("30days");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [sortField, setSortField] = useState<SortField>("revenue");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // Calculate date range based on preset
    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        switch (datePreset) {
            case "today":
                return {
                    startDate: startOfDay(now).toISOString(),
                    endDate: now.toISOString(),
                };
            case "7days":
                return {
                    startDate: subDays(now, 7).toISOString(),
                    endDate: now.toISOString(),
                };
            case "30days":
                return {
                    startDate: subDays(now, 30).toISOString(),
                    endDate: now.toISOString(),
                };
            case "month":
                return {
                    startDate: startOfMonth(now).toISOString(),
                    endDate: now.toISOString(),
                };
            case "all":
                return { startDate: undefined, endDate: undefined };
            case "custom":
                return {
                    startDate: customStart ? new Date(customStart).toISOString() : undefined,
                    endDate: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : undefined,
                };
        }
    }, [datePreset, customStart, customEnd]);

    const { data, loading } = useQuery(GET_INVENTORY_EARNINGS, {
        variables: {
            businessId,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        },
        skip: !businessId,
    });

    const earnings = data?.inventoryEarnings;
    const products = earnings?.products ?? [];

    // Sort products
    const sortedProducts = useMemo(() => {
        const sorted = [...products].sort((a, b) => {
            let aVal: string | number;
            let bVal: string | number;

            switch (sortField) {
                case "name":
                    aVal = a.productName.toLowerCase();
                    bVal = b.productName.toLowerCase();
                    return sortDir === "asc"
                        ? (aVal as string).localeCompare(bVal as string)
                        : (bVal as string).localeCompare(aVal as string);
                case "unitsSold":
                    aVal = a.unitsSold;
                    bVal = b.unitsSold;
                    break;
                case "revenue":
                    aVal = a.revenue;
                    bVal = b.revenue;
                    break;
                case "cost":
                    aVal = a.cost;
                    bVal = b.cost;
                    break;
                case "profit":
                    aVal = a.profit;
                    bVal = b.profit;
                    break;
                case "margin":
                    aVal = a.margin;
                    bVal = b.margin;
                    break;
                default:
                    return 0;
            }

            return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
        return sorted;
    }, [products, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    return (
        <div className="space-y-5">
            {/* Date Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
                <Calendar size={18} className="text-zinc-500" />
                <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                    className="px-4 py-2 bg-[#111113] border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                </select>

                {datePreset === "custom" && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="px-3 py-2 bg-[#111113] border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        <span className="text-zinc-500 text-sm">to</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="px-3 py-2 bg-[#111113] border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-[#111113] border border-zinc-800/50 rounded-xl p-5 animate-pulse">
                            <div className="h-4 bg-zinc-800 rounded w-20 mb-3" />
                            <div className="h-7 bg-zinc-800 rounded w-28" />
                        </div>
                    ))}
                </div>
            ) : (
                <SummaryCards earnings={earnings} />
            )}

            {/* Products Table */}
            <div className="bg-[#111113] border border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800/50">
                    <h3 className="text-sm font-medium text-zinc-300">Product Breakdown</h3>
                    {earnings && (
                        <p className="text-xs text-zinc-600 mt-0.5">
                            {earnings.orderCount} order{earnings.orderCount !== 1 ? "s" : ""} with stock items
                        </p>
                    )}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-zinc-500 animate-pulse">Loading earnings data...</div>
                ) : sortedProducts.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="mx-auto mb-3 text-zinc-700" size={40} />
                        <p className="text-zinc-500 text-sm">No stock sales found for this period.</p>
                        <p className="text-zinc-600 text-xs mt-1">
                            Earnings appear after you deduct stock from delivered orders.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800/50">
                                    <th className="px-5 py-3 font-medium">
                                        <SortHeader label="Product" field="name" current={sortField} dir={sortDir} onSort={toggleSort} />
                                    </th>
                                    <th className="px-4 py-3 font-medium text-right">
                                        <SortHeader label="Units" field="unitsSold" current={sortField} dir={sortDir} onSort={toggleSort} />
                                    </th>
                                    <th className="px-4 py-3 font-medium text-right">
                                        <SortHeader label="Revenue" field="revenue" current={sortField} dir={sortDir} onSort={toggleSort} />
                                    </th>
                                    <th className="px-4 py-3 font-medium text-right">
                                        <SortHeader label="Cost" field="cost" current={sortField} dir={sortDir} onSort={toggleSort} />
                                    </th>
                                    <th className="px-4 py-3 font-medium text-right">
                                        <SortHeader label="Profit" field="profit" current={sortField} dir={sortDir} onSort={toggleSort} />
                                    </th>
                                    <th className="px-4 py-3 font-medium text-right">
                                        <SortHeader label="Margin" field="margin" current={sortField} dir={sortDir} onSort={toggleSort} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProducts.map((product) => (
                                    <ProductRow key={product.productId} product={product as EarningsProduct} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ===============================================
   SUMMARY CARDS
=============================================== */

function SummaryCards({ earnings }: { earnings?: InventoryEarningsData }) {
    const cards = [
        {
            label: "Revenue",
            value: `€${(earnings?.totalRevenue ?? 0).toFixed(2)}`,
            icon: DollarSign,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Cost (COGS)",
            value: `€${(earnings?.totalCost ?? 0).toFixed(2)}`,
            icon: ShoppingCart,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
        },
        {
            label: "Profit",
            value: `€${(earnings?.totalProfit ?? 0).toFixed(2)}`,
            icon: TrendingUp,
            color: (earnings?.totalProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
            bg: (earnings?.totalProfit ?? 0) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
        },
        {
            label: "Units Sold",
            value: `${earnings?.totalUnitsSold ?? 0}`,
            icon: Package,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="bg-[#111113] border border-zinc-800/50 rounded-xl p-5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${card.bg}`}>
                            <card.icon size={16} className={card.color} />
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">{card.label}</span>
                    </div>
                    <p className="text-xl font-semibold">{card.value}</p>
                    {card.label === "Profit" && earnings?.averageMargin != null && (
                        <p className="text-xs text-zinc-500 mt-1">
                            {earnings.averageMargin.toFixed(1)}% avg margin
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ===============================================
   SORT HEADER
=============================================== */

function SortHeader({
    label,
    field,
    current,
    dir,
    onSort,
}: {
    label: string;
    field: SortField;
    current: SortField;
    dir: SortDir;
    onSort: (f: SortField) => void;
}) {
    const isActive = current === field;
    return (
        <button
            className={`inline-flex items-center gap-1 hover:text-zinc-300 transition-colors ${
                isActive ? "text-white" : ""
            }`}
            onClick={() => onSort(field)}
        >
            {label}
            <ArrowUpDown size={12} className={isActive ? "text-emerald-400" : "text-zinc-700"} />
            {isActive && (
                <span className="text-emerald-400 text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>
            )}
        </button>
    );
}

/* ===============================================
   PRODUCT ROW
=============================================== */

function ProductRow({ product }: { product: EarningsProduct }) {
    const profitColor = product.profit >= 0 ? "text-emerald-400" : "text-red-400";
    const marginColor =
        product.margin >= 30 ? "text-emerald-400" : product.margin >= 15 ? "text-amber-400" : "text-red-400";

    return (
        <tr className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                    {product.productImageUrl ? (
                        <img
                            src={product.productImageUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover bg-zinc-800"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <Package size={14} className="text-zinc-600" />
                        </div>
                    )}
                    <span className="font-medium text-zinc-200">{product.productName}</span>
                </div>
            </td>
            <td className="px-4 py-3.5 text-right text-zinc-300 tabular-nums">{product.unitsSold}</td>
            <td className="px-4 py-3.5 text-right text-zinc-300 tabular-nums">€{product.revenue.toFixed(2)}</td>
            <td className="px-4 py-3.5 text-right text-zinc-400 tabular-nums">€{product.cost.toFixed(2)}</td>
            <td className={`px-4 py-3.5 text-right font-medium tabular-nums ${profitColor}`}>
                €{product.profit.toFixed(2)}
            </td>
            <td className={`px-4 py-3.5 text-right font-medium tabular-nums ${marginColor}`}>
                {product.margin.toFixed(1)}%
            </td>
        </tr>
    );
}
