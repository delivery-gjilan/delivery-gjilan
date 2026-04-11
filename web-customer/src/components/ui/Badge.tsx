import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger" | "info";
    className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
    const variants: Record<string, string> = {
        default: "bg-[var(--background-secondary)] text-[var(--foreground-secondary)]",
        success: "bg-[var(--success-light)] text-[var(--success)]",
        warning: "bg-[var(--warning-light)] text-[var(--warning)]",
        danger: "bg-[var(--danger-light)] text-[var(--danger)]",
        info: "bg-[var(--primary-light)] text-[var(--primary)]",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
