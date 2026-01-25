"use client";

import { 
  LayoutDashboard, 
  ClipboardList, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Package
} from "lucide-react";

export default function DashboardHome() {
  // TODO: Replace with actual role from auth context
  const isSuperAdmin = true;

  // TODO: Replace with actual data from API
  const stats = {
    superAdmin: [
      { label: "Total Orders", value: "847", icon: ClipboardList, color: "cyan" },
      { label: "Active Orders", value: "23", icon: TrendingUp, color: "green" },
      { label: "Total Revenue", value: "$12,450", icon: DollarSign, color: "green" },
      { label: "Alerts", value: "3", icon: AlertTriangle, color: "red" },
    ],
    businessAdmin: [
      { label: "Today's Orders", value: "42", icon: ClipboardList, color: "cyan" },
      { label: "Orders in Progress", value: "8", icon: Package, color: "green" },
      { label: "Avg Prep Time", value: "18 min", icon: Clock, color: "neutral" },
      { label: "Today's Revenue", value: "$890", icon: DollarSign, color: "green" },
    ],
  };

  const currentStats = isSuperAdmin ? stats.superAdmin : stats.businessAdmin;

  const colorClasses = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    green: "bg-green-500/10 text-green-400 border-green-500/30",
    red: "bg-red-500/10 text-red-400 border-red-500/30",
    neutral: "bg-neutral-500/10 text-neutral-400 border-neutral-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <LayoutDashboard size={32} />
          Dashboard Overview
        </h1>
        <p className="text-neutral-400 mt-2">
          {isSuperAdmin 
            ? "Platform-wide metrics and activity" 
            : "Your business performance at a glance"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-[#161616] border border-[#262626] rounded-lg p-6 hover:border-[#404040] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-400 text-sm font-medium">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-lg border ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity / Alerts */}
      {isSuperAdmin && (
        <div className="bg-[#161616] border border-[#262626] rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Alerts & Notifications
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertTriangle size={18} className="text-red-400 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">Delayed Order #12345</p>
                <p className="text-neutral-400 text-xs mt-1">Order has been pending for over 30 minutes</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={18} className="text-amber-400 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">User Flagged</p>
                <p className="text-neutral-400 text-xs mt-1">Multiple failed payment attempts detected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Performance */}
      {!isSuperAdmin && (
        <div className="bg-[#161616] border border-[#262626] rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg hover:border-cyan-500/30 transition-colors text-center">
              <Package size={24} className="mx-auto text-cyan-400 mb-2" />
              <span className="text-sm text-white">View Orders</span>
            </button>
            <button className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg hover:border-cyan-500/30 transition-colors text-center">
              <Clock size={24} className="mx-auto text-cyan-400 mb-2" />
              <span className="text-sm text-white">Update Hours</span>
            </button>
            <button className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg hover:border-cyan-500/30 transition-colors text-center">
              <TrendingUp size={24} className="mx-auto text-cyan-400 mb-2" />
              <span className="text-sm text-white">Statistics</span>
            </button>
            <button className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg hover:border-cyan-500/30 transition-colors text-center">
              <LayoutDashboard size={24} className="mx-auto text-cyan-400 mb-2" />
              <span className="text-sm text-white">Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

