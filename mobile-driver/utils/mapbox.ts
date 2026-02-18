export const MAPBOX_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    '';

// In-memory counter for Mapbox Directions API calls (per app runtime)
let directionsApiCallCount = 0;
export function getDirectionsApiCallCount() {
    return directionsApiCallCount;
}
interface DirectionsResponse {
    routes: Array<{
        distance: number; // in meters
        duration: number; // in seconds
        legs?: Array<{
            steps?: Array<{
                distance: number;
                duration: number;
                maneuver: {
                    instruction?: string;
                    type?: string;
                    modifier?: string;
                    location: [number, number];
                };
            }>;
        }>;
        geometry?: {
            coordinates: Array<[number, number]>;
        };
    }>;
}

export interface NavigationStep {
    instruction: string;
    distanceM: number;
    durationS: number;
    maneuverType?: string;
    maneuverModifier?: string;
    maneuverLocation: [number, number];
}

/**
 * Calculate route distance between two coordinates using Mapbox Directions API
 * @param from - Starting coordinates { longitude, latitude }
 * @param to - Destination coordinates { longitude, latitude }
 * @returns Distance in kilometers and duration in minutes, or null if failed
 */
export async function calculateRouteDistance(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number }
): Promise<{ distanceKm: number; durationMin: number } | null> {
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
        // Count Directions API call
        directionsApiCallCount++;
        console.log('[MAPBOX] Directions API calls:', directionsApiCallCount, 'function=calculateRouteDistance');

        const response = await fetch(url);
        if (!response.ok) {
            console.error('Mapbox Directions API error:', response.statusText);
            return null;
        }

        const data: DirectionsResponse = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            console.error('No route found');
            return null;
        }

        const route = data.routes[0];
        if (!route) {
            console.error('No primary route found');
            return null;
        }

        return {
            distanceKm: route.distance / 1000, // Convert meters to kilometers
            durationMin: route.duration / 60,   // Convert seconds to minutes
        };
    } catch (error) {
        console.error('Error calculating route distance:', error);
        return null;
    }
}

export async function fetchRouteGeometry(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number }
): Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
} | null> {
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
        // Count Directions API call
        directionsApiCallCount++;
        console.log('[MAPBOX] Directions API calls:', directionsApiCallCount, 'function=fetchRouteGeometry');

        const response = await fetch(url);
        if (!response.ok) {
            console.error('Mapbox Directions API error:', response.statusText);
            return null;
        }

        const data: DirectionsResponse = await response.json();
        if (!data.routes || data.routes.length === 0) {
            console.error('No route found');
            return null;
        }

        const route = data.routes[0];
        if (!route) {
            console.error('No primary route found');
            return null;
        }

        const coords = route.geometry?.coordinates || [];

        return {
            coordinates: coords,
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
        };
    } catch (error) {
        console.error('Error fetching route geometry:', error);
        return null;
    }
}

export async function fetchNavigationRoute(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
    waypoints: Array<{ longitude: number; latitude: number }> = []
): Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
    steps: NavigationStep[];
} | null> {
    try {
        const points = [from, ...waypoints, to]
            .map((point) => `${point.longitude},${point.latitude}`)
            .join(';');

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${points}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&language=en`;
        // Count Directions API call
        directionsApiCallCount++;
        console.log('[MAPBOX] Directions API calls:', directionsApiCallCount, 'function=fetchNavigationRoute');

        const response = await fetch(url);
        if (!response.ok) {
            console.error('Mapbox Directions API error:', response.statusText);
            return null;
        }

        const data: DirectionsResponse = await response.json();
        if (!data.routes || data.routes.length === 0) {
            console.error('No navigation route found');
            return null;
        }

        const route = data.routes[0];
        if (!route) {
            console.error('No primary navigation route found');
            return null;
        }

        const coords = route.geometry?.coordinates || [];
        const steps: NavigationStep[] = (route.legs || []).flatMap((leg) =>
            (leg.steps || []).map((step) => ({
                instruction: step.maneuver.instruction || 'Continue straight',
                distanceM: step.distance,
                durationS: step.duration,
                maneuverType: step.maneuver.type,
                maneuverModifier: step.maneuver.modifier,
                maneuverLocation: step.maneuver.location,
            })),
        );

        return {
            coordinates: coords,
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
            steps,
        };
    } catch (error) {
        console.error('Error fetching navigation route:', error);
        return null;
    }
}
