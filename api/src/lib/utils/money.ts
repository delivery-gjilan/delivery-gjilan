export function roundMoney(value: number, decimals = 2): number {
    if (!Number.isFinite(value)) return value;
    const factor = 10 ** decimals;
    // EPSILON helps with cases like 1.005
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeMoney(value: number, decimals = 2): number {
    return roundMoney(Number(value), decimals);
}

export function moneyEquals(a: number, b: number, tolerance = 0.01): boolean {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    // Compare normalized values first (strict 2dp semantics), then allow a tiny tolerance.
    const na = normalizeMoney(a);
    const nb = normalizeMoney(b);
    if (na === nb) return true;
    return Math.abs(na - nb) <= tolerance;
}

export function applyPercentageDiscount(amount: number, percentage: number): number {
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct <= 0) return normalizeMoney(amount);
    return normalizeMoney(amount * (1 - pct / 100));
}

export function sumMoney(values: number[]): number {
    // Normalize each component then normalize the sum.
    const total = values.reduce((acc, v) => acc + normalizeMoney(v), 0);
    return normalizeMoney(total);
}
