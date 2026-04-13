import { useAuthStore } from '@/store/authStore';

export const MAPBOX_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
    '';

if (__DEV__ && !process.env.EXPO_PUBLIC_MAPBOX_TOKEN) {
    console.error('[Mapbox] EXPO_PUBLIC_MAPBOX_TOKEN is not set — map will render blank.');
}

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/graphql$/, '');

/**
 * Calculate route distance between two coordinates via backend directions proxy.
 * Returns distance in km, duration in minutes, and polyline coordinates
 */
export async function calculateRouteDistance(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
): Promise<{ distanceKm: number; durationMin: number; geometry: Array<[number, number]> } | null> {
    try {
        const token = useAuthStore.getState().token;
        if (!token) {
            console.warn('No auth token for directions request');
            return null;
        }

        if (!API_BASE) {
            console.warn('EXPO_PUBLIC_API_URL not set');
            return null;
        }

        const points = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
        const url = `${API_BASE}/api/directions?points=${encodeURIComponent(points)}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            console.error('Directions proxy error:', response.statusText);
            return null;
        }

        const data: { distanceKm: number; durationMin: number; geometry: Array<[number, number]> } =
            await response.json();

        if (!data.geometry?.length) {
            console.error('No route found from directions proxy');
            return null;
        }

        return {
            distanceKm: data.distanceKm,
            durationMin: data.durationMin,
            geometry: data.geometry,
        };
    } catch (error) {
        console.error('Error calculating route distance:', error);
        return null;
    }
}

/**
 * Convert Mapbox [lng, lat] coordinates to react-native-maps {latitude, longitude} format
 */
export function toLatLng(geometry: Array<[number, number]>): Array<{ latitude: number; longitude: number }> {
    return geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}
