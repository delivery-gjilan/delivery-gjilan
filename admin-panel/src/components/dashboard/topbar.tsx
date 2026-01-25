// src/components/dashboard/Topbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import { LogOut, Shield, Briefcase } from "lucide-react";

export default function Topbar() {
  const router = useRouter();
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // TODO: Replace with actual role from auth context
  const role = "SUPER_ADMIN"; // or "BUSINESS_ADMIN"

  return (
    <header className="h-14 bg-[#0a0a0a] border-b border-[#262626] flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-[#262626] rounded-lg">
          {role === "SUPER_ADMIN" ? (
            <>
              <Shield size={16} className="text-cyan-500" />
              <span className="text-sm font-medium text-white">Super Admin</span>
            </>
          ) : (
            <>
              <Briefcase size={16} className="text-neutral-400" />
              <span className="text-sm font-medium text-white">Business Admin</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-400">
          {admin?.email || "Loading..."}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}

