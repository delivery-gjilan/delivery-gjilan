import { useQuery } from '@apollo/client/react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { isPointInPolygon } from '@/utils/pointInPolygon';
import { GET_SERVICE_ZONES } from '@/graphql/operations/serviceZone';

export type ServiceZoneStatus = 'loading' | 'inside' | 'outside' | 'unconfigured';

/**
 * Checks whether the user's physical GPS location is within any configured
 * service zone. Supports multiple zones (e.g. city centre + remote hotspots).
 * If no service zones are configured, or GPS is unavailable, returns
 * 'unconfigured' (no block). This intentionally uses GPS — not the persisted
 * delivery store location — so the check is always fresh on every app launch.
 */
export function useServiceZoneCheck(): ServiceZoneStatus {
    const { location: gpsLocation, isLoading: gpsLoading, permissionStatus } = useUserLocation();
    const { data, loading, error } = useQuery(GET_SERVICE_ZONES, {
        fetchPolicy: 'cache-and-network',
    });

    // Still waiting on GPS or zones
    if ((gpsLoading && !gpsLocation) || (loading && !data)) return 'loading';

    // GPS not granted — don't block anyone
    if (permissionStatus && permissionStatus !== 'granted') return 'unconfigured';

    // If query errored and we have no data, don't block anyone
    if (error && !data) return 'unconfigured';

    const zones = data?.deliveryZones ?? [];

    // No service zones configured — don't block anyone
    if (zones.length === 0) return 'unconfigured';

    // Filter to only active zones
    const activeZones = zones.filter((z) => z.isActive);
    if (activeZones.length === 0) return 'unconfigured';

    // GPS not yet resolved — give benefit of the doubt
    if (!gpsLocation) return 'inside';

    const point = { lat: gpsLocation.latitude, lng: gpsLocation.longitude };
    const insideAny = activeZones.some((zone) =>
        isPointInPolygon(point, zone.polygon as Array<{ lat: number; lng: number }>)
    );

    return insideAny ? 'inside' : 'outside';
}
