import { TRUSTED_CUSTOMER_MARKER, APPROVAL_MODAL_SUPPRESS_MARKER } from "@/lib/constants/orderHelpers";
import type { Order, OrderBusiness, OrderItem, OrderStatus, ApprovalReason } from "./types";

/* ── Status config ─────────────────────────────────────── */

export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string; dot: string }> = {
    AWAITING_APPROVAL: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
    PREPARING: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
    READY: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
    OUT_FOR_DELIVERY: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
    DELIVERED: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
    CANCELLED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
};

export const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
    AWAITING_APPROVAL: null,
    PENDING: "PREPARING",
    PREPARING: "READY",
    READY: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
    DELIVERED: null,
    CANCELLED: null,
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
    AWAITING_APPROVAL: "Awaiting Approval",
    PENDING: "Pending",
    PREPARING: "Preparing",
    READY: "Ready",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
    dot: STATUS_COLORS[value as OrderStatus].dot,
    textClass: STATUS_COLORS[value as OrderStatus].text,
}));

export const INCIDENT_TAG_LABELS: Record<string, string> = {
    late_prep: "Late Prep",
    driver_delay: "Driver Delay",
    handoff_issue: "Handoff Issue",
    customer_issue: "Customer Issue",
    wrong_order: "Wrong Order",
    other: "Other",
};

/* ── Trust / approval helpers ──────────────────────────── */

export function isTrustedCustomer(user?: Order["user"]): boolean {
    if (!user) return false;
    if (user.isTrustedCustomer) return true;
    if ((user.flagColor || "").toLowerCase() === "green") return true;
    return (user.adminNote || "").toUpperCase().includes(TRUSTED_CUSTOMER_MARKER);
}

export function isApprovalModalSuppressed(user?: Order["user"]): boolean {
    if (!user) return false;
    return (user.adminNote || "").toUpperCase().includes(APPROVAL_MODAL_SUPPRESS_MARKER);
}

export function upsertTrustMarker(note?: string | null): string {
    const cleaned = String(note || "").replace(TRUSTED_CUSTOMER_MARKER, "").trim();
    return cleaned ? `${TRUSTED_CUSTOMER_MARKER}\n${cleaned}` : TRUSTED_CUSTOMER_MARKER;
}

export function removeTrustMarker(note?: string | null): string | null {
    const cleaned = String(note || "").replace(TRUSTED_CUSTOMER_MARKER, "").trim();
    return cleaned || null;
}

export function upsertApprovalModalSuppressMarker(note?: string | null): string {
    const cleaned = String(note || "").replace(APPROVAL_MODAL_SUPPRESS_MARKER, "").trim();
    return cleaned ? `${APPROVAL_MODAL_SUPPRESS_MARKER}\n${cleaned}` : APPROVAL_MODAL_SUPPRESS_MARKER;
}

export function removeApprovalModalSuppressMarker(note?: string | null): string | null {
    const cleaned = String(note || "").replace(APPROVAL_MODAL_SUPPRESS_MARKER, "").trim();
    return cleaned || null;
}

export function deriveApprovalReasons(
    order?: Pick<Order, "approvalReasons" | "locationFlagged" | "needsApproval" | "totalPrice"> | null,
): ApprovalReason[] {
    if (!order) return [];
    const normalized = new Set<ApprovalReason>();
    for (const reason of order.approvalReasons ?? []) {
        if (reason === "FIRST_ORDER" || reason === "HIGH_VALUE" || reason === "OUT_OF_ZONE") {
            normalized.add(reason);
        }
    }
    if (order.locationFlagged) normalized.add("OUT_OF_ZONE");
    if (order.needsApproval && normalized.size === 0 && Number(order.totalPrice || 0) > 20) {
        normalized.add("HIGH_VALUE");
    }
    return Array.from(normalized);
}

export function parseAdminNote(adminNote?: string | null): { tag: string; note: string } | null {
    if (!adminNote) return null;
    try {
        const p = JSON.parse(adminNote);
        if (p && typeof p === "object" && (p.tag || p.note)) return { tag: p.tag || "", note: p.note || "" };
    } catch {}
    return null;
}

export const normalizeOrderBusinesses = (order: Pick<Order, 'businesses'> | null | undefined): OrderBusiness[] => {
    if (!Array.isArray(order?.businesses)) return [];
    return order.businesses.map((biz) => ({
        ...biz,
        items: Array.isArray(biz?.items) ? biz.items : [],
    }));
};

export const getOrderBusinessesSafe = (order: Pick<Order, 'businesses'> | null | undefined): OrderBusiness[] =>
    Array.isArray(order?.businesses) ? order.businesses : [];

export const getBusinessItemsSafe = (business: Partial<OrderBusiness> | null | undefined): OrderItem[] =>
    Array.isArray(business?.items) ? business.items : [];

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** How many seconds since a given ISO date string. Returns 0 if in future. */
export function secondsSince(isoDate: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
}

/** Format elapsed time as "5m", "1h 3m", etc. */
export function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

/** Returns urgency color classes based on age for active orders. */
export function elapsedUrgency(seconds: number): { textClass: string; bgClass: string; borderClass: string } {
    if (seconds < 5 * 60) return { textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/30" };
    if (seconds < 12 * 60) return { textClass: "text-amber-400", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/30" };
    return { textClass: "text-rose-400", bgClass: "bg-rose-500/10", borderClass: "border-rose-500/30" };
}
