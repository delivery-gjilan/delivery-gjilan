import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useMutation } from '@apollo/client/react';
import { UPDATE_DRIVER_LOCATION } from '@/graphql/operations/driverLocation';
import { useAuthStore } from '@/store/authStore';

const SIMULATE_DRIVER_LOCATION = false; // Set to false for real GPS tracking
const SIM_STEP_MS = 5000;
const SIM_RADIUS_METERS = 120;

export function useDriverLocation() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isOnline = useAuthStore((state) => state.isOnline);
    const [updateDriverLocation] = useMutation(UPDATE_DRIVER_LOCATION);
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
    const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const simAngleRef = useRef(0);

    useEffect(() => {
        let isActive = true;

        (async () => {
            console.log('[DriverLocation] useEffect triggered', { isAuthenticated, isOnline });
            
            if (!isAuthenticated) {
                console.log('[DriverLocation] not authenticated, skipping');
                return;
            }
            
            if (!isOnline) {
                console.log('[DriverLocation] not online, skipping location tracking');
                return;
            }
            
            // Request foreground permissions
            try {
                console.log('[DriverLocation] requesting foreground permissions');
                const { status } = await Location.requestForegroundPermissionsAsync();
                console.log('[DriverLocation] foreground permission status:', status);
                if (status !== 'granted') {
                    Alert.alert('Location Required', 'Enable location to show drivers on the map.');
                    return;
                }
            } catch (permErr) {
                console.warn('[DriverLocation] foreground permission error:', permErr);
                return;
            }
            
            // Request background permissions for continuous tracking during deliveries
            // NOTE: Do NOT await this - request it in the background without blocking the location watch
            // In Expo Go, permission requests can cause the app to exit if awaited
            Location.requestBackgroundPermissionsAsync().then((result) => {
                console.log('[DriverLocation] background permission status:', result.status);
                if (result.status !== 'granted') {
                    console.warn('[DriverLocation] Background location not granted - location will stop when app is backgrounded');
                }
            }).catch((bgErr) => {
                console.warn('[DriverLocation] Failed to request background permission:', bgErr);
            });

            try {
                console.log('[DriverLocation] getting current position');
                const current = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                console.log('[DriverLocation] got position', { lat: current.coords.latitude, lng: current.coords.longitude });
                
                const result = await updateDriverLocation({
                    variables: {
                        latitude: current.coords.latitude,
                        longitude: current.coords.longitude,
                    },
                });
                console.log('[DriverLocation] initial location update sent', result);

                if (__DEV__ && SIMULATE_DRIVER_LOCATION) {
                    const baseLat = current.coords.latitude;
                    const baseLng = current.coords.longitude;
                    console.log('[DriverLocation] starting simulation mode');

                    simIntervalRef.current = setInterval(() => {
                        if (!isActive) return;

                        simAngleRef.current += Math.PI / 18;
                        const dx = (SIM_RADIUS_METERS * Math.cos(simAngleRef.current)) / 111320;
                        const dy = (SIM_RADIUS_METERS * Math.sin(simAngleRef.current)) / 111320;

                        updateDriverLocation({
                            variables: {
                                latitude: baseLat + dy,
                                longitude: baseLng + dx,
                            },
                        }).catch((err) => {
                            console.warn('[DriverLocation] sim update failed', err);
                        });
                    }, SIM_STEP_MS);

                    return;
                }
            } catch (err) {
                console.error('[DriverLocation] initial update failed', err);
                return;
            }

            console.log('[DriverLocation] starting position watch');
            subscriptionRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 3000, // Update every 3 seconds
                    distanceInterval: 0, // Update on EVERY location change (no minimum distance)
                },
                (location) => {
                    if (!isActive) return;
                    console.log('[DriverLocation] position update received', { 
                        lat: location.coords.latitude, 
                        lng: location.coords.longitude,
                        timestamp: new Date().toISOString()
                    });
                    updateDriverLocation({
                        variables: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        },
                    }).then((result) => {
                        console.log('[DriverLocation] location mutation succeeded', {
                            updatedAt: (result.data as any)?.updateDriverLocation?.driverLocationUpdatedAt
                        });
                    }).catch((err) => {
                        console.error('[DriverLocation] location mutation FAILED', {
                            message: err.message,
                            errors: err.graphQLErrors?.map((e: any) => e.message),
                            networkError: err.networkError
                        });
                    });
                },
            );
            console.log('[DriverLocation] position watch started');
        })();

        return () => {
            isActive = false;
            subscriptionRef.current?.remove();
            subscriptionRef.current = null;
            if (simIntervalRef.current) {
                clearInterval(simIntervalRef.current);
                simIntervalRef.current = null;
            }
        };
    }, [isAuthenticated, isOnline, updateDriverLocation]);
}
