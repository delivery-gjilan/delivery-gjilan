"use client";

import { SelectHTMLAttributes } from "react";

export default function Select({ children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition ${className}`}
    >
      {children}
    </select>
  );
}

