"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardHome() {
  const router = useRouter();
  const { admin } = useAuth();
  const isBusinessUser = admin?.role === "BUSINESS_OWNER" || admin?.role === "BUSINESS_EMPLOYEE";

  useEffect(() => {
    router.replace(isBusinessUser ? "/dashboard/statistics" : "/dashboard/orders");
  }, [isBusinessUser, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-neutral-400">
        Redirecting to {isBusinessUser ? "Statistics" : "Orders"}...
      </div>
    </div>
  );
}
