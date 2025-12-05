// src/components/dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Boxes,
  ShoppingBasket,
  Users,
  ClipboardList,
  Settings,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Businesses", href: "/dashboard/businesses", icon: Store },
  { name: "Categories", href: "/dashboard/categories", icon: Boxes },
  { name: "Products", href: "/dashboard/products", icon: ShoppingBasket },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Drivers", href: "/dashboard/drivers", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-8 text-white">DG Admin</h1>

      <nav className="space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          // Fix: exact match for /dashboard, startsWith for others
          const active = item.href === "/dashboard" 
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/50"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

