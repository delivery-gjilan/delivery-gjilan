// src/components/dashboard/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  ClipboardList,
  Store,
  Package,
  Truck,
  Map,
  Tag,
  Percent,
  Users,
  UserCog,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Activity,
} from "lucide-react";

const menu = [
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList, businessAdminVisible: true },
  { name: "Market", href: "/dashboard/market", icon: Store, businessAdminVisible: true },
  { name: "Products", href: "/dashboard/products", icon: Package, businessAdminVisible: true },
  { name: "Deals", href: "/dashboard/deals", icon: Percent, businessAdminVisible: true },
  { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3, businessAdminVisible: true },
  { name: "Finances", href: "/dashboard/finances", icon: DollarSign, businessAdminVisible: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, businessAdminVisible: true },
  { name: "Businesses", href: "/dashboard/businesses", icon: Store, superAdminOnly: true },
  { name: "Drivers", href: "/dashboard/drivers", icon: Truck, superAdminOnly: true },
  { name: "Map", href: "/dashboard/map", icon: Map, superAdminOnly: true },
  { name: "Promotions", href: "/dashboard/promotions", icon: Tag, superAdminOnly: true },
  { name: "Admins", href: "/dashboard/admins", icon: UserCog, superAdminOnly: true },
  { name: "Users", href: "/dashboard/users", icon: Users, superAdminOnly: true },
  { name: "Logs", href: "/dashboard/logs", icon: Activity, superAdminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { admin } = useAuth();

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const isAdmin = admin?.role === "ADMIN";
  const isBusinessOwner = admin?.role === "BUSINESS_OWNER";
  const isBusinessEmployee = admin?.role === "BUSINESS_EMPLOYEE";
  
  // Platform admins can see platform-level features
  const isPlatformAdmin = isSuperAdmin || isAdmin;
  // Business users can see business-level features
  const isBusinessUser = isBusinessOwner || isBusinessEmployee;

  const filteredMenu = menu.filter(item => {
    // Super admin sees everything
    if (isSuperAdmin) return true;
    // Regular admin sees everything except super admin only items
    if (isAdmin && !item.superAdminOnly) return true;
   // Business users see business features
    if (isBusinessUser && item.businessAdminVisible) {
      // Business employees cannot see certain sensitive items
      if (isBusinessEmployee && (item.href === '/dashboard/finances' || item.href === '/dashboard/settings')) {
        return false;
      }
      return true;
    }
    return false;
  });

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
          const active = pathname.startsWith(item.href);

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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

