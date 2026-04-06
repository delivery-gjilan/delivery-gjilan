"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

const SIZE_CLASSES: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-7xl",
};

export default function Modal({
  isOpen,
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  isOpen?: boolean;
  open?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  const visible = isOpen ?? open ?? false;
  if (!visible) return null;

  const maxW = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`bg-[#111113] border border-[#1e1e22] rounded-xl w-full ${maxW} my-8 p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-800/50">
          <h2 className="text-zinc-100 text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition p-1 rounded-md hover:bg-zinc-800/60"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
