import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useMutation } from '@apollo/client/react';
import { UPDATE_DRIVER_LOCATION } from '@/graphql/operations/driverLocation';
import { useAuthStore } from '@/store/authStore';

const SIMULATE_DRIVER_LOCATION = true;
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
            if (!isAuthenticated || !isOnline) return;
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Required', 'Enable location to show drivers on the map.');
                return;
            }

            try {
                const current = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                await updateDriverLocation({
                    variables: {
                        latitude: current.coords.latitude,
                        longitude: current.coords.longitude,
                    },
                });

                if (__DEV__ && SIMULATE_DRIVER_LOCATION) {
                    const baseLat = current.coords.latitude;
                    const baseLng = current.coords.longitude;

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
                console.warn('[DriverLocation] initial update failed', err);
            }

            subscriptionRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000,
                    distanceInterval: 15,
                },
                (location) => {
                    if (!isActive) return;
                    updateDriverLocation({
                        variables: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        },
                    }).catch((err) => {
                        console.warn('[DriverLocation] update failed', err);
                    });
                },
            );
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
