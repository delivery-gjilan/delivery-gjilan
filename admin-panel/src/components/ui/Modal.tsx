"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#262626] rounded-xl w-full max-w-2xl my-8 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#161616] z-10 pb-4 border-b border-[#262626]">
          <h2 className="text-white text-xl font-semibold">{title}</h2>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
          {children}
        </div>
      </div>
    </div>
  );
}
