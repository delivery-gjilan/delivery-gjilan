"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/businesses", label: "Businesses" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/drivers", label: "Drivers" },
  { href: "/dashboard/orders", label: "Orders" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 h-screen sticky top-0 p-6 shadow-xl">
      <h1 className="text-xl font-bold mb-8 text-white">DG Admin</h1>

      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
                ? "bg-blue-600 text-white font-semibold shadow-lg"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
