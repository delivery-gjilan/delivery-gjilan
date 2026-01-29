"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base = "rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants: Record<string, string> = {
    primary: "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm",
    outline: "border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm",
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

