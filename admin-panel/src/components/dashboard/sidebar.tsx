// src/components/dashboard/Sidebar.tsx
"use client";

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
  DollarSign,
  Activity,
  Bell,
  LayoutDashboard,
} from "lucide-react";

const menu: any[] = [
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList, businessAdminVisible: true },
  { name: "Market", href: "/dashboard/market", icon: Store, businessAdminVisible: true },
  { name: "Products", href: "/dashboard/products", icon: Package, businessAdminVisible: true },
  { name: "Deals", href: "/dashboard/deals", icon: Percent, businessAdminVisible: true },
  { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3, businessAdminVisible: true },
  { name: "Finances", href: "/dashboard/finances", icon: DollarSign, businessAdminVisible: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, businessAdminVisible: true },
  { divider: true, name: "divider" },
  { name: "Businesses", href: "/dashboard/businesses", icon: Store, superAdminOnly: true },
  { name: "Drivers", href: "/dashboard/drivers", icon: Truck, superAdminOnly: true },
  { name: "Map", href: "/dashboard/map", icon: Map, superAdminOnly: true },
  { name: "Promotions", href: "/dashboard/promotions", icon: Tag, superAdminOnly: true },
  { name: "Delivery Pricing", href: "/dashboard/delivery-pricing", icon: Truck, superAdminOnly: true },
  { name: "Delivery Zones", href: "/dashboard/delivery-zones", icon: Map, superAdminOnly: true },
  { name: "Admins", href: "/dashboard/admins", icon: UserCog, superAdminOnly: true },
  { name: "Users", href: "/dashboard/users", icon: Users, superAdminOnly: true },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, superAdminOnly: true },
  { name: "Logs", href: "/dashboard/logs", icon: Activity, superAdminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { admin } = useAuth();

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const isAdmin = admin?.role === "ADMIN";
  const isBusinessOwner = admin?.role === "BUSINESS_OWNER";
  const isBusinessEmployee = admin?.role === "BUSINESS_EMPLOYEE";
  const isBusinessUser = isBusinessOwner || isBusinessEmployee;

  const filteredMenu = menu.filter((item: any) => {
    if (item.divider) return isSuperAdmin || isAdmin;
    if (isSuperAdmin) return true;
    if (isAdmin && !item.superAdminOnly) return true;
    if (isBusinessUser && item.businessAdminVisible) {
      if (isBusinessEmployee && (item.href === '/dashboard/finances' || item.href === '/dashboard/settings')) {
        return false;
      }
      return true;
    }
    return false;
  });

  return (
    <aside className="w-[60px] bg-[#09090b] border-r border-[#1e1e22] flex flex-col items-center py-4 h-screen overflow-visible">
      {/* Logo */}
      <Link
        href="/dashboard"
        title="Dashboard Home"
        className="relative group w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center mb-5 hover:bg-violet-500 transition-colors"
      >
        <LayoutDashboard size={18} className="text-white" />
        {/* Tooltip */}
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-800 text-zinc-100 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-0 whitespace-nowrap shadow-2xl border border-zinc-700 pointer-events-none z-[9999]">
          Dashboard Home
          <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[5px] border-transparent border-r-zinc-800" />
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 overflow-y-auto w-full px-2.5">
        {filteredMenu.map((item: any, index: number) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="w-5 h-px bg-zinc-800 my-2" />;
          }

          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <div key={item.href} className="relative group w-9 h-9">
              <Link
                href={item.href}
                title={item.name}
                className={`w-full h-full rounded-lg flex items-center justify-center transition-all duration-150 ${
                  active
                    ? "bg-violet-500/15 text-violet-400"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {active && (
                  <div className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-sm bg-violet-500" />
                )}
              </Link>
              {/* Tooltip */}
              <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-800 text-zinc-100 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-0 whitespace-nowrap shadow-2xl border border-zinc-700 pointer-events-none z-[9999]">
                {item.name}
                <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-[5px] border-transparent border-r-zinc-800" />
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

