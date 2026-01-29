"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#262626] rounded-xl w-full max-w-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-semibold">{title}</h2>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
