// Admin utility helpers — ported from mobile-admin

export function adminFormatCurrency(amount: number): string {
    return `€${amount.toFixed(2)}`;
}

export function adminFormatTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function adminFormatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function adminFormatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

export function adminGetInitials(firstName?: string | null, lastName?: string | null): string {
    if (!firstName && !lastName) return '?';
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return `${f}${l}`.trim() || '?';
}

export const ADMIN_ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#6366f1',
    READY: '#22c55e',
    OUT_FOR_DELIVERY: '#3b82f6',
    DELIVERED: '#10b981',
    CANCELLED: '#ef4444',
};

export const ADMIN_ORDER_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Delivering',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

export const GJILAN_CENTER = { latitude: 42.4604, longitude: 21.4694 };
export const GJILAN_BOUNDS = {
    northEast: { latitude: 42.55, longitude: 21.58 },
    southWest: { latitude: 42.36, longitude: 21.35 },
};
