/**
 * Ray-casting algorithm to determine if a point lies inside a polygon.
 * Mirrors mobile-customer/utils/pointInPolygon.ts
 */
export function isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: Array<{ lat: number; lng: number }>,
): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const { lat: y, lng: x } = point;

    let j = polygon.length - 1;
    for (let i = 0; i < polygon.length; i++) {
        const xi = polygon[i]!.lng;
        const yi = polygon[i]!.lat;
        const xj = polygon[j]!.lng;
        const yj = polygon[j]!.lat;

        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
        j = i;
    }

    return inside;
}
