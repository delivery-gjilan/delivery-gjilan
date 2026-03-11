"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger" | "success" | "default" | "destructive" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "default" | "icon";
}

function ButtonComponent({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-sm gap-2",
    default: "px-3.5 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-sm gap-2",
    icon: "h-10 w-10",
  };

  const variants: Record<string, string> = {
    primary: "bg-violet-600 hover:bg-violet-500 text-white",
    default: "bg-violet-600 hover:bg-violet-500 text-white",
    outline: "border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/50",
    danger: "bg-red-600/90 hover:bg-red-500 text-white",
    destructive: "bg-red-600/90 hover:bg-red-500 text-white",
    success: "bg-emerald-600/90 hover:bg-emerald-500 text-white",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200",
    link: "text-violet-400 underline-offset-4 hover:underline",
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Named export
export { ButtonComponent as Button };
// Default export for backward compatibility
export default ButtonComponent;

