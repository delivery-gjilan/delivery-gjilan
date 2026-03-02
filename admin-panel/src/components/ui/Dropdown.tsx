"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
    value: string;
    label: string;
    dot?: string;       // Tailwind bg class for a colored dot, e.g. "bg-green-400"
    textClass?: string;  // Tailwind text class for the label, e.g. "text-green-400"
}

interface DropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export default function Dropdown({
    value,
    onChange,
    options,
    disabled = false,
    className = "",
    placeholder = "Select...",
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 ${
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:border-zinc-700 cursor-pointer"
                }`}
            >
                <span className={`flex items-center gap-2 ${selectedOption ? "" : "text-zinc-500"}`}>
                    {selectedOption?.dot && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dot}`} />
                    )}
                    <span className={selectedOption?.textClass || "text-zinc-100"}>
                        {selectedOption?.label || placeholder}
                    </span>
                </span>
                <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full min-w-[180px] bg-[#111113] border border-zinc-800 rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                                    option.value === value
                                        ? "bg-zinc-800/80"
                                        : "hover:bg-zinc-800/60"
                                }`}
                            >
                                {option.dot && (
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${option.dot}`} />
                                )}
                                <span className={option.textClass || (option.value === value ? "text-zinc-100" : "text-zinc-400")}>
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
