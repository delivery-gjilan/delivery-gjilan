"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { Home, Store } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "mapbox://styles/mapbox/dark-v11";

/* ── Gjilan City Bounds ─────────────────────────────────────── */
const GJILAN_BOUNDS: [[number, number], [number, number]] = [
    [21.40, 42.40], // southwest
    [21.54, 42.52], // northeast
];

/* ── Cinematic Camera Constants ─────────────────────────────── */
const CAMERA_APPROACH_NEAR_M = 400;
const CAMERA_APPROACH_CLOSE_M = 150;
const CAMERA_APPROACH_ARRIVAL_M = 80;

interface LatLng { latitude: number; longitude: number; }

interface OrderTrackingMapProps {
    dropoff: LatLng | null;
    pickup?: LatLng | null;
    driverLocation?: LatLng | null;
    driver?: { firstName?: string | null; lastName?: string | null; imageUrl?: string | null } | null;
    businessImageUrl?: string | null;
    orderStatus?: string;
    interactive?: boolean;
    className?: string;
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
    const a = (firstName ?? "").trim().charAt(0).toUpperCase();
    const b = (lastName ?? "").trim().charAt(0).toUpperCase();
    return (a + b).trim() || "?";
}

function calcBearing(from: LatLng, to: LatLng): number {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversineDistanceM(a: LatLng, b: LatLng): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLng * sinDLng;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function useAnimatedLatLng(lat: number | null | undefined, lng: number | null | undefined) {
    const [pos, setPos] = useState<LatLng | null>(
        lat != null && lng != null ? { latitude: lat, longitude: lng } : null
    );
    const posRef = useRef<LatLng | null>(null);
    const targetRef = useRef<LatLng | null>(null);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<{ from: LatLng; startMs: number } | null>(null);

    useEffect(() => {
        if (lat == null || lng == null) return;
        const target: LatLng = { latitude: lat, longitude: lng };
        targetRef.current = target;

        if (!posRef.current) {
            posRef.current = target;
            setPos(target);
            return;
        }

        const dist = Math.hypot(
            target.latitude - posRef.current.latitude,
            target.longitude - posRef.current.longitude
        );
        if (dist > 0.01) {
            posRef.current = target;
            setPos(target);
            return;
        }

        startRef.current = { from: { ...posRef.current }, startMs: performance.now() };
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        const DURATION = 900;
        const tick = () => {
            if (!startRef.current) return;
            const t = Math.min((performance.now() - startRef.current.startMs) / DURATION, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const to = targetRef.current!;
            const from = startRef.current.from;
            const curr: LatLng = {
                latitude: from.latitude + (to.latitude - from.latitude) * eased,
                longitude: from.longitude + (to.longitude - from.longitude) * eased,
            };
            posRef.current = curr;
            setPos({ ...curr });
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [lat, lng]);

    return pos;
}

export default function OrderTrackingMap({
    dropoff,
    pickup,
    driverLocation,
    driver,
    businessImageUrl,
    orderStatus,
    interactive = true,
    className,
}: OrderTrackingMapProps) {
    const mapRef = useRef<MapRef>(null);
    const animDriver = useAnimatedLatLng(driverLocation?.latitude, driverLocation?.longitude);
    const hasIntroFiredRef = useRef(false);
    const approachStageRef = useRef(0);
    const lastApproachCheckRef = useRef(0);
    const focusedStatusKeyRef = useRef<string | null>(null);

    const isDeliveryPhase = orderStatus === "OUT_FOR_DELIVERY";

    const prevDriverRef = useRef<LatLng | null>(null);
    const [bearing, setBearing] = useState(0);

    useEffect(() => {
        if (!animDriver) return;
        if (prevDriverRef.current) {
            const dist = Math.hypot(
                animDriver.latitude - prevDriverRef.current.latitude,
                animDriver.longitude - prevDriverRef.current.longitude,
            );
            if (dist > 0.00005) setBearing(calcBearing(prevDriverRef.current, animDriver));
        }
        prevDriverRef.current = animDriver;
    }, [animDriver?.latitude, animDriver?.longitude]);

    // Reset cinematic stages on status/order change
    useEffect(() => {
        approachStageRef.current = 0;
        hasIntroFiredRef.current = false;
        focusedStatusKeyRef.current = null;
    }, [orderStatus]);

    // Status-aware camera: centers on business for PENDING/PREPARING, fits all for delivery
    const fitMapToMarkers = useCallback(() => {
        if (!mapRef.current) return;

        if (isDeliveryPhase) {
            const coords: LatLng[] = [];
            if (animDriver) coords.push(animDriver);
            if (pickup) coords.push(pickup);
            if (dropoff) coords.push(dropoff);

            if (coords.length < 2) {
                const c = coords[0] || dropoff;
                if (c) mapRef.current.flyTo({ center: [c.longitude, c.latitude], zoom: 15.5, duration: 800 });
                return;
            }
            const lngs = coords.map(c => c.longitude);
            const lats = coords.map(c => c.latitude);
            mapRef.current.fitBounds(
                [[Math.min(...lngs) - 0.003, Math.min(...lats) - 0.003],
                 [Math.max(...lngs) + 0.003, Math.max(...lats) + 0.003]],
                { padding: { top: 100, bottom: 280, left: 60, right: 60 }, duration: 800 }
            );
        } else {
            // PENDING / PREPARING / READY: cinematic fly to business
            const loc = pickup;
            if (loc) {
                if (!hasIntroFiredRef.current) {
                    hasIntroFiredRef.current = true;
                    mapRef.current.flyTo({
                        center: [loc.longitude, loc.latitude],
                        zoom: 15.5,
                        duration: 1400,
                        pitch: 0,
                    });
                } else {
                    mapRef.current.flyTo({
                        center: [loc.longitude, loc.latitude],
                        zoom: 15.5,
                        duration: 800,
                    });
                }
            }
        }
    }, [pickup, dropoff, animDriver, isDeliveryPhase]);

    // Focus once per status change
    useEffect(() => {
        if (!pickup && !dropoff) return;
        const focusKey = `${orderStatus}`;
        if (focusedStatusKeyRef.current === focusKey) return;

        const timeout = setTimeout(() => {
            fitMapToMarkers();
            focusedStatusKeyRef.current = focusKey;
        }, 200);
        return () => clearTimeout(timeout);
    }, [orderStatus, pickup, dropoff, fitMapToMarkers]);

    // Cinematic approach: progressive zoom-in as driver nears dropoff
    useEffect(() => {
        if (!isDeliveryPhase || !animDriver || !dropoff || !mapRef.current) return;

        const now = Date.now();
        if (now - lastApproachCheckRef.current < 2000) return;
        lastApproachCheckRef.current = now;

        const distM = haversineDistanceM(animDriver, dropoff);

        if (distM <= CAMERA_APPROACH_ARRIVAL_M && approachStageRef.current < 3) {
            approachStageRef.current = 3;
            mapRef.current.flyTo({
                center: [dropoff.longitude, dropoff.latitude],
                zoom: 17,
                pitch: 45,
                duration: 1200,
            });
        } else if (distM <= CAMERA_APPROACH_CLOSE_M && approachStageRef.current < 2) {
            approachStageRef.current = 2;
            const midLng = (animDriver.longitude + dropoff.longitude) / 2;
            const midLat = (animDriver.latitude + dropoff.latitude) / 2;
            mapRef.current.flyTo({
                center: [midLng, midLat],
                zoom: 16.5,
                pitch: 25,
                duration: 1000,
            });
        } else if (distM <= CAMERA_APPROACH_NEAR_M && approachStageRef.current < 1) {
            approachStageRef.current = 1;
            const lngs = [animDriver.longitude, dropoff.longitude];
            const lats = [animDriver.latitude, dropoff.latitude];
            mapRef.current.fitBounds(
                [[Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002],
                 [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002]],
                { padding: { top: 100, bottom: 280, left: 60, right: 60 }, duration: 1000 }
            );
        }
    }, [animDriver?.latitude, animDriver?.longitude, isDeliveryPhase, dropoff]);

    if (!dropoff) return null;

    return (
        <div className={`w-full h-full ${className ?? ""}`}>
            <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle={MAP_STYLE}
                initialViewState={{
                    longitude: pickup?.longitude ?? dropoff.longitude,
                    latitude: pickup?.latitude ?? dropoff.latitude,
                    zoom: 14,
                }}
                maxBounds={GJILAN_BOUNDS}
                style={{ width: "100%", height: "100%" }}
                interactive={interactive}
                attributionControl={false}
            >
                {/* Business / Pickup marker with pulse */}
                {pickup && typeof pickup.latitude === "number" && typeof pickup.longitude === "number" && (
                    <Marker latitude={pickup.latitude} longitude={pickup.longitude} anchor="center" style={{ zIndex: 2 }}>
                        <div style={{ width: 72, height: 72 }} className="relative flex items-center justify-center">
                            {/* Pulse ring — active when preparing */}
                            {!isDeliveryPhase && (
                                <div className="absolute inset-0 rounded-full bg-violet-600/30 animate-ping [animation-duration:2.6s]" />
                            )}
                            <div className="w-9 h-9 rounded-full border-[2.5px] border-violet-500 bg-[#1a1a2e] flex items-center justify-center shadow-lg shadow-violet-500/40 overflow-hidden">
                                {businessImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={businessImageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Store size={15} className="text-violet-300" />
                                )}
                            </div>
                        </div>
                    </Marker>
                )}

                {/* Dropoff / Home marker */}
                {typeof dropoff.latitude === "number" && typeof dropoff.longitude === "number" && (
                <Marker latitude={dropoff.latitude} longitude={dropoff.longitude} anchor="bottom" style={{ zIndex: 2 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div className="w-9 h-9 rounded-full bg-[#111111] border-[2.5px] border-white flex items-center justify-center shadow-2xl shadow-black/70">
                            <Home size={16} className="text-white" />
                        </div>
                        <div className="w-[10px] h-[10px] bg-[#111111] -mt-[5px] rotate-45 rounded-br-[3px]" />
                        <div className="w-[18px] h-[6px] rounded-full bg-black/15 mt-[1px]" />
                    </div>
                </Marker>
                )}

                {/* Driver marker */}
                {animDriver && (
                    <Marker
                        latitude={animDriver.latitude}
                        longitude={animDriver.longitude}
                        anchor="center"
                        pitchAlignment="viewport"
                        rotationAlignment="viewport"
                    >
                        <div className="relative flex items-center justify-center">
                            {/* Live pulse ring */}
                            <div className="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping [animation-duration:2s]" />
                            {/* Direction arrow */}
                            <div
                                className="absolute -top-1.5 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white/90"
                                style={{ left: "50%", transform: `translateX(-50%) rotate(${bearing}deg)` }}
                            />
                            {/* Avatar circle */}
                            <div className="relative w-8 h-8 rounded-full bg-violet-600 border-2 border-white flex items-center justify-center shadow-lg shadow-violet-500/40 overflow-hidden font-bold text-white text-[11px]">
                                {driver?.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={driver.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(driver?.firstName, driver?.lastName)
                                )}
                            </div>
                            {/* Live green dot */}
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f172a]" />
                        </div>
                    </Marker>
                )}
            </Map>
        </div>
    );
}
