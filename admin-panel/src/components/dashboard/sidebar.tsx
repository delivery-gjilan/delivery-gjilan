// src/components/dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import {
  ClipboardList,
  Store,
  Package,
  Truck,
  Map,
  Tag,
  Users,
  UserCog,
  DollarSign,
  Activity,
  Bell,
  LayoutDashboard,
  Image,
  MessageSquare,
  Monitor,
  ChevronDown,
  Star,
  Warehouse,
  BarChart3,
  Wallet,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  businessAdminVisible?: boolean;
}

interface NavSection {
  header: string;
  superAdminOnly?: boolean;
  businessAdminVisible?: boolean;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    header: "Operations",
    superAdminOnly: true,
    items: [
      { name: "Orders", href: "/dashboard/orders", icon: ClipboardList, businessAdminVisible: true },
      { name: "Settlements", href: "/dashboard/business-settlements", icon: Wallet, businessAdminVisible: true },
      { name: "Cancelled Orders", href: "/dashboard/orders/cancelled", icon: ClipboardList, superAdminOnly: true },
      { name: "Map", href: "/dashboard/map", icon: Map, superAdminOnly: true },
      { name: "Businesses", href: "/dashboard/businesses", icon: Store, superAdminOnly: true },
      { name: "Market", href: "/dashboard/market", icon: Store, superAdminOnly: true },
      { name: "Inventory", href: "/dashboard/inventory", icon: Warehouse, superAdminOnly: true },
      { name: "Inventory Earnings", href: "/dashboard/inventory/earnings", icon: BarChart3, superAdminOnly: true },
      { name: "Drivers", href: "/dashboard/drivers", icon: Truck, superAdminOnly: true },
    ],
  },
  {
    header: "Pricing & Promotions",
    superAdminOnly: true,
    items: [
      { name: "Promotions", href: "/dashboard/promotions", icon: Tag, superAdminOnly: true },
      { name: "Product Markup", href: "/dashboard/productpricing", icon: Tag, superAdminOnly: true },
      { name: "Delivery Pricing", href: "/dashboard/delivery-pricing", icon: Truck, superAdminOnly: true },
      { name: "Delivery Zones", href: "/dashboard/delivery-zones", icon: Map, superAdminOnly: true },
    ],
  },
  {
    header: "Finance & Admin",
    superAdminOnly: true,
    items: [
      { name: "Financial Ops", href: "/admin/financial", icon: DollarSign, superAdminOnly: true },
      { name: "Admins", href: "/dashboard/admins", icon: UserCog, superAdminOnly: true },
      { name: "Users", href: "/dashboard/users", icon: Users, superAdminOnly: true },
      { name: "Messages", href: "/admin/messages", icon: MessageSquare, superAdminOnly: true },
    ],
  },
  {
    header: "Other",
    superAdminOnly: true,
    businessAdminVisible: true,
    items: [
      { name: "Categories", href: "/dashboard/categories", icon: Tag, businessAdminVisible: true },
      { name: "Products", href: "/dashboard/products", icon: Package, businessAdminVisible: true },
      { name: "Banners", href: "/admin/banners", icon: Image, superAdminOnly: true },
      { name: "Featured", href: "/admin/featured", icon: Star, superAdminOnly: true },
      { name: "Notifications", href: "/dashboard/notifications", icon: Bell, superAdminOnly: true },
      { name: "Business Devices", href: "/dashboard/notifications/devices", icon: Activity, superAdminOnly: true },
      { name: "Ops Wall", href: "/dashboard/ops-wall", icon: Monitor, superAdminOnly: true },
      { name: "Logs", href: "/dashboard/logs", icon: Activity, superAdminOnly: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { admin } = useAuth();

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const isAdmin = admin?.role === "ADMIN";
  const isBusinessOwner = admin?.role === "BUSINESS_OWNER";
  const isBusinessEmployee = admin?.role === "BUSINESS_EMPLOYEE";
  const isBusinessUser = isBusinessOwner || isBusinessEmployee;

  const canSeeItem = (item: NavItem) => {
    if (isSuperAdmin) return true;
    if (isAdmin && !item.superAdminOnly) return true;
    if (isBusinessUser && item.businessAdminVisible) return true;
    return false;
  };

  const canSeeSection = (section: NavSection) => {
    if (isSuperAdmin) return true;
    if (isAdmin && !section.superAdminOnly) return true;
    if (isBusinessUser && section.businessAdminVisible) return true;
    // Show section even if superAdminOnly but admin role can see at least 1 item
    if (isAdmin) return section.items.some((i) => canSeeItem(i));
    if (isBusinessUser) return section.items.some((i) => canSeeItem(i));
    return false;
  };

  // Build initial open state — open sections that contain the active route
  const initialOpen = sections.reduce<Record<string, boolean>>((acc, s) => {
    const hasActive = s.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
    acc[s.header] = hasActive;
    return acc;
  }, {});

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(initialOpen);

  const toggleSection = (header: string) => {
    setOpenSections((prev) => ({ ...prev, [header]: !prev[header] }));
  };

  return (
    <aside className="w-[250px] bg-[#09090b] border-r border-[#1e1e22] flex flex-col py-4 h-screen overflow-visible">
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
      <nav className="flex-1 flex flex-col overflow-y-auto w-full px-3 gap-0.5">
        {sections.map((section) => {
          if (!canSeeSection(section)) return null;
          const visibleItems = section.items.filter(canSeeItem);
          if (visibleItems.length === 0) return null;
          const isOpen = openSections[section.header] ?? false;
          const sectionHasActive = visibleItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

          return (
            <div key={section.header} className="mb-0.5">
              {/* Section header — clickable to collapse */}
              <button
                onClick={() => toggleSection(section.header)}
                className={`w-full flex items-center justify-between gap-1 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                  sectionHasActive
                    ? 'bg-violet-500/10 text-violet-300'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <span className="text-sm font-semibold truncate">
                  {section.header}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-all duration-200 flex-shrink-0 ${sectionHasActive ? 'text-violet-400' : 'text-zinc-600 group-hover:text-zinc-400'} ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>

              {/* Items */}
              {isOpen && (
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
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
                        <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
                        <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

