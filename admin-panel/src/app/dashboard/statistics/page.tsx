"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar } from "lucide-react";

export default function StatisticsPage() {
  const [dateRange, setDateRange] = useState("7days");

  const stats = [
    {
      label: "Total Revenue",
      value: "$12,450",
      change: "+12.5%",
      positive: true,
    },
    {
      label: "Total Orders",
      value: "847",
      change: "+8.2%",
      positive: true,
    },
    {
      label: "Avg Order Value",
      value: "$14.70",
      change: "+3.1%",
      positive: true,
    },
    {
      label: "Avg Prep Time",
      value: "18 min",
      change: "-2 min",
      positive: true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Statistics
        </h1>

        {/* Date Range Filter */}
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-zinc-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-[#111113] border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-[#111113] border border-zinc-800 rounded-xl p-5"
          >
            <div className="text-zinc-500 text-sm mb-2">{stat.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.positive ? "text-green-400" : "text-red-400"
                }`}
              >
                {stat.positive ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Over Time */}
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Orders Over Time</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-zinc-600 text-sm">Chart coming soon</p>
            </div>
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Revenue Over Time</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-zinc-600 text-sm">Chart coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-[#111113] border border-zinc-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Performance Metrics</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-zinc-600 text-sm">
              Conversion metrics and detailed analytics coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
