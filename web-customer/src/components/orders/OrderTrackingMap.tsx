"use client";

import { useEffect, useRef } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

interface OrderTrackingMapProps {
    dropoff: { latitude: number; longitude: number } | null;
    driverLocation: { latitude: number; longitude: number } | null;
}

export default function OrderTrackingMap({ dropoff, driverLocation }: OrderTrackingMapProps) {
    const mapRef = useRef<MapRef>(null);

    // Fit to show both markers
    useEffect(() => {
        if (!mapRef.current || !dropoff) return;
        if (driverLocation) {
            const bounds: [[number, number], [number, number]] = [
                [
                    Math.min(dropoff.longitude, driverLocation.longitude) - 0.005,
                    Math.min(dropoff.latitude, driverLocation.latitude) - 0.005,
                ],
                [
                    Math.max(dropoff.longitude, driverLocation.longitude) + 0.005,
                    Math.max(dropoff.latitude, driverLocation.latitude) + 0.005,
                ],
            ];
            mapRef.current.fitBounds(bounds, { padding: 60, duration: 600 });
        }
    }, [dropoff, driverLocation]);

    if (!dropoff) return null;

    return (
        <div className="h-56 sm:h-72 w-full">
            <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle={MAP_STYLE}
                initialViewState={{
                    longitude: dropoff.longitude,
                    latitude: dropoff.latitude,
                    zoom: 14,
                }}
                style={{ width: "100%", height: "100%" }}
                interactive={false}
            >
                {/* Driver Route Line */}
                {driverLocation && (
                    <Source
                        id="route"
                        type="geojson"
                        data={{
                            type: "Feature",
                            geometry: {
                                type: "LineString",
                                coordinates: [
                                    [driverLocation.longitude, driverLocation.latitude],
                                    [dropoff.longitude, dropoff.latitude],
                                ],
                            },
                            properties: {},
                        }}
                    >
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                "line-color": "#009de0",
                                "line-width": 3,
                                "line-dasharray": [2, 2],
                            }}
                        />
                    </Source>
                )}

                {/* Driver Marker */}
                {driverLocation && (
                    <Marker longitude={driverLocation.longitude} latitude={driverLocation.latitude} anchor="center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#009de0] shadow-lg">
                            <Navigation size={14} className="text-white" />
                        </div>
                    </Marker>
                )}

                {/* Dropoff Marker */}
                <Marker longitude={dropoff.longitude} latitude={dropoff.latitude} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                            <MapPin size={14} className="text-white" />
                        </div>
                        <div className="h-2.5 w-0.5 bg-red-500" />
                    </div>
                </Marker>
            </Map>
        </div>
    );
}
