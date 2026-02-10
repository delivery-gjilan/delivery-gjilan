const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXJ0c2hhYmFuaTIwMDIiLCJhIjoiY21sZjlkbTNxMDIwOTNkc2F0cTZkYmZoeiJ9.C81uu49ST5NrfHZ58N9EXg';

interface DirectionsResponse {
    routes: Array<{
        distance: number; // in meters
        duration: number; // in seconds
        geometry?: {
            coordinates: Array<[number, number]>;
        };
    }>;
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
    coordinates: Array<{ latitude: number; longitude: number }>;
    distanceKm: number;
    durationMin: number;
} | null> {
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
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
        const coords = route.geometry?.coordinates || [];
        const mapped = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

        return {
            coordinates: mapped,
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
        };
    } catch (error) {
        console.error('Error fetching route geometry:', error);
        return null;
    }
}
