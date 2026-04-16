// src/app/dashboard/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";
import { canAccessAdminPanelPath } from "@/lib/route-access";
import { AdminPttProvider } from "@/lib/hooks/useAdminPtt";
import GlobalPttOverlay from "@/components/dashboard/GlobalPttOverlay";
import GlobalAdminMessageNotifications from "@/components/dashboard/GlobalAdminMessageNotifications";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, authCheckComplete, admin } = useAuth();

  useEffect(() => {
    if (!authCheckComplete || loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const isBusinessUser = admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE";

    if (isAuthenticated && !canAccessAdminPanelPath(admin?.role, pathname)) {
      router.push(isBusinessUser ? "/dashboard/orders" : "/dashboard");
      return;
    }

    // Redirect business users away from the bare /dashboard root (they have no content there)
    if (isAuthenticated && isBusinessUser && pathname === "/dashboard") {
      router.push("/dashboard/orders");
    }
  }, [isAuthenticated, loading, authCheckComplete, router, admin?.role, pathname]);

  if (loading || !authCheckComplete) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!canAccessAdminPanelPath(admin?.role, pathname)) {
    return null;
  }

  const isBusinessUserOnRoot =
    (admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE") &&
    pathname === "/dashboard";

  if (isBusinessUserOnRoot) {
    return null;
  }

  return (
    <AdminPttProvider>
      <div className="flex h-screen w-full bg-[#09090b]">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5 bg-[#09090b]">
            {children}
          </main>
        </div>
        <GlobalAdminMessageNotifications />
        <GlobalPttOverlay />
      </div>
    </AdminPttProvider>
  );
}

