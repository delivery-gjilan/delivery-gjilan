"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { BarChart3, ArrowLeftRight, HandCoins, Store, Building2, RefreshCw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_PROMOTIONS_ANALYTICS } from "@/graphql/operations/promotions/queries";
import type { GetPromotionsAnalyticsQuery, GetPromotionsAnalyticsQueryVariables } from "@/gql/graphql";

const formatMoney = (value: number) => `€${value.toFixed(2)}`;

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
};

const toIsoRangeStart = (value: string) => (value ? `${value}T00:00:00.000Z` : undefined);
const toIsoRangeEnd = (value: string) => (value ? `${value}T23:59:59.999Z` : undefined);

export default function PromotionsAnalyticsPage() {
    const [activeView, setActiveView] = useState<"breakdown" | "trends">("breakdown");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isActiveFilter, setIsActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [includeRecovery, setIncludeRecovery] = useState(false);

    const variables = useMemo<GetPromotionsAnalyticsQueryVariables>(
        () => ({
            from: toIsoRangeStart(fromDate),
            to: toIsoRangeEnd(toDate),
            includeRecovery,
            isActive: isActiveFilter === "ALL" ? undefined : isActiveFilter === "ACTIVE",
        }),
        [fromDate, toDate, includeRecovery, isActiveFilter],
    );

    const { data, loading, error, refetch } = useQuery<GetPromotionsAnalyticsQuery>(GET_PROMOTIONS_ANALYTICS, {
        variables,
        fetchPolicy: "cache-and-network",
    });

    const analytics = data?.getPromotionsAnalytics;
    const items = useMemo(
        () => [...(analytics?.items ?? [])].sort((a, b) => b.totalDeducted - a.totalDeducted),
        [analytics?.items],
    );
    const dailyPoints = analytics?.dailyPoints ?? [];

    const summaryCards = [
        {
            label: "Total Deducted",
            value: formatMoney(analytics?.summary.totalDeducted ?? 0),
            hint: "All promo deductions",
            icon: HandCoins,
        },
        {
            label: "Platform Paid",
            value: formatMoney(analytics?.summary.platformPaid ?? 0),
            hint: "Platform-funded promotions",
            icon: Building2,
        },
        {
            label: "Business Paid",
            value: formatMoney(analytics?.summary.businessPaid ?? 0),
            hint: "Business-funded promotions",
            icon: Store,
        },
        {
            label: "Usage Count",
            value: String(analytics?.summary.totalUsageCount ?? 0),
            hint: `Unique users: ${analytics?.summary.uniqueUsers ?? 0}`,
            icon: ArrowLeftRight,
        },
    ] as const;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={18} /> Promotion Analytics
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Usage, deducted amount, and payer split between platform and businesses.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/promotions">
                        <Button variant="secondary">
                            Back to Promotions
                        </Button>
                    </Link>
                    <Button onClick={() => refetch()}>
                        <RefreshCw size={16} className="mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {summaryCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-zinc-800 bg-[#101014] p-4">
                        <div className="text-zinc-500 text-xs uppercase tracking-wider flex items-center gap-2">
                            <card.icon size={14} /> {card.label}
                        </div>
                        <div className="text-zinc-100 text-2xl font-semibold mt-2">{card.value}</div>
                        <div className="text-zinc-500 text-xs mt-1">{card.hint}</div>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#101014] p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                        type="date"
                        label="From"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                    />
                    <Input
                        type="date"
                        label="To"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                    />
                    <Select
                        label="Status"
                        value={isActiveFilter}
                        onChange={(event) => setIsActiveFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                    >
                        <option value="ALL">All promotions</option>
                        <option value="ACTIVE">Active only</option>
                        <option value="INACTIVE">Inactive only</option>
                    </Select>
                    <Select
                        label="Recovery promos"
                        value={includeRecovery ? "INCLUDE" : "EXCLUDE"}
                        onChange={(event) => setIncludeRecovery(event.target.value === "INCLUDE")}
                    >
                        <option value="EXCLUDE">Exclude recovery</option>
                        <option value="INCLUDE">Include recovery</option>
                    </Select>
                </div>
            </div>

            <div className="flex gap-2 border-b border-zinc-800">
                <button
                    onClick={() => setActiveView("breakdown")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeView === "breakdown"
                            ? "border-violet-500 text-violet-300"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    Breakdown
                </button>
                <button
                    onClick={() => setActiveView("trends")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeView === "trends"
                            ? "border-violet-500 text-violet-300"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    Trends
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
                    {error.message}
                </div>
            )}

            {activeView === "trends" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-[#101014] p-4">
                        <div className="text-sm font-medium text-zinc-200 mb-3">Daily Deductions</div>
                        {dailyPoints.length === 0 ? (
                            <div className="text-zinc-500 text-sm py-8 text-center">No daily data for this filter.</div>
                        ) : (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyPoints}>
                                        <defs>
                                            <linearGradient id="platformGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="businessGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                        <XAxis dataKey="date" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                                        <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value: unknown) => formatMoney(Number(value ?? 0))}
                                            contentStyle={{ backgroundColor: "#0b0b0f", border: "1px solid #27272a", borderRadius: 8 }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="platformPaid" stroke="#06b6d4" fill="url(#platformGradient)" name="Platform Paid" />
                                        <Area type="monotone" dataKey="businessPaid" stroke="#f59e0b" fill="url(#businessGradient)" name="Business Paid" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-[#101014] p-4">
                        <div className="text-sm font-medium text-zinc-200 mb-3">Daily Usage & Users</div>
                        {dailyPoints.length === 0 ? (
                            <div className="text-zinc-500 text-sm py-8 text-center">No daily data for this filter.</div>
                        ) : (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyPoints}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                        <XAxis dataKey="date" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                                        <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: "#0b0b0f", border: "1px solid #27272a", borderRadius: 8 }}
                                        />
                                        <Legend />
                                        <Bar dataKey="usageCount" fill="#8b5cf6" name="Usage Count" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="uniqueUsers" fill="#22c55e" name="Unique Users" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeView === "breakdown" && (
            <Table>
                <thead>
                    <tr>
                        <Th>Promotion</Th>
                        <Th>Creator</Th>
                        <Th className="text-right">Usage</Th>
                        <Th className="text-right">Unique Users</Th>
                        <Th className="text-right">Deducted</Th>
                        <Th className="text-right">Discount</Th>
                        <Th className="text-right">Delivery</Th>
                        <Th className="text-right">Platform Paid</Th>
                        <Th className="text-right">Business Paid</Th>
                        <Th className="text-right">Avg Order Value</Th>
                    </tr>
                </thead>
                <tbody>
                    {loading && (
                        <tr>
                            <Td colSpan={10} className="text-zinc-500 text-center py-6">Loading analytics...</Td>
                        </tr>
                    )}
                    {!loading && items.length === 0 && (
                        <tr>
                            <Td colSpan={10} className="text-zinc-500 text-center py-6">No analytics data for this filter.</Td>
                        </tr>
                    )}
                    {!loading &&
                        items.map((item) => (
                            <tr key={item.promotion.id} className="hover:bg-zinc-900/30">
                                <Td>
                                    <div className="font-medium text-zinc-100">{item.promotion.name}</div>
                                    <div className="text-xs text-zinc-500">
                                        {item.promotion.code ? `Code: ${item.promotion.code}` : "Auto-applied"} · {item.promotion.type}
                                    </div>
                                    <div className="text-xs text-zinc-600 mt-1">Created: {formatDate(item.promotion.createdAt)}</div>
                                </Td>
                                <Td>
                                    <div className="text-zinc-200">{item.promotion.creatorType}</div>
                                    <div className="text-xs text-zinc-500">{item.creatorName ?? "Platform"}</div>
                                </Td>
                                <Td className="text-right">{item.totalUsageCount}</Td>
                                <Td className="text-right">{item.uniqueUsers}</Td>
                                <Td className="text-right font-medium text-zinc-100">{formatMoney(item.totalDeducted)}</Td>
                                <Td className="text-right">{formatMoney(item.totalDiscountDeducted)}</Td>
                                <Td className="text-right">
                                    {formatMoney(item.totalDeliveryDeducted)}
                                    <div className="text-xs text-zinc-500">free-delivery uses: {item.freeDeliveryUsageCount}</div>
                                </Td>
                                <Td className="text-right text-cyan-300">{formatMoney(item.platformPaid)}</Td>
                                <Td className="text-right text-amber-300">{formatMoney(item.businessPaid)}</Td>
                                <Td className="text-right">{formatMoney(item.averageOrderValue)}</Td>
                            </tr>
                        ))}
                </tbody>
            </Table>
            )}
        </div>
    );
}
