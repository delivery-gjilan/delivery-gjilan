import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@apollo/client/react';
import { GET_ORDER } from '@/graphql/operations/orders';
import { fetchRouteGeometry } from '@/utils/mapbox';
import { useTheme } from '@/hooks/useTheme';

const FALLBACK_REGION: Region = {
    latitude: 42.4635,
    longitude: 21.4694,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};

export default function OrderMapScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const { data, loading } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !orderId,
    });

    const mapRef = useRef<MapView | null>(null);
    const [driverLocation, setDriverLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [legToPickup, setLegToPickup] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [legToDropoff, setLegToDropoff] = useState<Array<{ latitude: number; longitude: number }>>([]);
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

    const order = data?.order;
    const pickup = useMemo(() => {
        const biz = order?.businesses?.[0]?.business;
        if (!biz?.location) return null;
        return {
            latitude: Number(biz.location.latitude),
            longitude: Number(biz.location.longitude),
        };
    }, [order]);

    const dropoff = useMemo(() => {
        const drop = order?.dropOffLocation;
        if (!drop) return null;
        return {
            latitude: Number(drop.latitude),
            longitude: Number(drop.longitude),
        };
    }, [order]);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        let active = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000,
                    distanceInterval: 15,
                },
                (location) => {
                    if (!active) return;
                    setDriverLocation(location.coords);
                },
            );
        })();

        return () => {
            active = false;
            subscription?.remove();
            subscription = null;
        };
    }, []);

    useEffect(() => {
        if (!driverLocation || !pickup || !dropoff) return;

        const driverCoords = {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
        };

        Promise.all([
            fetchRouteGeometry(driverCoords, pickup),
            fetchRouteGeometry(pickup, dropoff),
        ]).then(([toPickup, toDropoff]) => {
            if (toPickup) {
                setLegToPickup(toPickup.coordinates);
            }
            if (toDropoff) {
                setLegToDropoff(toDropoff.coordinates);
            }

            if (toPickup || toDropoff) {
                const total = (toPickup?.durationMin || 0) + (toDropoff?.durationMin || 0);
                setEtaMinutes(Math.round(total));
            }
        });
    }, [driverLocation, pickup, dropoff]);

    useEffect(() => {
        if (!mapRef.current) return;
        if (!driverLocation && !pickup && !dropoff) return;

        const points = [
            driverLocation ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude } : null,
            pickup,
            dropoff,
        ].filter(Boolean) as Array<{ latitude: number; longitude: number }>;

        if (points.length === 0) return;

        mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 80, right: 80, bottom: 140, left: 80 },
            animated: true,
        });
    }, [driverLocation, pickup, dropoff]);

    useEffect(() => {
        if (!mapRef.current || !driverLocation) return;
        mapRef.current.animateToRegion(
            {
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            600,
        );
    }, [driverLocation]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-row items-center justify-between px-4 py-3">
                <Pressable onPress={() => router.back()} className="px-3 py-2 rounded-full" style={{ backgroundColor: theme.colors.card }}>
                    <Text style={{ color: theme.colors.text }}>Back</Text>
                </Pressable>
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                    Order Map
                </Text>
                <View className="w-12" />
            </View>

            <View className="flex-1">
                <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    initialRegion={FALLBACK_REGION}
                    showsUserLocation={false}
                    followsUserLocation={false}
                >
                    {driverLocation && (
                        <Marker
                            coordinate={{
                                latitude: driverLocation.latitude,
                                longitude: driverLocation.longitude,
                            }}
                            title="Driver"
                            pinColor="#22c55e"
                        />
                    )}

                    {pickup && (
                        <Marker
                            coordinate={pickup}
                            title="Pickup"
                            pinColor="#f97316"
                        />
                    )}

                    {dropoff && (
                        <Marker
                            coordinate={dropoff}
                            title="Dropoff"
                            pinColor="#ef4444"
                        />
                    )}

                    {legToPickup.length > 0 && (
                        <Polyline
                            coordinates={legToPickup}
                            strokeColor="#38bdf8"
                            strokeWidth={4}
                        />
                    )}

                    {legToDropoff.length > 0 && (
                        <Polyline
                            coordinates={legToDropoff}
                            strokeColor="#f59e0b"
                            strokeWidth={4}
                        />
                    )}
                </MapView>

                <View className="absolute left-4 right-4 bottom-6 rounded-2xl p-4" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                        ETA
                    </Text>
                    <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                        {etaMinutes !== null ? `${etaMinutes} min` : 'Calculating...'}
                    </Text>
                    {order?.dropOffLocation?.address && (
                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                            Dropoff: {order.dropOffLocation.address}
                        </Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}
