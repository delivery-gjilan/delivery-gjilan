import { useEffect, useState } from 'react';
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

    useEffect(() => {
        let active = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const [reverse] = await Location.reverseGeocodeAsync({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
            });

            if (!active) return;

            setLocation({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
                address: formatAddress(reverse),
            });
        })();

        return () => {
            active = false;
        };
    }, []);

    return { location };
}
