"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger";
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-all";

  const variants: Record<string, string> = {
    primary: "bg-purple-600 hover:bg-purple-700 text-white",
    outline:
      "border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

