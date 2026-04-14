export function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
}

export function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getTimeRemaining(estimatedReadyAt: string): { text: string; isOverdue: boolean } {
    const now = new Date();
    const ready = new Date(estimatedReadyAt);
    const diffMs = ready.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);
    if (diffMin <= 0) return { text: `${Math.abs(diffMin)}m overdue`, isOverdue: true };
    return { text: `${diffMin}m remaining`, isOverdue: false };
}

export function getElapsedTime(statusChangeDate: string): string {
    const now = new Date();
    const changed = new Date(statusChangeDate);
    const diffMs = now.getTime() - changed.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
