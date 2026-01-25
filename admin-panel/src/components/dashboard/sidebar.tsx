// src/components/dashboard/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  Package,
  Truck,
  Map,
  Tag,
  Percent,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList, badge: true },
  { name: "Businesses", href: "/dashboard/businesses", icon: Store, superAdminOnly: true },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Drivers", href: "/dashboard/drivers", icon: Truck, superAdminOnly: true },
  { name: "Map", href: "/dashboard/map", icon: Map },
  { name: "Promotions", href: "/dashboard/promotions", icon: Tag },
  { name: "Deals", href: "/dashboard/deals", icon: Percent },
  { name: "Users", href: "/dashboard/users", icon: Users, superAdminOnly: true },
  { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // TODO: Replace with actual role from auth context
  const isSuperAdmin = true;

  const filteredMenu = menu.filter(item => !item.superAdminOnly || isSuperAdmin);

  return (
    <aside 
      className={`bg-[#0a0a0a] border-r border-[#262626] p-4 flex flex-col h-screen transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-6">
        {!collapsed && (
          <h1 className="text-xl font-bold text-white">DG Admin</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#161616] transition ml-auto"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard" 
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                  : "text-neutral-400 hover:bg-[#161616] hover:text-white"
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1">{item.name}</span>
              )}
              {!collapsed && item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

