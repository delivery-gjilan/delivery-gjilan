"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Crosshair, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "@/localization";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const GJILAN_CENTER = { latitude: 42.4629, longitude: 21.4694 };

interface AddressPickerMapProps {
    onSelect: (location: { latitude: number; longitude: number; address: string; label?: string }) => void;
    initialLocation?: { latitude: number; longitude: number } | null;
}

export default function AddressPickerMap({ onSelect, initialLocation }: AddressPickerMapProps) {
    const { t } = useTranslations();
    const mapRef = useRef<MapRef>(null);
    const [pin, setPin] = useState<{ latitude: number; longitude: number }>(
        initialLocation ?? GJILAN_CENTER
    );
    const [address, setAddress] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [reversingGeocode, setReversingGeocode] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // Reverse geocode when pin moves
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setReversingGeocode(true);
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi,place&language=en,sq`
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            const name = data.features?.[0]?.place_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setAddress(name);
        } catch {
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } finally {
            setReversingGeocode(false);
        }
    }, []);

    // Initial reverse geocode
    useEffect(() => {
        reverseGeocode(pin.latitude, pin.longitude);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle map click to move pin
    const handleMapClick = useCallback(
        (e: any) => {
            const { lng, lat } = e.lngLat;
            setPin({ latitude: lat, longitude: lng });
            reverseGeocode(lat, lng);
        },
        [reverseGeocode]
    );

    // Search places
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim() || searchQuery.length < 2) return;
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setSearching(true);
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
                    `access_token=${MAPBOX_TOKEN}&proximity=${GJILAN_CENTER.longitude},${GJILAN_CENTER.latitude}` +
                    `&bbox=20.9,42.3,21.7,42.7&limit=5&types=address,poi,place,locality,neighborhood&language=en,sq`,
                { signal: abortRef.current.signal }
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            setSearchResults(data.features ?? []);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    // Select a search result
    const handleSelectResult = useCallback(
        (feature: any) => {
            const [lng, lat] = feature.center;
            setPin({ latitude: lat, longitude: lng });
            setAddress(feature.place_name);
            setSearchQuery("");
            setSearchResults([]);
            mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 600 });
        },
        []
    );

    // Use browser geolocation
    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setPin({ latitude, longitude });
                reverseGeocode(latitude, longitude);
                mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: 600 });
            },
            () => {
                // ignore error
            }
        );
    }, [reverseGeocode]);

    // Confirm selection
    const handleConfirm = useCallback(() => {
        onSelect({ latitude: pin.latitude, longitude: pin.longitude, address });
    }, [onSelect, pin, address]);

    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder={t("address.search_placeholder")}
                            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>
                    <Button size="sm" onClick={handleSearch} disabled={searching}>
                        {searching ? <Loader2 size={14} className="animate-spin" /> : t("common.search")}
                    </Button>
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((f: any) => (
                            <button
                                key={f.id}
                                onClick={() => handleSelectResult(f)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--background-secondary)] transition-colors border-b border-[var(--border)] last:border-b-0"
                            >
                                <MapPin size={12} className="shrink-0 text-[var(--primary)]" />
                                <span className="truncate">{f.place_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="relative h-64 sm:h-80 rounded-[var(--radius)] overflow-hidden border border-[var(--border)]">
                <Map
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle={MAP_STYLE}
                    initialViewState={{
                        longitude: pin.longitude,
                        latitude: pin.latitude,
                        zoom: 14,
                    }}
                    onClick={handleMapClick}
                    style={{ width: "100%", height: "100%" }}
                >
                    <NavigationControl position="top-right" />
                    <Marker longitude={pin.longitude} latitude={pin.latitude} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <div className="h-6 w-6 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg">
                                <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                            <div className="h-2.5 w-0.5 bg-[var(--primary)]" />
                        </div>
                    </Marker>
                </Map>

                {/* Locate me button */}
                <button
                    onClick={handleLocateMe}
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                    title={t("address.use_my_location")}
                >
                    <Crosshair size={16} className="text-gray-700" />
                </button>
            </div>

            {/* Selected Address */}
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                <div className="flex items-start gap-2">
                    <MapPin size={14} className="shrink-0 text-[var(--primary)] mt-0.5" />
                    <p className="text-sm text-[var(--foreground)]">
                        {reversingGeocode ? (
                            <span className="text-[var(--muted)]">{t("address.resolving")}</span>
                        ) : (
                            address || t("address.tap_to_select")
                        )}
                    </p>
                </div>
            </div>

            {/* Confirm */}
            <Button size="lg" className="w-full" onClick={handleConfirm} disabled={!address || reversingGeocode}>
                {t("address.confirm_location")}
            </Button>
        </div>
    );
}
