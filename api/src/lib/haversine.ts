import logger from '@/lib/logger';

const log = logger.child({ module: 'mapbox' });

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';

interface MapboxDirectionsResponse {
    routes: Array<{
        distance: number; // metres
        duration: number; // seconds
    }>;
}

/**
 * Calculate the driving distance in km between two coordinates using the
 * Mapbox Directions API.  Falls back to Haversine (straight-line) if the
 * API call fails or no token is configured.
 */
export async function calculateDrivingDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): Promise<{ distanceKm: number; durationMin: number }> {
    if (!MAPBOX_TOKEN) {
        log.warn('MAPBOX_TOKEN not set — falling back to straight-line distance');
        return { distanceKm: haversineDistanceKm(lat1, lng1, lat2, lng2), durationMin: 0 };
    }

    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng1},${lat1};${lng2},${lat2}?access_token=${MAPBOX_TOKEN}&overview=false`;
        const res = await fetch(url);

        if (!res.ok) {
            log.error({ status: res.status, statusText: res.statusText }, 'Mapbox Directions API error');
            return { distanceKm: haversineDistanceKm(lat1, lng1, lat2, lng2), durationMin: 0 };
        }

        const data: MapboxDirectionsResponse = await res.json();

        if (!data.routes || data.routes.length === 0) {
            log.warn('Mapbox returned no routes — falling back to straight-line distance');
            return { distanceKm: haversineDistanceKm(lat1, lng1, lat2, lng2), durationMin: 0 };
        }

        const route = data.routes[0]!;
        return {
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
        };
    } catch (err) {
        log.error({ err }, 'Failed to call Mapbox Directions API');
        return { distanceKm: haversineDistanceKm(lat1, lng1, lat2, lng2), durationMin: 0 };
    }
}

/**
 * Haversine formula — straight-line fallback.
 */
function haversineDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
