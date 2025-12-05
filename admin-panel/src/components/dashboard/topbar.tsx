// src/components/dashboard/Topbar.tsx
"use client";

export default function Topbar() {
  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shadow-sm">
      <h2 className="text-lg font-semibold text-white">
        Admin Panel
      </h2>

      <div className="flex items-center gap-3">
        {/* Future: Dark mode toggle, user avatar, etc */}
        <span className="text-sm text-gray-400">
          Logged in as Admin
        </span>
      </div>
    </header>
  );
}

