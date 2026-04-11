import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => {
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                id={id}
                className={cn(
                    "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
                    error && "border-[var(--danger)] focus:ring-[var(--danger)]",
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
    );
});

Input.displayName = "Input";
export { Input };
