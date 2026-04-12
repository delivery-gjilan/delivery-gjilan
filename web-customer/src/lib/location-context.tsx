"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface LocationContextType {
    location: { latitude: number; longitude: number } | null;
    locationError: string | null;
    locationLoading: boolean;
    requestLocation: () => void;
    hasRequestedPermission: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by this browser");
            return;
        }

        setLocationLoading(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                setLocationLoading(false);
                setHasRequestedPermission(true);
            },
            (error) => {
                let errorMessage = "Unable to retrieve your location";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied by user";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out";
                        break;
                }
                setLocationError(errorMessage);
                setLocationLoading(false);
                setHasRequestedPermission(true);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            }
        );
    }, []);

    // Request location permission when the app loads (only once per session)
    // Note: This is currently disabled to avoid interfering with authentication
    // Call requestLocation() manually from components when needed
    useEffect(() => {
        // Location request disabled for now to prevent auth issues
        // Uncomment below if you want automatic location requests:
        /*
        const timer = setTimeout(() => {
            const hasRequestedBefore = localStorage.getItem("locationPermissionRequested");
            if (!hasRequestedBefore) {
                requestLocation();
                localStorage.setItem("locationPermissionRequested", "true");
            }
        }, 2000);
        return () => clearTimeout(timer);
        */
    }, [requestLocation]);

    const value: LocationContextType = {
        location,
        locationError,
        locationLoading,
        requestLocation,
        hasRequestedPermission,
    };

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
}