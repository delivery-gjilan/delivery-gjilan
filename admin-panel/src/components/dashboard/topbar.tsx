// src/components/dashboard/Topbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const router = useRouter();
  const { admin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shadow-sm">
      <h2 className="text-lg font-semibold text-white">
        Admin Panel
      </h2>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          {admin?.email || "Loading..."}
        </span>
        <Button
          variant="outline"
          className="text-xs px-3 py-2"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </header>
  );
}

