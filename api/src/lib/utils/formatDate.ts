export function toISO(date: Date | null | undefined): string {
    return date ? date.toISOString() : '';
}
