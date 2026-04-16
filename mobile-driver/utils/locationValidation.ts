type CoordinateLike = {
    latitude?: number | string | null;
    longitude?: number | string | null;
};

interface CoordinateValidationOptions {
    allowZeroZero?: boolean;
}

export function isValidCoordinatePair(
    latitude: number,
    longitude: number,
    options: CoordinateValidationOptions = {},
): boolean {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
    if (!options.allowZeroZero && latitude === 0 && longitude === 0) return false;
    return true;
}

export function normalizeCoordinate(
    value: CoordinateLike | null | undefined,
    options: CoordinateValidationOptions = {},
): { latitude: number; longitude: number } | null {
    const latitude = Number(value?.latitude);
    const longitude = Number(value?.longitude);
    if (!isValidCoordinatePair(latitude, longitude, options)) return null;
    return { latitude, longitude };
}