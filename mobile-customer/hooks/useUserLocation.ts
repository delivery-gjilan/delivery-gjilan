import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
    latitude: number;
    longitude: number;
    address: string;
}

const formatAddress = (item: Location.LocationGeocodedAddress | null) => {
    if (!item) return '';
    const parts = [item.street, item.name, item.city, item.region, item.postalCode, item.country].filter(Boolean);
    return parts.join(', ');
};

export function useUserLocation() {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(status);

        if (status !== 'granted') {
            setIsLoading(false);
            return;
        }

        let current: Location.LocationObject | null = null;
        try {
            current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
        } catch {
            current = await Location.getLastKnownPositionAsync();
        }

        if (!current) {
            setError('Location unavailable');
            setIsLoading(false);
            return;
        }

        let address = '';
        try {
            const [reverse] = await Location.reverseGeocodeAsync({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
            });
            address = formatAddress(reverse);
        } catch {
            address = '';
        }

        const fallbackAddress = `${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}`;
        setLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            address: address || fallbackAddress,
        });
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let active = true;

        const run = async () => {
            await refresh();
        };

        run().catch(() => {
            if (!active) return;
            setError('Location unavailable');
            setIsLoading(false);
        });

        return () => {
            active = false;
        };
    }, [refresh]);

    return { location, error, isLoading, permissionStatus, refresh };
}
