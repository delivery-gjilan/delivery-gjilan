// src/app/admin/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading, admin } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!loading && isAuthenticated && admin?.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, admin?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (admin?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-[#09090b]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-5 bg-[#09090b]">
          {children}
        </main>
      </div>
    </div>
  );
}
