"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/orders");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-neutral-400">Redirecting to Orders...</div>
    </div>
  );
}
