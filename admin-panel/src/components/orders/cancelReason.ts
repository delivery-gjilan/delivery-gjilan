export type CancelReasonCategory =
    | "CUSTOMER_REQUEST"
    | "BUSINESS_ISSUE"
    | "DRIVER_ISSUE"
    | "LOGISTICS"
    | "SYSTEM";

export const CANCEL_REASON_CATEGORY_LABELS: Record<CancelReasonCategory, string> = {
    CUSTOMER_REQUEST: "Customer",
    BUSINESS_ISSUE: "Business",
    DRIVER_ISSUE: "Driver",
    LOGISTICS: "Logistics",
    SYSTEM: "System",
};

const CATEGORY_SET = new Set<CancelReasonCategory>([
    "CUSTOMER_REQUEST",
    "BUSINESS_ISSUE",
    "DRIVER_ISSUE",
    "LOGISTICS",
    "SYSTEM",
]);

export function isCancelReasonCategory(value: string): value is CancelReasonCategory {
    return CATEGORY_SET.has(value as CancelReasonCategory);
}

export function composeTaggedCancellationReason(
    category: CancelReasonCategory | null,
    reason: string,
): string {
    const trimmed = reason.trim();
    if (!trimmed) return "";
    return category ? `[${category}] ${trimmed}` : trimmed;
}

export function parseTaggedCancellationReason(reason: string | null | undefined): {
    category: CancelReasonCategory | null;
    reasonText: string;
} {
    const raw = (reason ?? "").trim();
    if (!raw) {
        return { category: null, reasonText: "" };
    }

    const match = raw.match(/^\[([A-Z_]+)\]\s*(.*)$/);
    if (!match) {
        return { category: null, reasonText: raw };
    }

    const candidate = match[1];
    const reasonText = (match[2] ?? "").trim();
    if (!isCancelReasonCategory(candidate)) {
        return { category: null, reasonText: raw };
    }

    return {
        category: candidate,
        reasonText: reasonText || raw,
    };
}

export function getCancelReasonBadgeClass(category: CancelReasonCategory): string {
    switch (category) {
        case "CUSTOMER_REQUEST":
            return "bg-blue-500/15 border-blue-500/35 text-blue-300";
        case "BUSINESS_ISSUE":
            return "bg-amber-500/15 border-amber-500/35 text-amber-300";
        case "DRIVER_ISSUE":
            return "bg-violet-500/15 border-violet-500/35 text-violet-300";
        case "LOGISTICS":
            return "bg-cyan-500/15 border-cyan-500/35 text-cyan-300";
        case "SYSTEM":
            return "bg-zinc-500/15 border-zinc-500/35 text-zinc-300";
        default:
            return "bg-zinc-500/15 border-zinc-500/35 text-zinc-300";
    }
}
