'use client';

import { useEffect, useRef, useState } from 'react';
import { calculateRouteDistance } from '@/lib/utils/mapbox';

const ROUTE_RECALC_MIN_MS = 60000;
const ROUTE_RECALC_MIN_METERS = 80;

type RoutePoint = { latitude: number; longitude: number };
type RouteResult = NonNullable<Awaited<ReturnType<typeof calculateRouteDistance>>>;

type DriverLocationCarrier = {
    driverLocation?: RoutePoint | null;
};

type RouteOrder = {
    id: string;
    status: string;
    driver?: ({ id: string } & DriverLocationCarrier) | null;
    dropOffLocation?: RoutePoint | null;
    businesses?: Array<{
        business?: {
            location?: RoutePoint | null;
        } | null;
    }> | null;
};

type OrderRouteDistance = {
    toPickup?: RouteResult;
    toDropoff?: RouteResult;
    driverId: string | null;
    status: string;
    calculatedAtMs: number;
};

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function useOrderRouteDistances(activeOrders: RouteOrder[], driverMap: Record<string, DriverLocationCarrier | undefined>) {
    const [orderDistances, setOrderDistances] = useState<Record<string, OrderRouteDistance>>({});
    const lastRouteCalcRef = useRef<Record<string, { timestamp: number; latitude: number; longitude: number }>>({});

    const shouldRecalculateRoute = (orderId: string, driverPos: { latitude: number; longitude: number }) => {
        const prev = lastRouteCalcRef.current[orderId];
        const now = Date.now();
        if (!prev) {
            lastRouteCalcRef.current[orderId] = {
                timestamp: now,
                latitude: driverPos.latitude,
                longitude: driverPos.longitude,
            };
            return true;
        }

        const elapsed = now - prev.timestamp;
        const moved = haversineMeters(prev, driverPos);
        if (elapsed < ROUTE_RECALC_MIN_MS && moved < ROUTE_RECALC_MIN_METERS) {
            return false;
        }

        lastRouteCalcRef.current[orderId] = {
            timestamp: now,
            latitude: driverPos.latitude,
            longitude: driverPos.longitude,
        };
        return true;
    };

    useEffect(() => {
        const abortController = new AbortController();
        let cancelled = false;

        const calculateDistances = async () => {
            const nextDistances: Record<string, OrderRouteDistance> = {};
            for (const order of activeOrders) {
                const cacheKey = `${order.id}-${order.driver?.id || 'none'}-${order.status}`;
                const existingKey = orderDistances[order.id]
                    ? `${order.id}-${orderDistances[order.id].driverId || 'none'}-${orderDistances[order.id].status}`
                    : null;

                const firstBusiness = order.businesses?.[0]?.business;
                if (!firstBusiness?.location || !order.dropOffLocation) continue;
                const pickup = {
                    longitude: firstBusiness.location.longitude,
                    latitude: firstBusiness.location.latitude,
                };
                const dropoff = {
                    longitude: order.dropOffLocation.longitude,
                    latitude: order.dropOffLocation.latitude,
                };

                try {
                    if ((order.status === 'READY' || order.status === 'PENDING') && order.driver) {
                        const driver = driverMap[order.driver.id];
                        const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
                        if (!driverLocation) continue;
                        const driverPos = { longitude: driverLocation.longitude, latitude: driverLocation.latitude };

                        const shouldRecalc = shouldRecalculateRoute(order.id, driverPos);
                        if (existingKey === cacheKey && !shouldRecalc) continue;
                        if (!shouldRecalc) continue;

                        const [toPickupRoute, toDropoffRoute] = await Promise.all([
                            calculateRouteDistance(driverPos, pickup, abortController.signal),
                            calculateRouteDistance(pickup, dropoff, abortController.signal),
                        ]);
                        if (toPickupRoute && toDropoffRoute) {
                            nextDistances[order.id] = {
                                toPickup: toPickupRoute,
                                toDropoff: toDropoffRoute,
                                driverId: order.driver.id,
                                status: order.status,
                                calculatedAtMs: Date.now(),
                            };
                        }
                    } else if (order.status === 'OUT_FOR_DELIVERY' && order.driver) {
                        const driver = driverMap[order.driver.id];
                        const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
                        if (!driverLocation) continue;
                        const driverPos = { longitude: driverLocation.longitude, latitude: driverLocation.latitude };

                        const shouldRecalc = shouldRecalculateRoute(order.id, driverPos);
                        if (existingKey === cacheKey && !shouldRecalc) continue;
                        if (!shouldRecalc) continue;

                        const toDropoffRoute = await calculateRouteDistance(driverPos, dropoff, abortController.signal);
                        if (toDropoffRoute) {
                            nextDistances[order.id] = {
                                toDropoff: toDropoffRoute,
                                driverId: order.driver.id,
                                status: order.status,
                                calculatedAtMs: Date.now(),
                            };
                        }
                    } else if (!order.driver) {
                        if (existingKey === cacheKey && orderDistances[order.id]) continue;
                        const route = await calculateRouteDistance(pickup, dropoff, abortController.signal);
                        if (route) {
                            nextDistances[order.id] = {
                                toDropoff: route,
                                driverId: null,
                                status: order.status,
                                calculatedAtMs: Date.now(),
                            };
                        }
                    }
                } catch {
                    // Keep map resilient when directions provider fails.
                }
            }

            if (!cancelled && Object.keys(nextDistances).length > 0) {
                setOrderDistances((prev) => ({ ...prev, ...nextDistances }));
            }
        };

        calculateDistances();

        return () => {
            cancelled = true;
            abortController.abort();
        };
    }, [activeOrders.map((order) => `${order.id}-${order.driver?.id || 'none'}-${order.status}`).join(','), driverMap]);

    return { orderDistances };
}
