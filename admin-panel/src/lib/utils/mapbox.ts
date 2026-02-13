const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface DirectionsResponse {
    routes: Array<{
        distance: number; // in meters
        duration: number; // in seconds
        geometry: {
            coordinates: Array<[number, number]>;
            type: string;
        };
    }>;
}

/**
 * Calculate route distance between two coordinates using Mapbox Directions API
 * @param from - Starting coordinates [longitude, latitude]
 * @param to - Destination coordinates [longitude, latitude]
 * @returns Distance in kilometers, duration in minutes, and polyline coordinates, or null if failed
 */
export async function calculateRouteDistance(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number }
): Promise<{ distanceKm: number; durationMin: number; geometry: Array<[number, number]> } | null> {
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
        
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
            geometry: route.geometry.coordinates, // Polyline coordinates
        };
    } catch (error) {
        console.error('Error calculating route distance:', error);
        return null;
    }
}
