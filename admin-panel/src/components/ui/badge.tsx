"use client";

import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "danger" | "warning" | "outline" | "destructive";
}

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors";

  const variants: Record<string, string> = {
    default: "bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
    secondary: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700",
    success: "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20",
    destructive: "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
    outline: "bg-transparent text-zinc-400 border-zinc-700 hover:bg-zinc-800/50",
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
