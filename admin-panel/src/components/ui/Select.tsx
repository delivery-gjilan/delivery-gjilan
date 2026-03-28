"use client";

import { SelectHTMLAttributes, createContext, useContext, useEffect, useRef, useState } from "react";
import React from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

function SelectComponent({ label, children, className = "", ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-150 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

// Context-based Select for more advanced usage (shadcn pattern)
interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Record<string, string>;
  registerLabel: (value: string, label: string) => void;
}

const SelectContext = createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
  labels: {},
  registerLabel: () => {},
});

interface ModernSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const registerLabel = (optionValue: string, label: string) => {
    setLabels((prev) => {
      if (prev[optionValue] === label) {
        return prev;
      }
      return { ...prev, [optionValue]: label };
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      const target = event.target as Node;
      if (!rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, labels, registerLabel }}>
      <div ref={rootRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ 
  className = "", 
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4 opacity-50">
        <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor"/>
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useContext(SelectContext);
  const displayValue = value ? labels[value] || value : undefined;
  return <span>{displayValue || placeholder || "Select..."}</span>;
}

export function SelectContent({ 
  className = "", 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useContext(SelectContext);

  if (!open) {
    return null;
  }

  return (
    <div
      role="listbox"
      className={`absolute left-0 top-[calc(100%+0.375rem)] z-[120] min-w-[8rem] w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-md ${className}`}
      {...props}
    >
      <div className="max-h-64 overflow-y-auto p-1">{children}</div>
    </div>
  );
}

export function SelectItem({
  value,
  children,
  className = "",
  ...props
}: {
  value: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { onValueChange, value: selectedValue, setOpen, registerLabel } = useContext(SelectContext);
  const isSelected = value === selectedValue;

  const label = typeof children === "string" ? children : undefined;

  useEffect(() => {
    if (label) {
      registerLabel(value, label);
    }
  }, [label, registerLabel, value]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-zinc-800 focus:bg-zinc-800 ${isSelected ? 'bg-zinc-800' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Default export for backward compatibility
export default SelectComponent;

