/**
 * Ray-casting algorithm to determine if a point lies inside a polygon.
 *
 * Uses the standard odd-even crossing rule: cast a ray from the test point
 * to infinity (along the x-axis) and count how many polygon edges it crosses.
 * If the count is odd, the point is inside.
 *
 * @param point - The test point { lat, lng }
 * @param polygon - Array of { lat, lng } forming the polygon boundary (order matters, last-to-first edge is implicit)
 * @returns true if the point is inside the polygon
 */
export function isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: Array<{ lat: number; lng: number }>,
): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const { lat: y, lng: x } = point;

    const isOnSegment = (
        px: number,
        py: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    ) => {
        const epsilon = 1e-9;
        const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
        if (Math.abs(cross) > epsilon) return false;

        const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
        return dot <= epsilon;
    };

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const yi = polygon[i].lat;
        const xi = polygon[i].lng;
        const yj = polygon[j].lat;
        const xj = polygon[j].lng;

        // Consider boundary points inside to avoid edge flicker near zone borders.
        if (isOnSegment(x, y, xi, yi, xj, yj)) {
            return true;
        }

        const intersects =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}
