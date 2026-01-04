import { useMemo } from 'react';

interface UserLocation {
    latitude: number;
    longitude: number;
    address: string;
}

export function useUserLocation() {
    const location = useMemo<UserLocation>(
        () => ({
            latitude: 123123213,
            longitude: 123123123,
            address: 'Test Address',
        }),
        [],
    );

    return { location };
}
