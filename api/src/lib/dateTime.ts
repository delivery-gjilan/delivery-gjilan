export function parseDbTimestamp(value: string | Date | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const trimmed = value.trim();
    const withT = trimmed.includes(' ') && !trimmed.includes('T')
        ? trimmed.replace(' ', 'T')
        : trimmed;

    let normalized = withT
        .replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
        .replace(/([+-]\d{2})$/, '$1:00');

    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalized);
    if (!hasTimezone) {
        normalized = `${normalized}Z`;
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed;
    }

    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}
