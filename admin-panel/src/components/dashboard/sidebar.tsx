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
  Users,
  UserCog,
  BarChart3,
  Settings,
  DollarSign,
  Activity,
  Bell,
  LayoutDashboard,
  Image,
} from "lucide-react";

const menu: any[] = [
  // Section 1
  { sectionHeader: "Operations", superAdminOnly: true },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList, businessAdminVisible: true },
  { name: "Map", href: "/dashboard/map", icon: Map, superAdminOnly: true },
  { name: "Businesses", href: "/dashboard/businesses", icon: Store, superAdminOnly: true },
  { name: "Market", href: "/dashboard/market", icon: Store, superAdminOnly: true },
  { name: "Drivers", href: "/dashboard/drivers", icon: Truck, superAdminOnly: true },

  { divider: true, superAdminOnly: true },

  // Section 2
  { sectionHeader: "Pricing & Promotions", superAdminOnly: true },
  { name: "Promotions", href: "/dashboard/promotions", icon: Tag, superAdminOnly: true },
  { name: "Product Markup", href: "/dashboard/productpricing", icon: Tag, superAdminOnly: true },
  { name: "Delivery Pricing", href: "/dashboard/delivery-pricing", icon: Truck, superAdminOnly: true },
  { name: "Delivery Zones", href: "/dashboard/delivery-zones", icon: Map, superAdminOnly: true },

  { divider: true, superAdminOnly: true },

  // Section 3
  { sectionHeader: "Finance & Admin", superAdminOnly: true },
  { name: "Financial Ops", href: "/admin/financial", icon: DollarSign, superAdminOnly: true },
  { name: "Admins", href: "/dashboard/admins", icon: UserCog, superAdminOnly: true },
  { name: "Users", href: "/dashboard/users", icon: Users, superAdminOnly: true },
  { name: "Promotions", href: "/dashboard/promotions", icon: Tag, superAdminOnly: true },

  { divider: true, superAdminOnly: true },

  // Remaining items
  { sectionHeader: "Other", superAdminOnly: true },
  { name: "Settlements", href: "/dashboard/business-settlements", icon: DollarSign, businessAdminVisible: true },
  { name: "Categories", href: "/dashboard/categories", icon: Tag, businessAdminVisible: true },
  { name: "Products", href: "/dashboard/products", icon: Package, businessAdminVisible: true },
  { name: "Statistics", href: "/dashboard/statistics", icon: BarChart3, businessAdminVisible: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, businessAdminVisible: true },
  { name: "Banners", href: "/admin/banners", icon: Image, superAdminOnly: true },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, superAdminOnly: true },
  { name: "Push Telemetry", href: "/dashboard/notifications/telemetry", icon: Activity, superAdminOnly: true },
  { name: "Business Devices", href: "/dashboard/notifications/devices", icon: Activity, superAdminOnly: true },
  { name: "Realtime", href: "/dashboard/realtime", icon: Activity, superAdminOnly: true },
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
    if (item.divider || item.sectionHeader) {
      // Show dividers/headers only if super admin or admin
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (item.businessAdminVisible && isBusinessUser) return true;
      return isSuperAdmin || isAdmin;
    }
    if (isSuperAdmin) return true;
    if (isAdmin && !item.superAdminOnly) return true;
    if (isBusinessUser && item.businessAdminVisible) {
      if (isBusinessEmployee && item.href === '/dashboard/settings') {
        return false;
      }
      return true;
    }
    return false;
  });

  return (
    <aside className="w-[200px] bg-[#09090b] border-r border-[#1e1e22] flex flex-col py-4 h-screen overflow-visible">
      {/* Logo */}
      <Link
        href="/dashboard"
        title="Dashboard Home"
        className="mx-3 mb-5 px-3 py-2.5 rounded-lg bg-violet-600 flex items-center gap-3 hover:bg-violet-500 transition-colors"
      >
        <LayoutDashboard size={18} className="text-white flex-shrink-0" />
        <span className="text-white font-semibold text-sm">Dashboard</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto w-full px-3">
        {filteredMenu.map((item: any, index: number) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="h-px bg-zinc-800 my-2" />;
          }

          if (item.sectionHeader) {
            return (
              <div key={`section-${index}`} className="px-3 pt-3 pb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">
                  {item.sectionHeader}
                </span>
              </div>
            );
          }

          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              title={item.name}
              className={`relative px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-150 ${
                active
                  ? "bg-violet-500/15 text-violet-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              {active && (
                <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-sm bg-violet-500" />
              )}
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
              <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

